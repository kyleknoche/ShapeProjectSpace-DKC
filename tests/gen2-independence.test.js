import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom, loadModule, connect, disconnect } from "./support/environment.js";

/**
 * GEN 2 INDEPENDENCE
 * =============================================================================
 * The claim the control gallery makes, asserted rather than demonstrated.
 *
 * This file registers the generic library and never touches src/gen3. If any
 * control secretly needed an application class, a project module or a piece of
 * project data, one of these tests would fail. node:test runs each file in its
 * own process, so nothing another test file imported can help it pass.
 */

installDom();

const { GEN2_CONTROLS } = await loadModule("src/gen2/index.js");
const { registerGen2Controls } = await loadModule("src/app/registerGen2.js");

registerGen2Controls();

test("no application element is defined in this process", function ()
{
    const applicationTags =
    [
        "shape-bookshelf",
        "shape-board",
        "shape-project-tree",
        "shape-artifact-grid",
        "shape-lineage-view",
        "shape-section-reader",
        "shape-contact-form",
        "shape-status-label",
        "shape-mark"
    ];

    for (let index = 0; index < applicationTags.length; index = index + 1)
    {
        assert.equal(customElements.get(applicationTags[index]), undefined, applicationTags[index] + " must not be defined by the library");
    }
});

test("a whole working screen can be built from Gen 2 alone", function ()
{
    const screen = document.createElement("div");
    document.body.appendChild(screen);

    const panel = document.createElement("tg-panel");
    panel.setAttribute("heading", "Records");

    const form = document.createElement("tg-form");

    const search = document.createElement("tg-text-box");
    search.setAttribute("name", "search");
    search.setAttribute("label", "Search");

    const kind = document.createElement("tg-drop-down");
    kind.setAttribute("name", "kind");

    const includeArchived = document.createElement("tg-check-box");
    includeArchived.setAttribute("name", "archived");

    form.append(search, kind, includeArchived);

    const grid = document.createElement("tg-data-grid");
    const status = document.createElement("tg-status-meter");

    panel.append(form, grid, status);
    screen.appendChild(panel);

    kind.items = [ { value: "all", label: "All" }, { value: "draft", label: "Draft" } ];
    grid.setColumns([ { key: "name", title: "Name", sortable: true } ]);
    grid.setRows([ { id: "1", name: "first" }, { id: "2", name: "second" } ]);

    form.setValues({ search: "first", kind: "draft", archived: true });
    const submitted = form.submit();

    assert.equal(submitted.handled, true);
    assert.deepEqual(submitted.detail.values, { search: "first", kind: "draft", archived: true });

    grid.sortBy("name");
    assert.equal(grid.displayedRows()[0].name, "first");

    status.report("success", "Two records.");
    assert.equal(status.getElement("message").textContent, "Two records.");

    screen.remove();
});

test("every control survives being used with only its defaults", function ()
{
    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const controlClass = GEN2_CONTROLS[index];
        const element = connect(document.createElement(controlClass.elementName));

        assert.doesNotThrow(function ()
        {
            element.performAction();
            element.requestUpdate();
        }, controlClass.name + " needs configuration it should not need");

        disconnect(element);
    }
});

test("no Gen-2 source file imports anything outside Gen 1 or its own support folder", async function ()
{
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const directory = fileURLToPath(new URL("../src/gen2/", import.meta.url));
    const entries = readdirSync(directory);

    for (let index = 0; index < entries.length; index = index + 1)
    {
        const entry = entries[index];
        const path = join(directory, entry);

        if (statSync(path).isDirectory() === true || entry.endsWith(".js") === false)
        {
            continue;
        }

        const text = readFileSync(path, "utf8");
        const matches = text.match(/^\s*(?:import|export)\b[^\n]*?\bfrom\s+"([^"]+)"/gm);

        if (matches === null)
        {
            continue;
        }

        for (let position = 0; position < matches.length; position = position + 1)
        {
            const specifier = matches[position].replace(/^[\s\S]*\bfrom\s+"/, "").replace(/"$/, "");

            if (entry === "index.js")
            {
                assert.match(specifier, /^\.\//, "the barrel may only re-export its own folder");
                continue;
            }

            const permitted = specifier === "../gen1/AbstractElement.js" || specifier.startsWith("./support/") === true;
            assert.equal(permitted, true, entry + " imports " + specifier + ", which a Gen-2 control may not");
        }
    }
});
