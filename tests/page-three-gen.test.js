import { test } from "node:test";
import assert from "node:assert/strict";
import { installPage, loadModule } from "./support/environment.js";

/**
 * THE REFERENCE PAGE
 * =============================================================================
 * Loads the real three-gen.html markup and runs its real page script.
 *
 * The page claims that it cannot describe an architecture the code does not
 * have. These tests check that claim from the outside: the rendered verdict, the
 * rendered lineages and the rendered action verbs are compared against the class
 * objects themselves, so a page that had quietly become decorative would fail.
 */

installPage("three-gen.html");

const { GEN2_CONTROLS } = await loadModule("src/gen2/index.js");
const { GEN3_ELEMENTS } = await loadModule("src/gen3/index.js");
const { classLineage } = await loadModule("src/gen3/data/lineage.js");

await loadModule("src/app/three-gen-page.js");

test("the page reports a passing verdict computed in the browser", function ()
{
    const verdict = document.getElementById("verdict");
    const text = document.getElementById("verdict-text").textContent;

    assert.equal(verdict.classList.contains("verdict--failed"), false);
    assert.match(text, /No violations/);
    assert.match(text, new RegExp(String(GEN2_CONTROLS.length) + " generic controls"));
    assert.match(text, new RegExp(String(GEN3_ELEMENTS.length) + " application elements"));
});

test("the lineage view shows every class in the repository", function ()
{
    const view = document.getElementById("lineage-view");
    const ids = view.visibleNodeIds();

    assert.equal(ids.length, 2 + GEN2_CONTROLS.length + GEN3_ELEMENTS.length);
    assert.equal(ids[0], "HTMLElement");
    assert.equal(ids[1], "AbstractElement");

    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const name = GEN2_CONTROLS[index].name;
        assert.ok(ids.indexOf(name) >= 0, name + " is missing from the lineage view");
        assert.equal(view.getNode(name).generation, "Gen 2");
    }

    for (let index = 0; index < GEN3_ELEMENTS.length; index = index + 1)
    {
        const name = GEN3_ELEMENTS[index].name;
        assert.ok(ids.indexOf(name) >= 0, name + " is missing from the lineage view");
        assert.equal(view.getNode(name).generation, "Gen 3");
    }
});

test("the lineage shown for each class is the lineage the class has", function ()
{
    const view = document.getElementById("lineage-view");
    const classes = GEN2_CONTROLS.concat(GEN3_ELEMENTS);

    for (let index = 0; index < classes.length; index = index + 1)
    {
        const constructorFunction = classes[index];
        const displayed = view.getNode(constructorFunction.name).lineage;
        const actual = classLineage(constructorFunction).join(" > ");

        assert.equal(displayed, actual, constructorFunction.name + " is displayed with a lineage it does not have");
    }
});

test("the tag name shown for each class is the tag it registered", function ()
{
    const view = document.getElementById("lineage-view");
    const classes = GEN2_CONTROLS.concat(GEN3_ELEMENTS);

    for (let index = 0; index < classes.length; index = index + 1)
    {
        const constructorFunction = classes[index];
        const displayed = view.getNode(constructorFunction.name).tag;

        assert.equal(displayed, constructorFunction.elementName);
        assert.equal(customElements.get(displayed), constructorFunction);
    }
});

test("the action table reports the verb each class actually returns", function ()
{
    const grid = document.getElementById("action-grid");
    const rows = grid.rows;

    assert.equal(rows.length, GEN2_CONTROLS.length + GEN3_ELEMENTS.length);

    for (let index = 0; index < rows.length; index = index + 1)
    {
        assert.ok(rows[index].action.length > 0, rows[index].name + " has no action verb in the table");
    }

    const byName = {};

    for (let index = 0; index < rows.length; index = index + 1)
    {
        byName[rows[index].name] = rows[index].action;
    }

    assert.equal(byName.Button, "invoke");
    assert.equal(byName.TextBox, "commit");
    assert.equal(byName.Form, "submit");
    assert.equal(byName.StatusMeter, "acknowledge");
    assert.equal(byName.ShapeBoard, "toggle");
    assert.equal(byName.ShapeMark, "resolve");
});

test("the generation filter narrows the lineage view", function ()
{
    const filter = document.getElementById("lineage-filter");
    const view = document.getElementById("lineage-view");

    filter.generation = "Gen 2";

    assert.ok(view.getNode("Panel") !== null, "Gen 2 rows survive the filter");
    assert.equal(view.getNode("ShapeBoard"), null, "Gen 3 rows are filtered out");

    filter.generation = "";
    assert.ok(view.getNode("ShapeBoard") !== null, "clearing the filter restores everything");
});

test("the ladder in the markup names a lineage that really exists", function ()
{
    const ladder = document.querySelector(".lineage-ladder");
    const text = ladder.textContent.replace(/\s+/g, " ");

    assert.match(text, /HTMLElement/);
    assert.match(text, /AbstractElement/);
    assert.match(text, /TreeView/);
    assert.match(text, /ShapeProjectTree/);

    const actual = classLineage(customElements.get("shape-project-tree")).join(" > ");
    assert.equal(actual, "HTMLElement > AbstractElement > TreeView > ShapeProjectTree",
        "the hand-written ladder in three-gen.html no longer matches the code");
});
