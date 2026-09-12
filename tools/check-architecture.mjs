#!/usr/bin/env node
/**
 * ARCHITECTURE CHECK
 * =============================================================================
 * Fails the build when the Three-Gen boundaries or the coding standards are
 * broken. It is the part of this repository that keeps its promises after the
 * people and the sessions that made them are gone.
 *
 * Run with:  npm run check:architecture
 *
 * The rules are deliberately mechanical. A rule that needs judgement is a rule
 * that will be argued with; a rule that prints a file and a line number is a
 * rule that gets fixed.
 *
 * If you are an agent and a rule here is in your way: fix the code. Do not
 * weaken the rule. If a rule is genuinely wrong, change it in one commit on its
 * own, record why in docs/DECISIONS.md, and say so in docs/HANDOFF.md.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";

const toolsDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(toolsDirectory, "..");

const failures = [];
const notes = [];

/**
 * Records a failure.
 * @param {string} rule
 * @param {string} file
 * @param {number} line
 * @param {string} message
 */
function fail(rule, file, line, message)
{
    failures.push({ rule: rule, file: file, line: line, message: message });
}

/**
 * Lists every file under a directory that matches an extension.
 * @param {string} directory
 * @param {string[]} extensions
 * @returns {string[]} Absolute paths.
 */
function listFiles(directory, extensions)
{
    const found = [];

    if (existsSync(directory) === false)
    {
        return found;
    }

    const entries = readdirSync(directory);

    for (let index = 0; index < entries.length; index = index + 1)
    {
        const entry = entries[index];

        if (entry === "node_modules" || entry.startsWith(".") === true)
        {
            continue;
        }

        const path = join(directory, entry);
        const info = statSync(path);

        if (info.isDirectory() === true)
        {
            const nested = listFiles(path, extensions);

            for (let position = 0; position < nested.length; position = position + 1)
            {
                found.push(nested[position]);
            }

            continue;
        }

        for (let position = 0; position < extensions.length; position = position + 1)
        {
            if (entry.endsWith(extensions[position]) === true)
            {
                found.push(path);
                break;
            }
        }
    }

    return found;
}

/**
 * @param {string} path
 * @returns {string} Repository-relative path with forward slashes.
 */
function relativePath(path)
{
    return relative(root, path).split(sep).join("/");
}

/**
 * Reads a source file into lines.
 * @param {string} path
 * @returns {{text: string, lines: string[]}}
 */
function readSource(path)
{
    const text = readFileSync(path, "utf8");
    return { text: text, lines: text.split(/\r?\n/) };
}

/**
 * Which generation a source path belongs to.
 * @param {string} path
 * @returns {string} "gen1" | "gen2" | "gen2-support" | "gen3" | "app" | "other"
 */
function layerOf(path)
{
    const name = relativePath(path);

    if (name.startsWith("src/gen1/") === true)
    {
        return "gen1";
    }

    if (name.startsWith("src/gen2/support/") === true)
    {
        return "gen2-support";
    }

    if (name.startsWith("src/gen2/") === true)
    {
        return "gen2";
    }

    if (name.startsWith("src/gen3/") === true)
    {
        return "gen3";
    }

    if (name.startsWith("src/app/") === true)
    {
        return "app";
    }

    return "other";
}

const sourceFiles = listFiles(join(root, "src"), [".js"]);
const testFiles = listFiles(join(root, "tests"), [".js"]);
const toolFiles = listFiles(join(root, "tools"), [".mjs"]);
const htmlFiles = listFiles(root, [".html"]);
const cssFiles = listFiles(join(root, "assets", "css"), [".css"]);
const jsonFiles = listFiles(root, [".json"]);

// -----------------------------------------------------------------------------
// Rule 1: no generated markup in production JavaScript.
// -----------------------------------------------------------------------------

const MARKUP_PATTERNS =
[
    { pattern: /\.innerHTML\b/, message: "innerHTML is forbidden; build the DOM with createElement." },
    { pattern: /\.outerHTML\s*=/, message: "outerHTML assignment is forbidden." },
    { pattern: /insertAdjacentHTML\s*\(/, message: "insertAdjacentHTML is forbidden." },
    { pattern: /document\.write\s*\(/, message: "document.write is forbidden." },
    { pattern: /createContextualFragment\s*\(/, message: "createContextualFragment is forbidden." },
    { pattern: /new\s+DOMParser\s*\(/, message: "DOMParser is a string-to-DOM trick; build the DOM explicitly." }
];

/**
 * Finds template literals or quoted strings that contain element markup.
 * @param {string} line
 * @returns {boolean}
 */
function looksLikeMarkupString(line)
{
    if (line.trimStart().startsWith("*") === true || line.trimStart().startsWith("//") === true)
    {
        return false;
    }

    return /(["'`])[^"'`]*<\s*(div|span|p|a|ul|li|table|tr|td|th|section|article|button|input|form|svg|img|h[1-6])\b[^"'`]*\1/i.test(line);
}

for (let index = 0; index < sourceFiles.length; index = index + 1)
{
    const path = sourceFiles[index];
    const source = readSource(path);

    for (let line = 0; line < source.lines.length; line = line + 1)
    {
        const text = source.lines[line];

        for (let position = 0; position < MARKUP_PATTERNS.length; position = position + 1)
        {
            const rule = MARKUP_PATTERNS[position];

            if (rule.pattern.test(text) === true)
            {
                fail("no-generated-markup", relativePath(path), line + 1, rule.message);
            }
        }

        if (looksLikeMarkupString(text) === true)
        {
            fail("no-generated-markup", relativePath(path), line + 1, "String appears to contain HTML markup.");
        }
    }
}

// -----------------------------------------------------------------------------
// Rule 2: dependency direction.
// -----------------------------------------------------------------------------

const ALLOWED_IMPORTS =
{
    gen1: ["gen1"],
    "gen2-support": ["gen2-support"],
    gen2: ["gen1", "gen2-support"],
    gen3: ["gen1", "gen2", "gen2-support", "gen3"],
    app: ["gen1", "gen2", "gen2-support", "gen3", "app"],
    other: ["gen1", "gen2", "gen2-support", "gen3", "app", "other"]
};

const IMPORT_PATTERN = /(?:^|\n)\s*(?:import|export)[^;\n]*?from\s+["']([^"']+)["']/g;

/**
 * Every relative import specifier in a file, with its line number.
 * @param {string} text
 * @returns {Array<{specifier: string, line: number}>}
 */
function importsOf(text)
{
    const found = [];
    IMPORT_PATTERN.lastIndex = 0;
    let match = IMPORT_PATTERN.exec(text);

    while (match !== null)
    {
        const before = text.slice(0, match.index);
        found.push({ specifier: match[1], line: before.split("\n").length });
        match = IMPORT_PATTERN.exec(text);
    }

    return found;
}

for (let index = 0; index < sourceFiles.length; index = index + 1)
{
    const path = sourceFiles[index];
    const name = relativePath(path);
    const source = readSource(path);
    const layer = layerOf(path);
    const isBarrel = basename(path) === "index.js";
    const specifiers = importsOf(source.text);

    for (let position = 0; position < specifiers.length; position = position + 1)
    {
        const entry = specifiers[position];

        if (entry.specifier.startsWith(".") === false)
        {
            fail("dependency-direction", name, entry.line, "Bare module specifier '" + entry.specifier + "'; this project has no runtime dependencies.");
            continue;
        }

        const target = resolve(dirname(path), entry.specifier);

        if (existsSync(target) === false)
        {
            fail("unresolved-import", name, entry.line, "Import does not resolve: " + entry.specifier);
            continue;
        }

        const targetLayer = layerOf(target);
        const permitted = ALLOWED_IMPORTS[layer];

        if (layer === "gen2" && targetLayer === "gen2" && isBarrel === false)
        {
            fail("dependency-direction", name, entry.line, "A Gen-2 control may not import another Gen-2 control. Controls compose in a page, not inside each other.");
            continue;
        }

        if (permitted.indexOf(targetLayer) < 0 && (layer !== "gen2" || isBarrel === false))
        {
            fail("dependency-direction", name, entry.line, layer + " may not import " + targetLayer + " (" + relativePath(target) + ").");
        }
    }
}

// -----------------------------------------------------------------------------
// Rule 3: the control gallery must not depend on the application.
// -----------------------------------------------------------------------------

const galleryScript = join(root, "src", "app", "controls-page.js");

if (existsSync(galleryScript) === true)
{
    const source = readSource(galleryScript);
    const specifiers = importsOf(source.text);

    for (let index = 0; index < specifiers.length; index = index + 1)
    {
        const entry = specifiers[index];
        const target = resolve(dirname(galleryScript), entry.specifier);

        if (layerOf(target) === "gen3")
        {
            fail("gallery-independence", relativePath(galleryScript), entry.line, "The gallery proves Gen 2 stands alone; it may not import Gen 3.");
        }
    }
}

// -----------------------------------------------------------------------------
// Rule 4: named event handlers.
// -----------------------------------------------------------------------------

const LISTENER_PATTERN = /(?:addEventListener|addManagedListener)\s*\(([^)]*)$|(?:addEventListener|addManagedListener)\s*\(([^;]*?)\)\s*;/;

for (let index = 0; index < sourceFiles.length; index = index + 1)
{
    const path = sourceFiles[index];
    const source = readSource(path);

    for (let line = 0; line < source.lines.length; line = line + 1)
    {
        const text = source.lines[line];

        if (/(?:addEventListener|addManagedListener)\s*\(/.test(text) === false)
        {
            continue;
        }

        if (/=>/.test(text) === true || /function\s*\(/.test(text) === true)
        {
            fail("named-handlers", relativePath(path), line + 1, "Anonymous listener callback. Use a named method bound once in the constructor.");
        }
    }
}

// -----------------------------------------------------------------------------
// Rule 5: no application vocabulary below Gen 3.
// -----------------------------------------------------------------------------

const FORBIDDEN_TERMS =
[
    { pattern: /\bshapes?\b/i, term: "shape" },
    { pattern: /\bshapescript\b/i, term: "ShapeScript" },
    { pattern: /\bkyle\b/i, term: "Kyle" },
    { pattern: /\bmbs\b/i, term: "MBS" },
    { pattern: /\bbookshelf\b/i, term: "bookshelf" },
    { pattern: /\bboard\b/i, term: "board" },
    { pattern: /project space/i, term: "project space" }
];

const genericSources = [];

for (let index = 0; index < sourceFiles.length; index = index + 1)
{
    const layer = layerOf(sourceFiles[index]);

    if (layer === "gen1" || layer === "gen2" || layer === "gen2-support")
    {
        genericSources.push(sourceFiles[index]);
    }
}

genericSources.push(join(root, "assets", "css", "controls.css"));

for (let index = 0; index < genericSources.length; index = index + 1)
{
    const path = genericSources[index];

    if (existsSync(path) === false)
    {
        continue;
    }

    const source = readSource(path);

    for (let line = 0; line < source.lines.length; line = line + 1)
    {
        const text = source.lines[line];

        for (let position = 0; position < FORBIDDEN_TERMS.length; position = position + 1)
        {
            const rule = FORBIDDEN_TERMS[position];

            if (rule.pattern.test(text) === true)
            {
                fail("generic-vocabulary", relativePath(path), line + 1, "Application vocabulary '" + rule.term + "' in generic code.");
            }
        }
    }
}

// -----------------------------------------------------------------------------
// Rule 6: class names, tag names and inheritance.
// -----------------------------------------------------------------------------

const CLASS_PATTERN = /export\s+class\s+([A-Za-z0-9_]+)\s+extends\s+([A-Za-z0-9_]+)/;
const TAG_PATTERN = /static\s+elementName\s*=\s*["']([^"']+)["']/;

const gen2Classes = [];
const gen3Classes = [];

for (let index = 0; index < sourceFiles.length; index = index + 1)
{
    const path = sourceFiles[index];
    const layer = layerOf(path);
    const fileName = basename(path, ".js");

    if (fileName === "index.js" || fileName === "index")
    {
        continue;
    }

    if (layer !== "gen1" && layer !== "gen2" && layer !== "gen3")
    {
        continue;
    }

    const source = readSource(path);
    const classMatch = source.text.match(CLASS_PATTERN);

    if (layer === "gen2-support")
    {
        continue;
    }

    if (classMatch === null)
    {
        if (relativePath(path).indexOf("/data/") < 0)
        {
            fail("class-shape", relativePath(path), 1, "No exported class that extends something. Every Gen-1, Gen-2 and Gen-3 element file declares exactly one.");
        }

        continue;
    }

    const className = classMatch[1];
    const baseName = classMatch[2];

    if (className !== fileName)
    {
        fail("class-shape", relativePath(path), 1, "Class " + className + " should be in " + className + ".js, not " + fileName + ".js.");
    }

    const tagMatch = source.text.match(TAG_PATTERN);

    if (layer === "gen2")
    {
        gen2Classes.push(className);

        if (baseName !== "AbstractElement")
        {
            fail("generation-shape", relativePath(path), 1, "A Gen-2 control must extend AbstractElement directly; " + className + " extends " + baseName + ".");
        }

        if (tagMatch === null || tagMatch[1].startsWith("tg-") === false)
        {
            fail("generation-shape", relativePath(path), 1, "A Gen-2 control needs a static elementName beginning with 'tg-'.");
        }

        if (source.text.indexOf("abstractAction(") < 0)
        {
            fail("abstract-action", relativePath(path), 1, "A Gen-2 control must implement abstractAction().");
        }
    }

    if (layer === "gen3")
    {
        gen3Classes.push({ name: className, base: baseName, file: relativePath(path) });

        if (className.startsWith("Shape") === false)
        {
            fail("generation-shape", relativePath(path), 1, "Application classes are named with the project prefix; " + className + " is not.");
        }

        if (className !== "ShapeSpaceState")
        {
            if (tagMatch === null || tagMatch[1].startsWith("shape-") === false)
            {
                fail("generation-shape", relativePath(path), 1, "A Gen-3 element needs a static elementName beginning with 'shape-'.");
            }
        }
    }

    if (layer === "gen1" && className !== "AbstractElement")
    {
        fail("generation-shape", relativePath(path), 1, "Gen 1 holds one class, AbstractElement. Found " + className + ".");
    }
}

for (let index = 0; index < gen3Classes.length; index = index + 1)
{
    const entry = gen3Classes[index];

    if (entry.name === "ShapeSpaceState")
    {
        continue;
    }

    if (gen2Classes.indexOf(entry.base) < 0)
    {
        fail("generation-shape", entry.file, 1, entry.name + " extends " + entry.base + ", which is not a Gen-2 control. Gen 3 specialises Gen 2, it does not bypass it.");
    }
}

// -----------------------------------------------------------------------------
// Rule 7: the barrels list everything.
// -----------------------------------------------------------------------------

/**
 * @param {string} barrelPath
 * @param {string[]} expectedNames
 * @param {string} listName
 */
function checkBarrel(barrelPath, expectedNames, listName)
{
    if (existsSync(barrelPath) === false)
    {
        fail("barrel", relativePath(barrelPath), 1, "Missing barrel file.");
        return;
    }

    const text = readFileSync(barrelPath, "utf8");
    const listMatch = text.match(new RegExp(listName + "\\s*=\\s*\\[([^\\]]*)\\]"));

    if (listMatch === null)
    {
        fail("barrel", relativePath(barrelPath), 1, "Missing the " + listName + " list.");
        return;
    }

    const listed = listMatch[1];

    for (let index = 0; index < expectedNames.length; index = index + 1)
    {
        const name = expectedNames[index];

        if (new RegExp("\\b" + name + "\\b").test(listed) === false)
        {
            fail("barrel", relativePath(barrelPath), 1, name + " exists in the source tree but is missing from " + listName + ".");
        }
    }
}

const gen3ElementNames = [];

for (let index = 0; index < gen3Classes.length; index = index + 1)
{
    if (gen3Classes[index].name !== "ShapeSpaceState")
    {
        gen3ElementNames.push(gen3Classes[index].name);
    }
}

checkBarrel(join(root, "src", "gen2", "index.js"), gen2Classes, "GEN2_CONTROLS");
checkBarrel(join(root, "src", "gen3", "index.js"), gen3ElementNames, "GEN3_ELEMENTS");

// -----------------------------------------------------------------------------
// Rule 8: no hidden global state, no stray logging.
// -----------------------------------------------------------------------------

for (let index = 0; index < sourceFiles.length; index = index + 1)
{
    const path = sourceFiles[index];
    const source = readSource(path);

    for (let line = 0; line < source.lines.length; line = line + 1)
    {
        const text = source.lines[line];

        if (/^\s*(?:window|globalThis|self)\s*\.\s*[A-Za-z_$][\w$]*\s*=/.test(text) === true)
        {
            fail("no-global-state", relativePath(path), line + 1, "Assignment to a global. Shared state is constructed explicitly and handed to whoever needs it.");
        }

        if (/\bconsole\s*\.\s*(log|debug|info)\s*\(/.test(text) === true)
        {
            fail("no-stray-logging", relativePath(path), line + 1, "Leftover console logging in production source.");
        }

        if (/^\s*var\s+/.test(text) === true)
        {
            fail("modern-bindings", relativePath(path), line + 1, "Use const or let, not var.");
        }
    }
}

// -----------------------------------------------------------------------------
// Rule 9: documentation block on every element class.
// -----------------------------------------------------------------------------

for (let index = 0; index < sourceFiles.length; index = index + 1)
{
    const path = sourceFiles[index];
    const layer = layerOf(path);

    if (layer !== "gen2" && layer !== "gen3")
    {
        continue;
    }

    if (basename(path) === "index.js" || relativePath(path).indexOf("/data/") >= 0)
    {
        continue;
    }

    const source = readSource(path);

    if (layer === "gen3" && source.text.match(TAG_PATTERN) === null)
    {
        continue;
    }

    if (source.text.indexOf("Lineage:") < 0)
    {
        fail("documented-api", relativePath(path), 1, "The class comment must state its lineage, for example 'Lineage: HTMLElement -> AbstractElement -> TreeView'.");
    }

    if (layer === "gen2" && source.text.indexOf("Abstract action") < 0)
    {
        fail("documented-api", relativePath(path), 1, "The class comment must document what its abstract action means.");
    }
}

// -----------------------------------------------------------------------------
// Rule 10: JSON files parse.
// -----------------------------------------------------------------------------

for (let index = 0; index < jsonFiles.length; index = index + 1)
{
    const path = jsonFiles[index];

    try
    {
        JSON.parse(readFileSync(path, "utf8"));
    }
    catch (error)
    {
        fail("valid-json", relativePath(path), 1, "Invalid JSON: " + error.message);
    }
}

// -----------------------------------------------------------------------------
// Rule 11: pages load the scripts and stylesheets they claim to.
// -----------------------------------------------------------------------------

for (let index = 0; index < htmlFiles.length; index = index + 1)
{
    const path = htmlFiles[index];
    const source = readSource(path);
    const references = source.text.match(/(?:src|href)="([^"]+)"/g);

    if (references === null)
    {
        continue;
    }

    for (let position = 0; position < references.length; position = position + 1)
    {
        const value = references[position].replace(/^(?:src|href)="/, "").replace(/"$/, "");

        if (value.startsWith("http") === true || value.startsWith("#") === true || value.startsWith("mailto:") === true)
        {
            continue;
        }

        const target = resolve(dirname(path), value.split("#")[0]);

        if (existsSync(target) === false)
        {
            fail("page-references", relativePath(path), 1, "Page references a file that does not exist: " + value);
        }
    }
}

// -----------------------------------------------------------------------------
// Rule 12: the stylesheets are layered like the source.
// -----------------------------------------------------------------------------

for (let index = 0; index < cssFiles.length; index = index + 1)
{
    const path = cssFiles[index];

    if (basename(path) !== "controls.css")
    {
        continue;
    }

    const source = readSource(path);

    for (let line = 0; line < source.lines.length; line = line + 1)
    {
        if (/\.shape-/.test(source.lines[line]) === true)
        {
            fail("stylesheet-layering", relativePath(path), line + 1, "Application selectors belong in site.css.");
        }
    }
}

// -----------------------------------------------------------------------------
// Report
// -----------------------------------------------------------------------------

notes.push("source files checked: " + sourceFiles.length);
notes.push("test files: " + testFiles.length);
notes.push("tool files: " + toolFiles.length);
notes.push("pages: " + htmlFiles.length);
notes.push("Gen-2 controls found: " + gen2Classes.length);
notes.push("Gen-3 elements found: " + gen3ElementNames.length);

process.stdout.write("Architecture check\n");
process.stdout.write("==================\n");

for (let index = 0; index < notes.length; index = index + 1)
{
    process.stdout.write("  " + notes[index] + "\n");
}

if (failures.length === 0)
{
    process.stdout.write("\n  PASS  no architecture violations\n");
    process.exit(0);
}

process.stdout.write("\n  FAIL  " + failures.length + " violation(s)\n\n");

for (let index = 0; index < failures.length; index = index + 1)
{
    const entry = failures[index];
    process.stdout.write("  [" + entry.rule + "] " + entry.file + ":" + entry.line + "\n      " + entry.message + "\n");
}

process.exit(1);
