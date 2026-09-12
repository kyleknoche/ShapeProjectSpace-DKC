import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom, loadModule } from "./support/environment.js";

/**
 * GEN 2 SUPPORT OBJECTS
 * =============================================================================
 * The two plain objects the control library shares: the keyed child reconciler
 * that gives the library its stable DOM identity, and the hierarchy model that
 * lets the two tree controls be siblings instead of one inheriting the other.
 *
 * Both are tested directly because both are the kind of code a later session
 * would be tempted to replace with something that clears a container and starts
 * again.
 */

installDom();

const { ChildReconciler } = await loadModule("src/gen2/support/ChildReconciler.js");
const { HierarchyModel } = await loadModule("src/gen2/support/HierarchyModel.js");

/**
 * Builds a reconciler over a fresh container with simple text rows.
 * @returns {{container: Element, reconciler: ChildReconciler, created: string[]}}
 */
function makeReconciler()
{
    const container = document.createElement("div");
    const created = [];

    function keyOf(item)
    {
        return item.id;
    }

    function create(item, key)
    {
        created.push(key);
        const node = document.createElement("div");
        node.dataset.key = key;
        return node;
    }

    function update(node, item)
    {
        node.textContent = item.label;
    }

    const reconciler = new ChildReconciler(container, { keyOf: keyOf, create: create, update: update });
    return { container: container, reconciler: reconciler, created: created };
}

test("the reconciler creates one node per key and keeps them in order", function ()
{
    const harness = makeReconciler();

    harness.reconciler.reconcile([
        { id: "a", label: "Alpha" },
        { id: "b", label: "Bravo" },
        { id: "c", label: "Charlie" }
    ]);

    assert.equal(harness.container.childNodes.length, 3);
    assert.deepEqual(harness.created, ["a", "b", "c"]);
    assert.deepEqual(harness.reconciler.keys(), ["a", "b", "c"]);
    assert.equal(harness.container.childNodes[1].textContent, "Bravo");
});

test("a second pass updates existing nodes instead of creating new ones", function ()
{
    const harness = makeReconciler();

    harness.reconciler.reconcile([ { id: "a", label: "Alpha" }, { id: "b", label: "Bravo" } ]);
    const nodeForA = harness.container.childNodes[0];

    harness.reconciler.reconcile([ { id: "a", label: "Alpha renamed" }, { id: "b", label: "Bravo" } ]);

    assert.equal(harness.created.length, 2, "nothing new should have been created");
    assert.equal(harness.container.childNodes[0], nodeForA);
    assert.equal(nodeForA.textContent, "Alpha renamed");
});

test("reordering moves the same nodes", function ()
{
    const harness = makeReconciler();

    harness.reconciler.reconcile([ { id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" } ]);
    const nodeForA = harness.reconciler.nodeForKey("a");
    const nodeForC = harness.reconciler.nodeForKey("c");

    harness.reconciler.reconcile([ { id: "c", label: "C" }, { id: "a", label: "A" }, { id: "b", label: "B" } ]);

    assert.equal(harness.created.length, 3);
    assert.equal(harness.container.childNodes[0], nodeForC);
    assert.equal(harness.container.childNodes[1], nodeForA);
    assert.deepEqual(harness.reconciler.keys(), ["c", "a", "b"]);
});

test("removed keys are detached and forgotten", function ()
{
    const harness = makeReconciler();

    harness.reconciler.reconcile([ { id: "a", label: "A" }, { id: "b", label: "B" } ]);
    const nodeForB = harness.reconciler.nodeForKey("b");

    harness.reconciler.reconcile([ { id: "a", label: "A" } ]);

    assert.equal(harness.container.childNodes.length, 1);
    assert.equal(nodeForB.parentNode, null);
    assert.equal(harness.reconciler.nodeForKey("b"), undefined);
    assert.equal(harness.reconciler.size, 1);
});

test("an empty list clears the container without losing the reconciler", function ()
{
    const harness = makeReconciler();

    harness.reconciler.reconcile([ { id: "a", label: "A" } ]);
    harness.reconciler.reconcile([]);

    assert.equal(harness.container.childNodes.length, 0);
    assert.equal(harness.reconciler.size, 0);

    harness.reconciler.reconcile([ { id: "a", label: "A again" } ]);
    assert.equal(harness.container.childNodes.length, 1);
    assert.equal(harness.created.length, 2, "a key that came back is genuinely new");
});

test("duplicate keys are refused rather than rendered", function ()
{
    const harness = makeReconciler();

    assert.throws(function ()
    {
        harness.reconciler.reconcile([ { id: "a", label: "One" }, { id: "a", label: "Two" } ]);
    }, /duplicate key/);
});

test("the reconciler refuses a factory that is missing a function", function ()
{
    const container = document.createElement("div");

    assert.throws(function ()
    {
        return new ChildReconciler(container, { keyOf: function keyOf() { return "x"; } });
    }, /keyOf, create and update/);
});

// -----------------------------------------------------------------------------
// HierarchyModel
// -----------------------------------------------------------------------------

const NODES =
[
    {
        id: "root",
        label: "Root",
        children:
        [
            { id: "a", label: "A" },
            { id: "b", label: "B", children: [ { id: "b1", label: "B1" } ] }
        ]
    },
    { id: "leaf", label: "Leaf" }
];

test("the hierarchy model indexes parentage and depth", function ()
{
    const model = new HierarchyModel();
    model.setNodes(NODES);

    assert.equal(model.has("b1"), true);
    assert.equal(model.parentIdOf("b1"), "b");
    assert.equal(model.parentIdOf("root"), "");
    assert.equal(model.depthOf("b1"), 2);
    assert.equal(model.depthOf("nope"), -1);
    assert.deepEqual(model.ancestorIdsOf("b1"), ["b", "root"]);
    assert.equal(model.hasChildren("root"), true);
    assert.equal(model.hasChildren("leaf"), false);
});

test("the hierarchy model flattens only what is expanded", function ()
{
    const model = new HierarchyModel();
    model.setNodes(NODES);

    assert.deepEqual(model.visibleIds(), ["root", "leaf"]);

    assert.equal(model.expand("root"), true);
    assert.equal(model.expand("root"), false, "expanding twice changes nothing");
    assert.deepEqual(model.visibleIds(), ["root", "a", "b", "leaf"]);

    model.reveal("b1");
    assert.deepEqual(model.visibleIds(), ["root", "a", "b", "b1", "leaf"]);

    assert.equal(model.collapse("b"), true);
    assert.deepEqual(model.visibleIds(), ["root", "a", "b", "leaf"]);

    model.collapseAll();
    assert.deepEqual(model.visibleIds(), ["root", "leaf"]);

    model.expandAll();
    assert.deepEqual(model.visibleIds(), ["root", "a", "b", "b1", "leaf"]);
});

test("the hierarchy model honours a node that asks to start expanded", function ()
{
    const model = new HierarchyModel();
    model.setNodes([ { id: "open", label: "Open", expanded: true, children: [ { id: "inner", label: "Inner" } ] } ]);

    assert.deepEqual(model.visibleIds(), ["open", "inner"]);
});

test("the hierarchy model keeps expansion for ids that survive and drops the rest", function ()
{
    const model = new HierarchyModel();
    model.setNodes(NODES);
    model.expandAll();

    model.setNodes([ { id: "root", label: "Root", children: [ { id: "a", label: "A" } ] } ]);

    assert.deepEqual(model.expandedIds, ["root"]);
    assert.equal(model.has("b1"), false);
});

test("the hierarchy model refuses duplicate ids", function ()
{
    const model = new HierarchyModel();

    assert.throws(function ()
    {
        model.setNodes([ { id: "x", label: "One" }, { id: "x", label: "Two" } ]);
    }, /duplicate node id/);
});

test("the hierarchy model tolerates nonsense in the node list", function ()
{
    const model = new HierarchyModel();

    model.setNodes(null);
    assert.deepEqual(model.visibleIds(), []);

    model.setNodes([ null, { label: "no id" }, { id: "good", label: "Good" } ]);
    assert.deepEqual(model.visibleIds(), ["good"]);
});

test("the hierarchy model holds no DOM and emits nothing", function ()
{
    const model = new HierarchyModel();
    model.setNodes(NODES);

    assert.equal(typeof model.addEventListener, "undefined", "the model must not be an event target");

    const rows = model.visibleRows();
    assert.equal(typeof rows[0].node, "object");
    assert.equal(rows[0].node.nodeType, undefined, "rows carry data, not elements");
});
