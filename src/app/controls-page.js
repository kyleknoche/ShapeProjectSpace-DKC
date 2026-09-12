import { registerGen2Controls } from "./registerGen2.js";

/**
 * APP - control gallery page
 * =============================================================================
 * Drives controls.html.
 *
 * This module imports the generic library and nothing else. There is no import
 * of src/gen3, no import of the project's data, and no application vocabulary
 * anywhere below this comment. That restriction is the whole argument of the
 * page: if the gallery needed Gen 3 in order to work, Gen 2 would not be
 * independent, and the architecture would be a story rather than a fact.
 *
 * tools/check-architecture.mjs enforces the restriction.
 */

registerGen2Controls();

const specimens = document.getElementById("specimens");
const monitorGrid = document.getElementById("monitor-grid");
const monitorMeter = document.getElementById("monitor-meter");
const monitorPause = document.getElementById("monitor-pause");

// -----------------------------------------------------------------------------
// Specimen data
// -----------------------------------------------------------------------------

const CADENCE_OPTIONS =
[
    { value: "daily", label: "Daily", description: "Every working day" },
    { value: "weekly", label: "Weekly" },
    { value: "change", label: "On change", description: "Whenever the input moves" },
    { value: "never", label: "Never", disabled: true }
];

const SCOPE_OPTIONS =
[
    { value: "narrow", label: "Narrow" },
    { value: "wide", label: "Wide" }
];

const MATERIAL_OPTIONS =
[
    { value: "paper", label: "Paper" },
    { value: "linen", label: "Linen" },
    { value: "card", label: "Card" },
    { value: "vellum", label: "Vellum", disabled: true }
];

const REPLACEMENT_OPTIONS =
[
    { value: "steel", label: "Steel" },
    { value: "brass", label: "Brass" },
    { value: "paper", label: "Paper" }
];

const PRIORITY_OPTIONS =
[
    { value: "low", label: "Low" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" }
];

const LIST_ITEMS =
[
    { value: "alpha", label: "Alpha", description: "First of the set", badge: "1" },
    { value: "bravo", label: "Bravo", description: "Second", badge: "2" },
    { value: "charlie", label: "Charlie", badge: "3" },
    { value: "delta", label: "Delta", description: "Unavailable", disabled: true },
    { value: "echo", label: "Echo", badge: "5" }
];

const TREE_NODES =
[
    {
        id: "documents",
        label: "Documents",
        icon: "+",
        expanded: true,
        badge: "3",
        children:
        [
            { id: "brief", label: "Brief" },
            { id: "estimate", label: "Estimate" },
            {
                id: "drafts",
                label: "Drafts",
                children:
                [
                    { id: "draft-one", label: "Draft one" },
                    { id: "draft-two", label: "Draft two" },
                    {
                        id: "archive",
                        label: "Archive",
                        children: [ { id: "draft-zero", label: "Draft zero" } ]
                    }
                ]
            }
        ]
    },
    {
        id: "resources",
        label: "Resources",
        icon: "+",
        children:
        [
            { id: "images", label: "Images", badge: "12" },
            { id: "fonts", label: "Fonts", disabled: true }
        ]
    },
    { id: "readme", label: "Read me first" }
];

const ALTERNATIVE_TREE_NODES =
[
    {
        id: "measures",
        label: "Measures",
        expanded: true,
        children:
        [
            { id: "length", label: "Length" },
            { id: "mass", label: "Mass" }
        ]
    },
    { id: "readme", label: "Read me first" }
];

const TREE_LIST_COLUMNS =
[
    { key: "label", title: "Name", width: "38%" },
    { key: "kind", title: "Kind", width: "18%" },
    { key: "count", title: "Items", width: "14%", align: "right", format: formatCount },
    { key: "changed", title: "Changed", width: "30%" }
];

const TREE_LIST_NODES =
[
    {
        id: "assembly",
        label: "Assembly",
        kind: "Group",
        count: 3,
        changed: "2 days ago",
        expanded: true,
        children:
        [
            { id: "frame", label: "Frame", kind: "Part", count: 1, changed: "2 days ago" },
            { id: "panel", label: "Panel", kind: "Part", count: 4, changed: "last week" },
            {
                id: "fittings",
                label: "Fittings",
                kind: "Group",
                count: 2,
                changed: "today",
                children:
                [
                    { id: "hinge", label: "Hinge", kind: "Part", count: 8, changed: "today" },
                    { id: "catch", label: "Catch", kind: "Part", count: 2, changed: "today" }
                ]
            }
        ]
    },
    { id: "packaging", label: "Packaging", kind: "Group", count: 0, changed: "never" }
];

const GRID_COLUMNS =
[
    { key: "name", title: "Name", width: "34%", sortable: true },
    { key: "kind", title: "Kind", width: "18%", sortable: true },
    { key: "size", title: "Size", width: "16%", align: "right", sortable: true, format: formatBytes },
    { key: "changed", title: "Changed", width: "32%", sortable: true }
];

/**
 * Columns for the event monitor.
 */
const MONITOR_COLUMNS =
[
    { key: "sequence", title: "#", width: "10%", align: "right" },
    { key: "type", title: "Event", width: "34%" },
    { key: "source", title: "From", width: "28%" },
    { key: "summary", title: "Detail", width: "28%" }
];

const GRID_ROWS =
[
    { id: "r1", name: "annual-report", kind: "Document", size: 482000, changed: "2 days ago" },
    { id: "r2", name: "site-plan", kind: "Drawing", size: 1290000, changed: "last week" },
    { id: "r3", name: "notes", kind: "Text", size: 4100, changed: "today" },
    { id: "r4", name: "elevation", kind: "Drawing", size: 903000, changed: "a month ago" },
    { id: "r5", name: "schedule", kind: "Table", size: 22400, changed: "yesterday" }
];

/**
 * Column formatter for byte counts.
 * @param {number} value
 * @returns {string}
 */
function formatBytes(value)
{
    if (typeof value !== "number")
    {
        return "";
    }

    if (value < 1024)
    {
        return String(value) + " B";
    }

    if (value < 1024 * 1024)
    {
        return String(Math.round(value / 1024)) + " kB";
    }

    return (value / (1024 * 1024)).toFixed(1) + " MB";
}

/**
 * Column formatter that hides zero counts.
 * @param {number} value
 * @returns {string}
 */
function formatCount(value)
{
    if (typeof value !== "number" || value === 0)
    {
        return "";
    }

    return String(value);
}

// -----------------------------------------------------------------------------
// Specimen configuration
// -----------------------------------------------------------------------------

const textBox = document.getElementById("demo-text-box");
const checkBox = document.getElementById("demo-check-box");
const radioGroup = document.getElementById("demo-radio-group");
const radioHorizontal = document.getElementById("demo-radio-horizontal");
const radioDisabled = document.getElementById("demo-radio-disabled");
const dropDown = document.getElementById("demo-drop-down");
const dropDownDisabled = document.getElementById("demo-drop-down-disabled");
const listBox = document.getElementById("demo-list-box");
const listMulti = document.getElementById("demo-list-multi");
const listEmpty = document.getElementById("demo-list-empty");
const tree = document.getElementById("demo-tree");
const treeDisabled = document.getElementById("demo-tree-disabled");
const treeList = document.getElementById("demo-tree-list");
const grid = document.getElementById("demo-grid");
const image = document.getElementById("demo-image");
const panel = document.getElementById("demo-panel");
const form = document.getElementById("demo-form");
const formPriority = document.getElementById("form-priority");
const formCadence = document.getElementById("form-cadence");
const meter = document.getElementById("demo-meter");
const busyButton = document.getElementById("busy-button");

radioGroup.items = CADENCE_OPTIONS;
radioGroup.value = "weekly";
radioHorizontal.items = SCOPE_OPTIONS;
radioHorizontal.value = "narrow";
radioDisabled.items = SCOPE_OPTIONS;
radioDisabled.value = "wide";

dropDown.items = MATERIAL_OPTIONS;
dropDownDisabled.items = MATERIAL_OPTIONS;
dropDownDisabled.value = "linen";

listBox.items = LIST_ITEMS;
listBox.value = "bravo";
listMulti.items = LIST_ITEMS;
listMulti.values = ["alpha", "charlie"];
listEmpty.items = [];

tree.setNodes(TREE_NODES);
tree.selectNode("brief");
treeDisabled.setNodes(ALTERNATIVE_TREE_NODES);

treeList.setColumns(TREE_LIST_COLUMNS);
treeList.setNodes(TREE_LIST_NODES);

grid.setColumns(GRID_COLUMNS);
grid.setRows(GRID_ROWS);

image.src = "assets/img/specimen.svg";

formPriority.items = PRIORITY_OPTIONS;
formCadence.items = SCOPE_OPTIONS;

monitorGrid.setColumns(MONITOR_COLUMNS);
monitorGrid.setRows([]);

// -----------------------------------------------------------------------------
// The event monitor
// -----------------------------------------------------------------------------

/**
 * Event types the monitor records. Everything the Gen-2 library emits.
 */
const MONITORED_EVENTS =
[
    "tg-action",
    "tg-change",
    "tg-input",
    "tg-highlight",
    "tg-expand",
    "tg-collapse",
    "tg-sort",
    "tg-submit",
    "tg-invalid",
    "tg-reset",
    "tg-toggle",
    "tg-load",
    "tg-error",
    "tg-progress",
    "tg-status"
];

const MONITOR_LIMIT = 120;

let monitorSequence = 0;
let monitorRows = [];

/**
 * Records one event.
 * @param {CustomEvent} event
 */
function handleMonitoredEvent(event)
{
    if (monitorPause.checked === true)
    {
        return;
    }

    monitorSequence = monitorSequence + 1;

    const row =
    {
        id: "event-" + String(monitorSequence),
        sequence: monitorSequence,
        type: event.type,
        source: describeSource(event),
        summary: describeDetail(event.detail)
    };

    monitorRows = [row].concat(monitorRows).slice(0, MONITOR_LIMIT);
    monitorGrid.setRows(monitorRows);
    monitorMeter.setProgress(monitorRows.length, MONITOR_LIMIT);
    monitorMeter.report(monitorRows.length >= MONITOR_LIMIT ? "warning" : "busy", "");
}

/**
 * @param {Event} event
 * @returns {string}
 */
function describeSource(event)
{
    const target = event.target;

    if (target === null)
    {
        return "";
    }

    if (typeof target.elementId === "string")
    {
        return target.elementId;
    }

    return target.tagName.toLowerCase();
}

/**
 * Renders an event detail as one short line.
 * @param {*} detail
 * @returns {string}
 */
function describeDetail(detail)
{
    if (detail === null || detail === undefined)
    {
        return "";
    }

    if (typeof detail !== "object")
    {
        return String(detail);
    }

    const interesting = ["action", "handled", "value", "checked", "id", "key", "state", "percent", "collapsed", "src"];
    const parts = [];

    for (let index = 0; index < interesting.length; index = index + 1)
    {
        const name = interesting[index];

        if (detail[name] === undefined || parts.length >= 3)
        {
            continue;
        }

        parts.push(name + "=" + shorten(detail[name]));
    }

    return parts.join(" ");
}

/**
 * @param {*} value
 * @returns {string}
 */
function shorten(value)
{
    if (value === null || value === undefined)
    {
        return "";
    }

    if (typeof value === "object")
    {
        return "{...}";
    }

    const text = String(value);
    return text.length > 18 ? text.slice(0, 17) + "…" : text;
}

for (let index = 0; index < MONITORED_EVENTS.length; index = index + 1)
{
    specimens.addEventListener(MONITORED_EVENTS[index], handleMonitoredEvent);
}

// -----------------------------------------------------------------------------
// Commands. Every demonstration button carries a command attribute, and one
// named handler routes it through a table of named functions. No inline
// callbacks, and one place to look when a button misbehaves.
// -----------------------------------------------------------------------------

function fillTextBox()
{
    textBox.value = "Set from script";
}

function commitTextBox()
{
    textBox.commit();
}

function errorTextBox()
{
    textBox.setValidationMessage("An external check rejected this value.");
}

function clearTextBox()
{
    textBox.clear();
}

function toggleCheckBox()
{
    checkBox.toggle();
}

function checkCheckBox()
{
    checkBox.check();
}

function uncheckCheckBox()
{
    checkBox.uncheck();
}

function selectThirdRadio()
{
    radioGroup.selectValue("change");
}

function clearRadio()
{
    radioGroup.clearSelection();
}

function replaceDropDownOptions()
{
    dropDown.items = REPLACEMENT_OPTIONS;
}

function selectDropDownValue()
{
    dropDown.selectValue("paper");
}

let addedListItems = 0;

function addListItem()
{
    addedListItems = addedListItems + 1;
    const next = listBox.items;
    next.push({ value: "added-" + String(addedListItems), label: "Added " + String(addedListItems), badge: "new" });
    listBox.items = next;
}

function removeFirstListItem()
{
    const next = listBox.items;
    next.shift();
    listBox.items = next;
}

function selectTwoListItems()
{
    listMulti.selectValues(["bravo", "echo"]);
}

function clearListSelection()
{
    listBox.clearSelection();
    listMulti.clearSelection();
}

function toggleListDisabled()
{
    listBox.disabled = listBox.disabled === false;
}

function expandTree()
{
    tree.expandAll();
}

function collapseTree()
{
    tree.collapseAll();
}

function revealTreeNode()
{
    tree.revealNode("draft-zero");
    tree.selectNode("draft-zero");
}

function replaceTreeData()
{
    const current = tree.nodes;
    tree.setNodes(current.length === TREE_NODES.length ? ALTERNATIVE_TREE_NODES : TREE_NODES);
}

function expandTreeList()
{
    treeList.expandAll();
}

function collapseTreeList()
{
    treeList.collapseAll();
}

function dropTreeListColumn()
{
    const columns = treeList.columns;
    treeList.setColumns(columns.length === TREE_LIST_COLUMNS.length ? TREE_LIST_COLUMNS.slice(0, 2) : TREE_LIST_COLUMNS);
}

function toggleTreeListHeader()
{
    treeList.showHeader = treeList.showHeader === false;
}

function sortGridBySize()
{
    grid.sortBy("size");
}

let addedGridRows = 0;

function addGridRow()
{
    addedGridRows = addedGridRows + 1;
    const rows = grid.rows;
    rows.push(
    {
        id: "added-" + String(addedGridRows),
        name: "appendix-" + String(addedGridRows),
        kind: "Document",
        size: 1000 * addedGridRows,
        changed: "just now"
    });
    grid.setRows(rows);
}

function removeGridRow()
{
    const rows = grid.rows;
    rows.pop();
    grid.setRows(rows);
}

function emptyGrid()
{
    grid.setRows([]);
}

function restoreGrid()
{
    grid.setRows(GRID_ROWS);
}

function loadImage()
{
    image.src = "assets/img/specimen.svg";
}

function breakImage()
{
    image.src = "assets/img/this-file-does-not-exist.png";
}

function clearImage()
{
    image.src = "";
}

function collapsePanel()
{
    panel.collapse();
}

function expandPanel()
{
    panel.expand();
}

function appendPanelContent()
{
    const line = document.createElement("p");
    line.className = "specimen__note";
    line.textContent = "Appended at " + new Date().toLocaleTimeString() + ".";
    panel.appendContent(line);
}

function fillForm()
{
    form.setValues(
    {
        title: "A complete submission",
        email: "reader@example.com",
        priority: "high",
        cadence: "wide",
        body: "Filled in from script through the field contract.",
        accept: true
    });
}

function validateForm()
{
    const outcome = form.validate();
    form.noticeState = outcome.valid === true ? "success" : "error";
    form.noticeText = outcome.valid === true ? "Every field passed." : String(outcome.errors.length) + " field(s) need attention.";
}

function setFormFieldError()
{
    form.setFieldError("email", "That address is already on file.");
}

function submitForm()
{
    form.submit();
}

/**
 * What submission means is the page's decision, not the control's. Form emits a
 * cancelable tg-submit and says nothing about the outcome, because it cannot
 * know it; this handler is where a real application would send something.
 * @param {CustomEvent} event
 */
function handleFormSubmitted(event)
{
    const count = Object.keys(event.detail.values).length;
    form.noticeState = "success";
    form.noticeText = "Accepted " + String(count) + " values. Nothing was sent: this page has no server.";
}

function advanceMeter()
{
    meter.advance(12);
}

function warnMeter()
{
    meter.report("warning", "Something wants attention.");
}

function acknowledgeMeter()
{
    meter.acknowledge();
}

function resetMeter()
{
    meter.reset();
}

function startBusyButton()
{
    busyButton.busy = true;
    window.setTimeout(finishBusyButton, 1000);
}

function finishBusyButton()
{
    busyButton.busy = false;
}

function clearMonitor()
{
    monitorRows = [];
    monitorSequence = 0;
    monitorGrid.setRows([]);
    monitorMeter.reset();
}

/**
 * Command name to the function that performs it.
 */
const COMMANDS =
{
    "textbox-fill": fillTextBox,
    "textbox-commit": commitTextBox,
    "textbox-error": errorTextBox,
    "textbox-clear": clearTextBox,
    "check-toggle": toggleCheckBox,
    "check-on": checkCheckBox,
    "check-off": uncheckCheckBox,
    "radio-third": selectThirdRadio,
    "radio-clear": clearRadio,
    "dropdown-replace": replaceDropDownOptions,
    "dropdown-select": selectDropDownValue,
    "list-add": addListItem,
    "list-remove": removeFirstListItem,
    "list-select-two": selectTwoListItems,
    "list-clear": clearListSelection,
    "list-disable": toggleListDisabled,
    "tree-expand": expandTree,
    "tree-collapse": collapseTree,
    "tree-reveal": revealTreeNode,
    "tree-replace": replaceTreeData,
    "treelist-expand": expandTreeList,
    "treelist-collapse": collapseTreeList,
    "treelist-columns": dropTreeListColumn,
    "treelist-header": toggleTreeListHeader,
    "grid-sort": sortGridBySize,
    "grid-add": addGridRow,
    "grid-remove": removeGridRow,
    "grid-empty": emptyGrid,
    "grid-restore": restoreGrid,
    "image-load": loadImage,
    "image-break": breakImage,
    "image-clear": clearImage,
    "panel-collapse": collapsePanel,
    "panel-expand": expandPanel,
    "panel-append": appendPanelContent,
    "form-fill": fillForm,
    "form-validate": validateForm,
    "form-error": setFormFieldError,
    "form-submit": submitForm,
    "meter-advance": advanceMeter,
    "meter-warn": warnMeter,
    "meter-ack": acknowledgeMeter,
    "meter-reset": resetMeter,
    "button-busy": startBusyButton
};

/**
 * Routes a button's action to its command function.
 * @param {CustomEvent} event
 */
function handleCommandAction(event)
{
    const result = event.detail;

    if (result === null || result.action !== "invoke" || result.handled === false)
    {
        return;
    }

    const command = result.detail === null ? "" : result.detail.command;
    const runner = COMMANDS[command];

    if (runner === undefined)
    {
        return;
    }

    runner();
}

/**
 * The monitor's own Clear button lives outside the specimen container, so it is
 * routed separately.
 * @param {CustomEvent} event
 */
function handleMonitorAction(event)
{
    const result = event.detail;

    if (result === null || result.action !== "invoke")
    {
        return;
    }

    if (result.detail !== null && result.detail.command === "monitor-clear")
    {
        clearMonitor();
    }
}

form.addEventListener("tg-submit", handleFormSubmitted);
specimens.addEventListener("tg-action", handleCommandAction);
document.querySelector(".gallery__monitor").addEventListener("tg-action", handleMonitorAction);
