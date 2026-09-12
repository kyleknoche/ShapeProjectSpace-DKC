#!/usr/bin/env node
/**
 * DOCUMENTATION CHECK
 * =============================================================================
 * Fails the build when the documentation and the source tree disagree.
 *
 * Run with:  npm run check:docs
 *
 * Documentation rot is the quietest failure in this repository's failure model:
 * nothing breaks, the page still loads, and the description of the architecture
 * slowly stops being true. A description that is verified is worth more than a
 * description that is merely well written, so these rules compare the prose
 * against the actual class inventory.
 *
 * What is checked
 *   - every required document exists;
 *   - every Gen-2 control has a section in docs/CONTROLS.md naming its tag;
 *   - every class in src appears in docs/ARCHITECTURE.md;
 *   - the project's own artifact inventory matches the source tree exactly;
 *   - the orientation documents say the things a fresh session must be told.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, basename, sep, relative } from "node:path";
import { fileURLToPath } from "node:url";

const toolsDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(toolsDirectory, "..");

const failures = [];

/**
 * @param {string} rule
 * @param {string} file
 * @param {string} message
 */
function fail(rule, file, message)
{
    failures.push({ rule: rule, file: file, message: message });
}

/**
 * @param {string} path
 * @returns {string}
 */
function read(path)
{
    return readFileSync(path, "utf8");
}

/**
 * @param {string} path
 * @returns {string}
 */
function relativePath(path)
{
    return relative(root, path).split(sep).join("/");
}

/**
 * Class names declared in a generation directory, excluding barrels and data.
 * @param {string} directory
 * @returns {Array<{name: string, file: string}>}
 */
function classesIn(directory)
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
        const path = join(directory, entry);

        if (statSync(path).isDirectory() === true)
        {
            continue;
        }

        if (entry.endsWith(".js") === false || entry === "index.js")
        {
            continue;
        }

        const text = read(path);
        const match = text.match(/export\s+class\s+([A-Za-z0-9_]+)\s+extends/);

        if (match === null)
        {
            continue;
        }

        found.push({ name: match[1], file: relativePath(path), text: text });
    }

    return found;
}

const gen1Classes = classesIn(join(root, "src", "gen1"));
const gen2Classes = classesIn(join(root, "src", "gen2"));
const gen3Classes = classesIn(join(root, "src", "gen3"));

// -----------------------------------------------------------------------------
// Rule 1: required documents.
// -----------------------------------------------------------------------------

const REQUIRED_DOCUMENTS =
[
    "README.md",
    "AGENTS.md",
    "CODING-STANDARDS.md",
    "docs/THREE-GEN.md",
    "docs/ARCHITECTURE.md",
    "docs/CONTROLS.md",
    "docs/DEPLOY.md",
    "docs/ROADMAP.md",
    "docs/DECISIONS.md",
    "docs/HANDOFF.md",
    "docs/AI-COLLABORATION.md",
    "docs/ARCHITECTURE-REVIEW.md"
];

for (let index = 0; index < REQUIRED_DOCUMENTS.length; index = index + 1)
{
    const name = REQUIRED_DOCUMENTS[index];

    if (existsSync(join(root, name)) === false)
    {
        fail("required-documents", name, "Required document is missing.");
    }
}

/**
 * @param {string} name
 * @returns {string} Empty string when the document is missing.
 */
function readDocument(name)
{
    const path = join(root, name);
    return existsSync(path) === true ? read(path) : "";
}

// -----------------------------------------------------------------------------
// Rule 2: every control is documented, with its tag name.
// -----------------------------------------------------------------------------

/**
 * True when a document contains a level-two heading that is exactly this name.
 *
 * The comparison is anchored on purpose. A plain substring search would accept
 * "## TreeListViewRenamed" as a section for TreeListView, which is precisely the
 * kind of near-miss that lets documentation drift while the check stays green.
 *
 * @param {string} document
 * @param {string} name
 * @returns {boolean}
 */
function hasSection(document, name)
{
    const lines = document.split(/\r?\n/);

    for (let index = 0; index < lines.length; index = index + 1)
    {
        if (lines[index].trim() === "## " + name)
        {
            return true;
        }
    }

    return false;
}

const controlsDocument = readDocument("docs/CONTROLS.md");

for (let index = 0; index < gen2Classes.length; index = index + 1)
{
    const controlClass = gen2Classes[index];
    const tagMatch = controlClass.text.match(/static\s+elementName\s*=\s*["']([^"']+)["']/);
    const tagName = tagMatch === null ? "" : tagMatch[1];

    if (hasSection(controlsDocument, controlClass.name) === false)
    {
        fail("controls-documented", "docs/CONTROLS.md", "No section for " + controlClass.name + ". Every Gen-2 control needs one.");
        continue;
    }

    if (tagName !== "" && controlsDocument.indexOf(tagName) < 0)
    {
        fail("controls-documented", "docs/CONTROLS.md", controlClass.name + " is documented but its tag name " + tagName + " is not mentioned.");
    }

    const abstractActionMatch = controlClass.text.match(/\*\s+Abstract action\s*\n\s*\*\s+"([a-z-]+)"/);

    if (abstractActionMatch === null)
    {
        continue;
    }

    const verb = abstractActionMatch[1];
    const sectionStart = controlsDocument.indexOf("## " + controlClass.name);
    const nextSection = controlsDocument.indexOf("\n## ", sectionStart + 1);
    const section = controlsDocument.slice(sectionStart, nextSection < 0 ? controlsDocument.length : nextSection);

    if (section.indexOf(verb) < 0)
    {
        fail("controls-documented", "docs/CONTROLS.md", controlClass.name + " implements abstractAction '" + verb + "', which its section does not mention.");
    }
}

// -----------------------------------------------------------------------------
// Rule 3: every class appears in the architecture document.
// -----------------------------------------------------------------------------

const architectureDocument = readDocument("docs/ARCHITECTURE.md");
const allClasses = gen1Classes.concat(gen2Classes).concat(gen3Classes);

for (let index = 0; index < allClasses.length; index = index + 1)
{
    const name = allClasses[index].name;

    if (architectureDocument.indexOf(name) < 0)
    {
        fail("architecture-documented", "docs/ARCHITECTURE.md", name + " exists in src but is not listed.");
    }
}

// -----------------------------------------------------------------------------
// Rule 4: the project's artifact inventory matches the source tree.
// -----------------------------------------------------------------------------

const inventoryPath = join(root, "src", "gen3", "data", "projectSpace.js");

if (existsSync(inventoryPath) === true)
{
    const inventoryText = read(inventoryPath);
    const rowPattern = /\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*generation:\s*"([^"]+)"[^}]*file:\s*"([^"]+)"\s*\}/g;
    const inventory = new Map();

    let match = rowPattern.exec(inventoryText);

    while (match !== null)
    {
        inventory.set(match[2], { generation: match[3], file: match[4] });
        match = rowPattern.exec(inventoryText);
    }

    const expected = [];

    for (let index = 0; index < gen1Classes.length; index = index + 1)
    {
        expected.push({ name: gen1Classes[index].name, generation: "Gen 1", file: gen1Classes[index].file });
    }

    for (let index = 0; index < gen2Classes.length; index = index + 1)
    {
        expected.push({ name: gen2Classes[index].name, generation: "Gen 2", file: gen2Classes[index].file });
    }

    for (let index = 0; index < gen3Classes.length; index = index + 1)
    {
        if (gen3Classes[index].name === "ShapeSpaceState")
        {
            continue;
        }

        expected.push({ name: gen3Classes[index].name, generation: "Gen 3", file: gen3Classes[index].file });
    }

    for (let index = 0; index < expected.length; index = index + 1)
    {
        const entry = expected[index];
        const row = inventory.get(entry.name);

        if (row === undefined)
        {
            fail("inventory-accurate", "src/gen3/data/projectSpace.js", entry.name + " is in the source tree but missing from ARTIFACTS.");
            continue;
        }

        if (row.generation !== entry.generation)
        {
            fail("inventory-accurate", "src/gen3/data/projectSpace.js", entry.name + " is listed as " + row.generation + " but is " + entry.generation + ".");
        }

        if (row.file !== entry.file)
        {
            fail("inventory-accurate", "src/gen3/data/projectSpace.js", entry.name + " is listed at " + row.file + " but lives at " + entry.file + ".");
        }

        inventory.delete(entry.name);
    }

    inventory.forEach(function reportStaleRow(row, name)
    {
        fail("inventory-accurate", "src/gen3/data/projectSpace.js", name + " is listed in ARTIFACTS but no such class exists.");
    });
}

// -----------------------------------------------------------------------------
// Rule 5: the orientation documents say what a fresh session must know.
// -----------------------------------------------------------------------------

const REQUIRED_PHRASES =
[
    { document: "AGENTS.md", phrase: "npm run check", message: "must tell an agent how to validate its work" },
    { document: "AGENTS.md", phrase: "CODING-STANDARDS.md", message: "must point at the coding standards" },
    { document: "AGENTS.md", phrase: "docs/HANDOFF.md", message: "must point at the handoff state" },
    { document: "README.md", phrase: "npm run check", message: "must document the validation command" },
    { document: "README.md", phrase: "controls.html", message: "must mention the control gallery" },
    { document: "docs/THREE-GEN.md", phrase: "AbstractElement", message: "must name the Gen-1 class" },
    { document: "docs/THREE-GEN.md", phrase: "Gen 3", message: "must describe the third generation" },
    { document: "docs/DECISIONS.md", phrase: "abstractAction", message: "must record the action-seam decision" },
    { document: "docs/HANDOFF.md", phrase: "npm run check", message: "must tell the next session how to verify the state" },
    { document: "CODING-STANDARDS.md", phrase: "innerHTML", message: "must state the markup rule" },
    { document: "docs/DEPLOY.md", phrase: "index.html", message: "must describe what is deployed" }
];

for (let index = 0; index < REQUIRED_PHRASES.length; index = index + 1)
{
    const rule = REQUIRED_PHRASES[index];
    const text = readDocument(rule.document);

    if (text === "")
    {
        continue;
    }

    if (text.indexOf(rule.phrase) < 0)
    {
        fail("orientation", rule.document, rule.document + " " + rule.message + " (looking for '" + rule.phrase + "').");
    }
}

// -----------------------------------------------------------------------------
// Rule 6: documented counts match reality.
// -----------------------------------------------------------------------------

/**
 * Counts the declared tests across the suite, so a document that claims a number
 * can be checked against it.
 * @returns {number}
 */
function countTests()
{
    const directory = join(root, "tests");

    if (existsSync(directory) === false)
    {
        return 0;
    }

    const entries = readdirSync(directory);
    let total = 0;

    for (let index = 0; index < entries.length; index = index + 1)
    {
        const entry = entries[index];

        if (entry.endsWith(".test.js") === false)
        {
            continue;
        }

        const text = read(join(directory, entry));
        const matches = text.match(/^test\(/gm);
        total = total + (matches === null ? 0 : matches.length);
    }

    return total;
}

const testCount = countTests();

const countClaims =
[
    { document: "README.md", pattern: /(\d+)\s+generic controls/, actual: gen2Classes.length, what: "Gen-2 controls" },
    { document: "README.md", pattern: /(\d+)\s+application elements/, actual: gen3Classes.length - 1, what: "Gen-3 elements" },
    { document: "README.md", pattern: /(\d+)\s+tests/, actual: testCount, what: "tests" },
    { document: "AGENTS.md", pattern: /(\d+)\s+tests/, actual: testCount, what: "tests" },
    { document: "docs/CONTROLS.md", pattern: /(\d+)\s+controls/, actual: gen2Classes.length, what: "Gen-2 controls" }
];

for (let index = 0; index < countClaims.length; index = index + 1)
{
    const claim = countClaims[index];
    const text = readDocument(claim.document);
    const match = text.match(claim.pattern);

    if (match === null)
    {
        continue;
    }

    if (Number(match[1]) !== claim.actual)
    {
        fail("counts-accurate", claim.document, "Claims " + match[1] + " " + claim.what + "; the source tree has " + claim.actual + ".");
    }
}

// -----------------------------------------------------------------------------
// Report
// -----------------------------------------------------------------------------

process.stdout.write("Documentation check\n");
process.stdout.write("===================\n");
process.stdout.write("  Gen-1 classes: " + gen1Classes.length + "\n");
process.stdout.write("  Gen-2 controls: " + gen2Classes.length + "\n");
process.stdout.write("  Gen-3 classes: " + gen3Classes.length + "\n");

if (failures.length === 0)
{
    process.stdout.write("\n  PASS  documentation agrees with the source\n");
    process.exit(0);
}

process.stdout.write("\n  FAIL  " + failures.length + " disagreement(s)\n\n");

for (let index = 0; index < failures.length; index = index + 1)
{
    const entry = failures[index];
    process.stdout.write("  [" + entry.rule + "] " + entry.file + "\n      " + entry.message + "\n");
}

process.exit(1);
