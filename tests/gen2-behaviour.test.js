import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom, loadModule, connect, disconnect, recordEvents } from "./support/environment.js";

/**
 * GEN 2 BEHAVIOUR
 * =============================================================================
 * Each control does the thing it says it does, without any application present.
 *
 * The emphasis is on the two properties that are easy to lose in a later
 * session: that a data update preserves the identity of the nodes that survive
 * it, and that the abstract action is the single path through which state
 * changes and events happen.
 */

installDom();

const { registerGen2Controls } = await loadModule("src/app/registerGen2.js");
registerGen2Controls();

/**
 * @param {string} tagName
 * @returns {Element}
 */
function make(tagName)
{
    return connect(document.createElement(tagName));
}

// -----------------------------------------------------------------------------
// Label
// -----------------------------------------------------------------------------

test("Label activates the control it is for, and reports honestly when it is for nothing", function ()
{
    const target = make("tg-text-box");
    target.id = "label-target-field";

    const label = make("tg-label");
    label.text = "Name";
    label.htmlFor = "label-target-field";

    assert.equal(label.getElement("text").textContent, "Name");
    assert.equal(label.targetElement(), target);

    const activated = label.performAction();
    assert.equal(activated.action, "activate");
    assert.equal(activated.handled, true);

    label.htmlFor = "";
    const missed = label.performAction();
    assert.equal(missed.handled, false);

    disconnect(label);
    disconnect(target);
});

// -----------------------------------------------------------------------------
// Button
// -----------------------------------------------------------------------------

test("Button invokes on click and refuses while disabled or busy", function ()
{
    const button = make("tg-button");
    button.configure({ text: "Run", command: "run" });

    const recorder = recordEvents(button, "tg-action");
    button.getElement("button").click();

    assert.equal(recorder.events.length, 1);
    assert.equal(recorder.events[0].detail.detail.command, "run");

    button.disabled = true;
    assert.equal(button.performAction().handled, false);
    assert.equal(button.getElement("button").disabled, true);

    button.disabled = false;
    button.busy = true;
    assert.equal(button.performAction().handled, false);

    recorder.stop();
    disconnect(button);
});

// -----------------------------------------------------------------------------
// TextBox and TextArea
// -----------------------------------------------------------------------------

test("TextBox separates the draft from the committed value", function ()
{
    const textBox = make("tg-text-box");
    textBox.configure({ label: "Name", name: "name" });

    const input = textBox.getElement("input");
    const changes = recordEvents(textBox, "tg-change");
    const inputs = recordEvents(textBox, "tg-input");

    input.value = "typed";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    assert.equal(inputs.events.length, 1);
    assert.equal(textBox.draftValue, "typed");
    assert.equal(textBox.value, "", "typing must not change the committed value");
    assert.equal(changes.events.length, 0);

    textBox.commit();

    assert.equal(textBox.value, "typed");
    assert.equal(changes.events.length, 1);
    assert.equal(changes.events[0].detail.previousValue, "");

    textBox.commit();
    assert.equal(changes.events.length, 1, "committing an unchanged value must not announce a change");

    changes.stop();
    inputs.stop();
    disconnect(textBox);
});

test("TextBox validates required, length and reports the message in its hint", function ()
{
    const textBox = make("tg-text-box");
    textBox.configure({ required: true, name: "name" });

    const outcome = textBox.validate();
    assert.equal(outcome.valid, false);
    assert.equal(textBox.invalid, true);
    assert.equal(textBox.getElement("hint").textContent, outcome.message);

    textBox.value = "present";
    assert.equal(textBox.validate().valid, true);
    assert.equal(textBox.invalid, false);

    textBox.maxLength = 3;
    textBox.getElement("input").value = "far too long";
    assert.equal(textBox.validate().valid, false);

    disconnect(textBox);
});

test("TextBox refuses to commit while read only or disabled", function ()
{
    const textBox = make("tg-text-box");
    textBox.readOnly = true;
    textBox.getElement("input").value = "ignored";

    assert.equal(textBox.commit().handled, false);
    assert.equal(textBox.value, "");

    disconnect(textBox);
});

test("TextArea commits and counts characters", function ()
{
    const textArea = make("tg-text-area");
    textArea.configure({ maxLength: 10, name: "notes" });

    const input = textArea.getElement("input");
    input.value = "abc";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    assert.equal(textArea.getElement("counter").textContent, "3 / 10");

    const result = textArea.commit();
    assert.equal(result.action, "commit");
    assert.equal(textArea.value, "abc");

    disconnect(textArea);
});

// -----------------------------------------------------------------------------
// CheckBox
// -----------------------------------------------------------------------------

test("CheckBox routes the click and the API through one path", function ()
{
    const checkBox = make("tg-check-box");
    checkBox.configure({ label: "Agree", name: "agree" });

    const changes = recordEvents(checkBox, "tg-change");
    const input = checkBox.getElement("input");

    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    assert.equal(checkBox.checked, true);
    assert.equal(changes.events.length, 1);

    checkBox.toggle();
    assert.equal(checkBox.checked, false);
    assert.equal(changes.events.length, 2);

    checkBox.check();
    checkBox.check();
    assert.equal(changes.events.length, 3, "setting a state it already has announces nothing");

    checkBox.disabled = true;
    assert.equal(checkBox.toggle().handled, false);

    changes.stop();
    disconnect(checkBox);
});

// -----------------------------------------------------------------------------
// RadioGroup and DropDown
// -----------------------------------------------------------------------------

test("RadioGroup selects one option and keeps row identity when items change", function ()
{
    const group = make("tg-radio-group");
    group.items = [
        { value: "a", label: "A" },
        { value: "b", label: "B" },
        { value: "c", label: "C" }
    ];

    const list = group.getElement("list");
    assert.equal(list.childNodes.length, 3);

    const rowForB = list.childNodes[1];

    const changes = recordEvents(group, "tg-change");
    group.selectValue("b");

    assert.equal(group.value, "b");
    assert.equal(changes.events.length, 1);
    assert.deepEqual(group.selectedItem, { value: "b", label: "B" });

    group.items = [
        { value: "b", label: "B renamed" },
        { value: "d", label: "D" }
    ];

    assert.equal(list.childNodes.length, 2);
    assert.equal(list.childNodes[0], rowForB, "the surviving option must keep its node");
    assert.equal(group.value, "b");

    changes.stop();
    disconnect(group);
});

test("DropDown commits a selection through the native change event", function ()
{
    const dropDown = make("tg-drop-down");
    dropDown.configure({ placeholder: "Choose", name: "material" });
    dropDown.items = [
        { value: "paper", label: "Paper" },
        { value: "linen", label: "Linen" }
    ];

    const select = dropDown.getElement("select");
    assert.equal(select.childNodes.length, 3, "the placeholder is an option too");

    const changes = recordEvents(dropDown, "tg-change");
    select.value = "linen";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    assert.equal(dropDown.value, "linen");
    assert.equal(changes.events.length, 1);
    assert.equal(dropDown.selectedItem.label, "Linen");

    changes.stop();
    disconnect(dropDown);
});

// -----------------------------------------------------------------------------
// ListBox
// -----------------------------------------------------------------------------

test("ListBox separates selection from activation", function ()
{
    const listBox = make("tg-list-box");
    listBox.items = [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Bravo" },
        { value: "c", label: "Charlie", disabled: true }
    ];

    const changes = recordEvents(listBox, "tg-change");
    const actions = recordEvents(listBox, "tg-action");

    listBox.selectValue("a");
    assert.equal(listBox.value, "a");
    assert.equal(changes.events.length, 1);
    assert.equal(actions.events.length, 0, "selecting is not activating");

    const activated = listBox.activateValue("a");
    assert.equal(activated.action, "activate");
    assert.equal(activated.handled, true);
    assert.equal(actions.events.length, 1);

    assert.equal(listBox.activateValue("c").handled, false, "a disabled item cannot be activated");
    assert.equal(listBox.activateValue("nope").handled, false);

    changes.stop();
    actions.stop();
    disconnect(listBox);
});

test("ListBox supports multiple selection and keyboard navigation", function ()
{
    const listBox = make("tg-list-box");
    listBox.selectionMode = "multiple";
    listBox.items = [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Bravo" },
        { value: "c", label: "Charlie" }
    ];

    listBox.selectValue("a");
    listBox.toggleValue("c");
    assert.deepEqual(listBox.selectedValues, ["a", "c"]);

    listBox.toggleValue("c");
    assert.deepEqual(listBox.selectedValues, ["a"]);

    const viewport = listBox.getElement("list");
    viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    assert.equal(listBox.activeValue, "c");

    viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    assert.equal(listBox.activeValue, "a");

    disconnect(listBox);
});

test("ListBox keeps row nodes when the items array is replaced", function ()
{
    const listBox = make("tg-list-box");
    listBox.items = [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Bravo" }
    ];

    const list = listBox.getElement("list");
    const rowForA = list.childNodes[0];
    const rowForB = list.childNodes[1];

    listBox.items = [
        { value: "b", label: "Bravo renamed" },
        { value: "a", label: "Alpha" },
        { value: "z", label: "Zulu" }
    ];

    assert.equal(list.childNodes.length, 3);
    assert.equal(list.childNodes[0], rowForB, "reordering must move nodes, not recreate them");
    assert.equal(list.childNodes[1], rowForA);
    assert.equal(rowForB.textContent.indexOf("Bravo renamed") >= 0, true);

    disconnect(listBox);
});

// -----------------------------------------------------------------------------
// TreeView
// -----------------------------------------------------------------------------

const TREE_DATA =
[
    {
        id: "root",
        label: "Root",
        children:
        [
            { id: "child-a", label: "Child A" },
            {
                id: "child-b",
                label: "Child B",
                children: [ { id: "grandchild", label: "Grandchild" } ]
            }
        ]
    },
    { id: "leaf", label: "Leaf" }
];

test("TreeView shows, expands and activates a hierarchy", function ()
{
    const tree = make("tg-tree-view");
    tree.setNodes(TREE_DATA);

    assert.deepEqual(tree.visibleNodeIds(), ["root", "leaf"]);

    const expands = recordEvents(tree, "tg-expand");
    tree.expand("root");

    assert.equal(expands.events.length, 1);
    assert.deepEqual(tree.visibleNodeIds(), ["root", "child-a", "child-b", "leaf"]);

    tree.revealNode("grandchild");
    assert.deepEqual(tree.visibleNodeIds(), ["root", "child-a", "child-b", "grandchild", "leaf"]);

    const changes = recordEvents(tree, "tg-change");
    const activated = tree.activateNode("grandchild");

    assert.equal(activated.action, "activate");
    assert.equal(activated.detail.isBranch, false);
    assert.equal(tree.selectedId, "grandchild");
    assert.equal(changes.events.length, 1);

    tree.collapseAll();
    assert.deepEqual(tree.visibleNodeIds(), ["root", "leaf"]);

    expands.stop();
    changes.stop();
    disconnect(tree);
});

test("TreeView keeps row nodes across an expansion", function ()
{
    const tree = make("tg-tree-view");
    tree.setNodes(TREE_DATA);

    const viewport = tree.getElement("viewport");
    const rootRow = viewport.childNodes[0];
    const leafRow = viewport.childNodes[1];

    tree.expand("root");

    assert.equal(viewport.childNodes.length, 4);
    assert.equal(viewport.childNodes[0], rootRow, "expanding must not rebuild the tree");
    assert.equal(viewport.childNodes[3], leafRow, "rows after the expansion keep their identity");

    disconnect(tree);
});

test("TreeView keeps expansion state for ids that survive a data replacement", function ()
{
    const tree = make("tg-tree-view");
    tree.setNodes(TREE_DATA);
    tree.expand("root");

    tree.setNodes([
        {
            id: "root",
            label: "Root renamed",
            children: [ { id: "child-a", label: "Child A" } ]
        }
    ]);

    assert.deepEqual(tree.expandedIds, ["root"]);
    assert.deepEqual(tree.visibleNodeIds(), ["root", "child-a"]);

    disconnect(tree);
});

test("TreeView refuses duplicate node ids rather than rendering nonsense", function ()
{
    const tree = make("tg-tree-view");

    assert.throws(function ()
    {
        tree.setNodes([ { id: "same", label: "One" }, { id: "same", label: "Two" } ]);
    }, /duplicate node id/);

    disconnect(tree);
});

// -----------------------------------------------------------------------------
// TreeListView
// -----------------------------------------------------------------------------

test("TreeListView renders a hierarchy across columns", function ()
{
    const view = make("tg-tree-list-view");
    view.setColumns([
        { key: "label", title: "Name" },
        { key: "kind", title: "Kind" },
        { key: "count", title: "Count", align: "right" }
    ]);
    view.setNodes([
        {
            id: "group",
            label: "Group",
            kind: "Container",
            count: 2,
            expanded: true,
            children:
            [
                { id: "one", label: "One", kind: "Item", count: 1 },
                { id: "two", label: "Two", kind: "Item", count: 1 }
            ]
        }
    ]);

    const body = view.getElement("body");
    assert.equal(body.childNodes.length, 3);
    assert.equal(view.getElement("headRow").childNodes.length, 3);

    const firstRow = body.childNodes[0];
    assert.equal(firstRow.childNodes.length, 3);
    assert.equal(firstRow.childNodes[1].textContent, "Container");
    assert.equal(view.treeColumnKey, "label");

    view.collapse("group");
    assert.equal(body.childNodes.length, 1);
    assert.equal(body.childNodes[0], firstRow, "collapsing keeps the parent row node");

    view.setColumns([ { key: "label", title: "Name" } ]);
    assert.equal(body.childNodes[0].childNodes.length, 1, "removing a column removes its cells");
    assert.equal(body.childNodes[0], firstRow, "changing columns keeps the row");

    disconnect(view);
});

test("TreeListView runs a column formatter", function ()
{
    const view = make("tg-tree-list-view");

    function formatUpper(value)
    {
        return String(value).toUpperCase();
    }

    view.setColumns([ { key: "label", title: "Name" }, { key: "kind", title: "Kind", format: formatUpper } ]);
    view.setNodes([ { id: "one", label: "One", kind: "item" } ]);

    assert.equal(view.cellValue({ kind: "item" }, { key: "kind", format: formatUpper }), "ITEM");
    assert.equal(view.getElement("body").childNodes[0].childNodes[1].textContent, "ITEM");

    disconnect(view);
});

// -----------------------------------------------------------------------------
// DataGrid
// -----------------------------------------------------------------------------

const GRID_COLUMNS =
[
    { key: "name", title: "Name", sortable: true },
    { key: "size", title: "Size", sortable: true, align: "right" }
];

const GRID_ROWS =
[
    { id: "1", name: "charlie", size: 30 },
    { id: "2", name: "alpha", size: 10 },
    { id: "3", name: "bravo", size: 20 }
];

test("DataGrid sorts a copy and leaves the caller's array alone", function ()
{
    const grid = make("tg-data-grid");
    grid.setColumns(GRID_COLUMNS);
    grid.setRows(GRID_ROWS);

    const sorts = recordEvents(grid, "tg-sort");
    grid.sortBy("name");

    assert.equal(sorts.events.length, 1);
    assert.equal(grid.sortDirection, "ascending");
    assert.deepEqual(grid.displayedRows().map(function nameOf(row) { return row.name; }), ["alpha", "bravo", "charlie"]);
    assert.equal(GRID_ROWS[0].name, "charlie", "the caller's array must not be reordered");

    grid.sortBy("name");
    assert.equal(grid.sortDirection, "descending");
    assert.deepEqual(grid.displayedRows().map(function nameOf(row) { return row.name; }), ["charlie", "bravo", "alpha"]);

    grid.sortBy("size", "ascending");
    assert.deepEqual(grid.displayedRows().map(function sizeOf(row) { return row.size; }), [10, 20, 30]);

    sorts.stop();
    disconnect(grid);
});

test("DataGrid selects, activates and keeps row nodes through a sort", function ()
{
    const grid = make("tg-data-grid");
    grid.setColumns(GRID_COLUMNS);
    grid.setRows(GRID_ROWS);

    const body = grid.getElement("body");
    const rowForCharlie = body.childNodes[0];

    grid.sortBy("name");
    assert.equal(body.childNodes[2], rowForCharlie, "sorting moves row nodes, it does not rebuild them");

    const changes = recordEvents(grid, "tg-change");
    grid.selectRow("2");

    assert.equal(grid.selectedKey, "2");
    assert.equal(grid.selectedRow.name, "alpha");
    assert.equal(changes.events.length, 1);

    const activated = grid.activateRow("3");
    assert.equal(activated.action, "activate");
    assert.equal(activated.detail.row.name, "bravo");
    assert.equal(grid.activateRow("missing").handled, false);

    changes.stop();
    disconnect(grid);
});

test("DataGrid keeps a selection that survives a row replacement", function ()
{
    const grid = make("tg-data-grid");
    grid.setColumns(GRID_COLUMNS);
    grid.setRows(GRID_ROWS);
    grid.selectRow("2");

    grid.setRows([ { id: "2", name: "alpha", size: 11 }, { id: "9", name: "zulu", size: 90 } ]);
    assert.equal(grid.selectedKey, "2");

    grid.setRows([ { id: "9", name: "zulu", size: 90 } ]);
    assert.equal(grid.selectedKey, "", "a selection whose row is gone is dropped");

    disconnect(grid);
});

// -----------------------------------------------------------------------------
// ImageView
// -----------------------------------------------------------------------------

test("ImageView reports its load state and recovers from failure", function ()
{
    const image = make("tg-image");
    assert.equal(image.loadState, "idle");
    assert.equal(image.performAction().handled, false, "there is nothing to resolve without a source");

    image.src = "assets/img/specimen.svg";
    assert.equal(image.loadState, "loading");
    assert.equal(image.getElement("picture").getAttribute("src"), "assets/img/specimen.svg");

    const errors = recordEvents(image, "tg-error");
    image.getElement("picture").dispatchEvent(new Event("error"));

    assert.equal(image.loadState, "error");
    assert.equal(errors.events.length, 1);
    assert.equal(image.getElement("placeholder").textContent, "Image unavailable");

    const loads = recordEvents(image, "tg-load");
    image.resolve();
    image.getElement("picture").dispatchEvent(new Event("load"));

    assert.equal(image.loadState, "loaded");
    assert.equal(loads.events.length, 1);

    errors.stop();
    loads.stop();
    disconnect(image);
});

// -----------------------------------------------------------------------------
// Panel
// -----------------------------------------------------------------------------

test("Panel adopts authored children instead of discarding them", function ()
{
    const panel = document.createElement("tg-panel");
    const authored = document.createElement("p");
    authored.textContent = "Authored in markup";
    panel.appendChild(authored);

    connect(panel);

    assert.equal(panel.getElement("body").childNodes[0], authored, "the authored node must be moved, not recreated");
    assert.equal(authored.textContent, "Authored in markup");

    disconnect(panel);
});

test("Panel toggles only when it is collapsible", function ()
{
    const panel = make("tg-panel");
    panel.heading = "Region";

    assert.equal(panel.toggleCollapsed().handled, false, "a panel that cannot collapse says so");

    panel.collapsible = true;
    const toggles = recordEvents(panel, "tg-toggle");

    assert.equal(panel.collapse().handled, true);
    assert.equal(panel.collapsed, true);
    assert.equal(panel.getElement("body").hidden, true);
    assert.equal(toggles.events.length, 1);

    panel.collapse();
    assert.equal(toggles.events.length, 1, "collapsing an already collapsed panel announces nothing");

    panel.expand();
    assert.equal(panel.collapsed, false);
    assert.equal(toggles.events.length, 2);

    toggles.stop();
    disconnect(panel);
});

// -----------------------------------------------------------------------------
// Form
// -----------------------------------------------------------------------------

test("Form discovers fields by contract, validates them and submits", function ()
{
    const form = document.createElement("tg-form");

    const name = document.createElement("tg-text-box");
    name.setAttribute("name", "name");
    name.setAttribute("required", "");

    const notes = document.createElement("tg-text-area");
    notes.setAttribute("name", "notes");

    const accept = document.createElement("tg-check-box");
    accept.setAttribute("name", "accept");
    accept.setAttribute("required", "");

    form.append(name, notes, accept);
    connect(form);

    assert.equal(form.fields().length, 3);
    assert.equal(form.fieldNamed("notes"), notes);

    const invalids = recordEvents(form, "tg-invalid");
    const submits = recordEvents(form, "tg-submit");

    const refused = form.submit();
    assert.equal(refused.handled, false);
    assert.equal(refused.detail.reason, "invalid");
    assert.equal(refused.detail.errors.length, 2);
    assert.equal(invalids.events.length, 1);
    assert.equal(submits.events.length, 0);

    form.setValues({ name: "A name", notes: "Some notes", accept: true });
    const accepted = form.submit();

    assert.equal(accepted.handled, true);
    assert.equal(submits.events.length, 1);
    assert.deepEqual(accepted.detail.values, { name: "A name", notes: "Some notes", accept: true });

    invalids.stop();
    submits.stop();
    disconnect(form);
});

test("Form places an external error on the field it names", function ()
{
    const form = document.createElement("tg-form");
    const email = document.createElement("tg-text-box");
    email.setAttribute("name", "email");
    form.append(email);
    connect(form);

    assert.equal(form.setFieldError("email", "Already on file."), true);
    assert.equal(email.invalid, true);
    assert.equal(email.validationMessage, "Already on file.");

    assert.equal(form.setFieldError("absent", "No such field"), false);

    form.clearErrors();
    assert.equal(email.invalid, false);

    disconnect(form);
});

test("Form restores the values it was connected with", function ()
{
    const form = document.createElement("tg-form");
    const field = document.createElement("tg-text-box");
    field.setAttribute("name", "title");
    field.setAttribute("value", "original");
    form.append(field);
    connect(form);

    field.value = "changed";
    assert.equal(form.getValues().title, "changed");

    const resets = recordEvents(form, "tg-reset");
    form.reset();

    assert.equal(form.getValues().title, "original");
    assert.equal(resets.events.length, 1);

    resets.stop();
    disconnect(form);
});

test("Form does not claim a field belonging to a nested form", function ()
{
    const outer = document.createElement("tg-form");
    const outerField = document.createElement("tg-text-box");
    outerField.setAttribute("name", "outer");

    const inner = document.createElement("tg-form");
    const innerField = document.createElement("tg-text-box");
    innerField.setAttribute("name", "inner");
    inner.append(innerField);

    outer.append(outerField, inner);
    connect(outer);

    assert.deepEqual(Object.keys(outer.getValues()), ["outer"]);
    assert.deepEqual(Object.keys(inner.getValues()), ["inner"]);

    disconnect(outer);
});

// -----------------------------------------------------------------------------
// StatusMeter
// -----------------------------------------------------------------------------

test("StatusMeter reports progress and acknowledges a status", function ()
{
    const meter = make("tg-status-meter");
    const progress = recordEvents(meter, "tg-progress");
    const statuses = recordEvents(meter, "tg-status");

    meter.setProgress(25, 50);
    assert.equal(meter.percent, 50);
    assert.equal(progress.events.length, 1);
    assert.equal(meter.getElement("readout").textContent, "50%");

    meter.advance(25);
    assert.equal(meter.value, 50);
    assert.equal(meter.percent, 100);

    meter.setProgress(999, 50);
    assert.equal(meter.value, 50, "progress is clamped to the maximum");

    meter.report("error", "Two checks failed.");
    assert.equal(statuses.events.length, 1);
    assert.equal(meter.getElement("message").textContent, "Two checks failed.");

    assert.equal(meter.acknowledge().handled, false, "a meter that is not dismissible does not clear itself");
    assert.equal(meter.message, "Two checks failed.");

    meter.dismissible = true;
    const acknowledged = meter.acknowledge();

    assert.equal(acknowledged.handled, true);
    assert.equal(acknowledged.detail.message, "Two checks failed.", "the acknowledgement reports what was acknowledged");
    assert.equal(meter.message, "");
    assert.equal(meter.state, "idle");

    progress.stop();
    statuses.stop();
    disconnect(meter);
});
