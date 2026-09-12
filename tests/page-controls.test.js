import { test } from "node:test";
import assert from "node:assert/strict";
import { installPage, loadModule } from "./support/environment.js";

/**
 * THE CONTROL GALLERY PAGE
 * =============================================================================
 * Loads the real controls.html markup and runs its real page script against it.
 *
 * The important assertion is the negative one: after the gallery has fully
 * loaded and been interacted with, no application element has been defined. The
 * page's claim is that Gen 2 stands alone, and this is that claim executed.
 */

installPage("controls.html");

await loadModule("src/app/controls-page.js");

/**
 * Finds the demonstration button carrying a command.
 * @param {string} command
 * @returns {Element}
 */
function buttonFor(command)
{
    const buttons = document.querySelectorAll("tg-button");

    for (let index = 0; index < buttons.length; index = index + 1)
    {
        if (buttons[index].command === command)
        {
            return buttons[index];
        }
    }

    throw new Error("No button carries the command " + command);
}

test("the gallery defines the library and no application element", function ()
{
    const libraryTags =
    [
        "tg-label", "tg-text-box", "tg-text-area", "tg-button", "tg-check-box",
        "tg-radio-group", "tg-drop-down", "tg-list-box", "tg-tree-view",
        "tg-tree-list-view", "tg-image", "tg-panel", "tg-form", "tg-data-grid",
        "tg-status-meter"
    ];

    for (let index = 0; index < libraryTags.length; index = index + 1)
    {
        assert.ok(customElements.get(libraryTags[index]) !== undefined, libraryTags[index] + " should be defined");
    }

    const applicationTags = ["shape-bookshelf", "shape-board", "shape-section-reader", "shape-mark", "shape-contact-form"];

    for (let index = 0; index < applicationTags.length; index = index + 1)
    {
        assert.equal(customElements.get(applicationTags[index]), undefined, applicationTags[index] + " must not exist on this page");
    }
});

test("every control in the library appears on the page", function ()
{
    const expected =
    [
        "tg-label", "tg-text-box", "tg-text-area", "tg-button", "tg-check-box",
        "tg-radio-group", "tg-drop-down", "tg-list-box", "tg-tree-view",
        "tg-tree-list-view", "tg-image", "tg-panel", "tg-form", "tg-data-grid",
        "tg-status-meter"
    ];

    for (let index = 0; index < expected.length; index = index + 1)
    {
        const found = document.querySelectorAll(expected[index]);
        assert.ok(found.length > 0, expected[index] + " has no specimen in the gallery");
        assert.equal(found[0].isBuilt, true, expected[index] + " did not build");
    }
});

test("the data-driven specimens were configured by the page", function ()
{
    assert.ok(document.getElementById("demo-radio-group").items.length > 0);
    assert.ok(document.getElementById("demo-drop-down").items.length > 0);
    assert.ok(document.getElementById("demo-list-box").items.length > 0);
    assert.ok(document.getElementById("demo-tree").nodes.length > 0);
    assert.ok(document.getElementById("demo-tree-list").columns.length > 0);
    assert.ok(document.getElementById("demo-grid").rows.length > 0);
    assert.equal(document.getElementById("demo-list-empty").items.length, 0, "the empty-state specimen must stay empty");
});

test("the event monitor records what the specimens emit", function ()
{
    const monitor = document.getElementById("monitor-grid");
    const meter = document.getElementById("monitor-meter");

    assert.equal(monitor.rows.length, 0, "the monitor starts empty");

    const listBox = document.getElementById("demo-list-box");
    listBox.selectValue("charlie");

    assert.ok(monitor.rows.length > 0, "the monitor did not record a selection");
    assert.equal(monitor.rows[0].type, "tg-change");
    assert.ok(meter.value > 0);

    const before = monitor.rows.length;
    document.getElementById("demo-check-box").toggle();

    assert.ok(monitor.rows.length > before, "the monitor did not record a second event");
    assert.equal(monitor.rows[0].type, "tg-action", "the newest event is first");
});

test("the monitor can be paused and cleared", function ()
{
    const monitor = document.getElementById("monitor-grid");
    const pause = document.getElementById("monitor-pause");

    pause.check();
    const whilePaused = monitor.rows.length;
    document.getElementById("demo-check-box").toggle();

    assert.equal(monitor.rows.length, whilePaused, "a paused monitor must record nothing");

    pause.uncheck();
    buttonFor("monitor-clear").invoke();

    assert.equal(monitor.rows.length, 0, "clearing must empty the monitor");
});

test("the demonstration commands run", function ()
{
    const listBox = document.getElementById("demo-list-box");
    const before = listBox.items.length;

    buttonFor("list-add").invoke();
    assert.equal(listBox.items.length, before + 1);

    buttonFor("list-remove").invoke();
    assert.equal(listBox.items.length, before);

    const tree = document.getElementById("demo-tree");
    buttonFor("tree-expand").invoke();
    const expanded = tree.visibleNodeIds().length;

    buttonFor("tree-collapse").invoke();
    assert.ok(tree.visibleNodeIds().length < expanded);

    const grid = document.getElementById("demo-grid");
    buttonFor("grid-sort").invoke();
    assert.equal(grid.sortKey, "size");

    const meter = document.getElementById("demo-meter");
    const level = meter.value;
    buttonFor("meter-advance").invoke();
    assert.ok(meter.value > level);

    const form = document.getElementById("demo-form");
    buttonFor("form-fill").invoke();
    assert.equal(form.getValues().title, "A complete submission");

    buttonFor("form-submit").invoke();
    assert.match(form.noticeText, /Accepted 6 values/, "the page decides what a submission means, not the control");
});

test("a disabled specimen refuses its action", function ()
{
    const disabledButton = buttonFor("demo-disabled");
    assert.equal(disabledButton.disabled, true);
    assert.equal(disabledButton.invoke().handled, false);
});
