import { test } from "node:test";
import assert from "node:assert/strict";
import { installPage, loadModule } from "./support/environment.js";

/**
 * THE PUBLIC PAGE
 * =============================================================================
 * Loads the real index.html markup and runs its real page script against it.
 *
 * The unit tests prove that the controls work. This proves that the page is
 * wired to them: that every id the script reaches for exists, that the elements
 * upgrade, and that a navigation gesture actually moves the site. Those are the
 * failures that unit tests never catch and that a browser would catch
 * immediately - if anyone opened one.
 */

installPage("index.html");

await loadModule("src/app/index-page.js");

test("every element the page script reaches for exists and has upgraded", function ()
{
    const ids =
    [
        "bookshelf",
        "reader",
        "board",
        "project-tree",
        "artifact-grid",
        "inventory-filter",
        "contact-form",
        "status-readout"
    ];

    for (let index = 0; index < ids.length; index = index + 1)
    {
        const element = document.getElementById(ids[index]);

        assert.ok(element !== null, "#" + ids[index] + " is missing from index.html");
        assert.equal(typeof element.performAction, "function", "#" + ids[index] + " did not upgrade to a Three-Gen element");
        assert.equal(element.isBuilt, true, "#" + ids[index] + " did not build its DOM");
    }
});

test("the page opens on a section and the bookshelf agrees with the reader", function ()
{
    const bookshelf = document.getElementById("bookshelf");
    const reader = document.getElementById("reader");

    assert.equal(bookshelf.currentSection, "overview");
    assert.equal(reader.sectionId, "overview");
    assert.ok(reader.heading.length > 0);
});

test("navigating the bookshelf moves the reader, the state and the address", function ()
{
    const bookshelf = document.getElementById("bookshelf");
    const reader = document.getElementById("reader");
    const status = document.getElementById("status-readout");

    bookshelf.showSection("three-gen");

    assert.equal(reader.sectionId, "three-gen");
    assert.equal(reader.heading, "The Three-Gen Design Pattern");
    assert.match(status.text, /Section: three-gen/);
    assert.equal(window.location.hash, "#three-gen");

    bookshelf.showSection("contact");
    assert.equal(reader.sectionId, "contact");
    assert.equal(window.location.hash, "#contact");
});

test("the board is wired to the shared state", function ()
{
    const board = document.getElementById("board");
    const status = document.getElementById("status-readout");

    board.selectNode("three-gen");

    assert.equal(board.selectedNodeId, "three-gen");
    assert.match(status.text, /Board: three-gen/);
});

test("the project tree is wired to the shared state", function ()
{
    const tree = document.getElementById("project-tree");
    const status = document.getElementById("status-readout");

    tree.showArea("method-standards");

    assert.match(status.text, /Area: method-standards/);
});

test("the generation filter narrows the inventory", function ()
{
    const filter = document.getElementById("inventory-filter");
    const grid = document.getElementById("artifact-grid");

    const all = grid.rows.length;
    filter.generation = "Gen 1";

    assert.equal(grid.rows.length, 1);
    assert.equal(grid.rows[0].name, "AbstractElement");

    filter.generation = "";
    assert.equal(grid.rows.length, all);
});

test("the contact form has its fields, its subjects and its validation", function ()
{
    const form = document.getElementById("contact-form");
    const subject = form.fieldNamed("subject");

    assert.equal(form.fields().length, 5);
    assert.ok(subject !== null);
    assert.ok(subject.items.length > 0, "the page supplies the subject options");

    const refused = form.submit();
    assert.equal(refused.handled, false);
    assert.ok(refused.detail.errors.length > 0);

    form.setValues(
    {
        name: "A reader",
        address: "reader@example.com",
        subject: "pattern",
        message: "The boundaries hold.",
        correction: false
    });

    const accepted = form.submit();
    assert.equal(accepted.handled, true);
    assert.equal(accepted.detail.transmitted, false);
});

test("the page defines both generations and nothing else", function ()
{
    assert.ok(customElements.get("tg-panel") !== undefined, "the library must be registered");
    assert.ok(customElements.get("shape-bookshelf") !== undefined, "the application must be registered");
    assert.equal(customElements.get("tg-not-a-control"), undefined);
});

test("the page left no global behind", function ()
{
    assert.equal(window.shapeState, undefined);
    assert.equal(window.state, undefined);
    assert.equal(globalThis.shapeState, undefined);
});
