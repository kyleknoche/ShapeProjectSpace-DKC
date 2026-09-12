import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom, loadModule, connect, disconnect, recordEvents } from "./support/environment.js";

/**
 * GEN 3 ARCHITECTURE AND BEHAVIOUR
 * =============================================================================
 * The application layer keeps its side of the bargain: it inherits the generic
 * layer, it specialises rather than duplicates, and the reference page's claims
 * about lineage are true of the running code.
 */

installDom();

const { AbstractElement } = await loadModule("src/gen1/AbstractElement.js");
const { GEN2_CONTROLS } = await loadModule("src/gen2/index.js");
const gen3 = await loadModule("src/gen3/index.js");
const lineage = await loadModule("src/gen3/data/lineage.js");
const projectData = await loadModule("src/gen3/data/projectSpace.js");

const { registerGen2Controls } = await loadModule("src/app/registerGen2.js");
const { registerGen3Elements } = await loadModule("src/app/registerGen3.js");

registerGen2Controls();
registerGen3Elements();

const GEN3_ELEMENTS = gen3.GEN3_ELEMENTS;

/**
 * The line separator, named so that source-scanning tests read clearly.
 */
const LINE_BREAK = String.fromCharCode(10);

// -----------------------------------------------------------------------------
// Lineage
// -----------------------------------------------------------------------------

test("every application element inherits a generic control", function ()
{
    for (let index = 0; index < GEN3_ELEMENTS.length; index = index + 1)
    {
        const elementClass = GEN3_ELEMENTS[index];
        const base = Object.getPrototypeOf(elementClass);

        assert.ok(GEN2_CONTROLS.indexOf(base) >= 0, elementClass.name + " extends " + base.name + ", which is not a Gen-2 control");
        assert.ok(elementClass.prototype instanceof AbstractElement);
        assert.equal(lineage.distanceFromFoundation(elementClass), 2, elementClass.name + " must sit exactly two steps below the foundation");
        assert.equal(lineage.generationLabelOf(elementClass), "Gen 3");
    }
});

test("the lineage inspector reports no violations, which is what the reference page shows", function ()
{
    const violations = lineage.findLineageViolations(GEN3_ELEMENTS, GEN2_CONTROLS);
    assert.deepEqual(violations, []);
});

test("the lineage inspector would notice a broken lineage", function ()
{
    class Impostor extends AbstractElement
    {
        abstractAction()
        {
            return { action: "nothing", handled: false };
        }
    }

    const violations = lineage.findLineageViolations([Impostor], GEN2_CONTROLS);

    assert.equal(violations.length, 1);
    assert.match(violations[0].problem, /not a Gen-2 control/);
});

test("generation is computed from inheritance, not from a folder name", function ()
{
    assert.equal(lineage.generationLabelOf(AbstractElement), "Gen 1");
    assert.equal(lineage.generationLabelOf(GEN2_CONTROLS[0]), "Gen 2");
    assert.equal(lineage.classLineage(gen3.ShapeProjectTree).join(" > "), "HTMLElement > AbstractElement > TreeView > ShapeProjectTree");
});

test("every application element declares a namespaced tag and is registered", function ()
{
    for (let index = 0; index < GEN3_ELEMENTS.length; index = index + 1)
    {
        const elementClass = GEN3_ELEMENTS[index];

        assert.match(elementClass.elementName, /^shape-[a-z-]+$/);
        assert.equal(customElements.get(elementClass.elementName), elementClass);
    }
});

test("application elements extend their base rather than replacing it", async function ()
{
    const { readFileSync } = await import("node:fs");

    for (let index = 0; index < GEN3_ELEMENTS.length; index = index + 1)
    {
        const elementClass = GEN3_ELEMENTS[index];
        const source = readFileSync(new URL("../src/gen3/" + elementClass.name + ".js", import.meta.url), "utf8");

        const overridesBuild = source.indexOf("buildElements()") >= 0;

        if (overridesBuild === true)
        {
            assert.ok(source.indexOf("super.buildElements()") >= 0, elementClass.name + " overrides buildElements without calling super, which discards the control it inherited");
        }

        if (source.indexOf("syncElements()") >= 0)
        {
            assert.ok(source.indexOf("super.syncElements()") >= 0, elementClass.name + " overrides syncElements without calling super");
        }

        if (source.indexOf("bindEvents()") >= 0)
        {
            assert.ok(source.indexOf("super.bindEvents()") >= 0, elementClass.name + " overrides bindEvents without calling super");
        }
    }
});

test("the application layer stays smaller than the generic layer it binds", async function ()
{
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    /**
     * Counts the lines of every JavaScript file directly inside a folder.
     * @param {string} folder
     * @returns {number}
     */
    function linesIn(folder)
    {
        const directory = fileURLToPath(new URL("../src/" + folder + "/", import.meta.url));
        const entries = readdirSync(directory);
        let total = 0;

        for (let index = 0; index < entries.length; index = index + 1)
        {
            const entry = entries[index];
            const path = join(directory, entry);

            if (statSync(path).isDirectory() === true || entry.endsWith(".js") === false || entry === "index.js")
            {
                continue;
            }

            total = total + readFileSync(path, "utf8").split(LINE_BREAK).length;
        }

        return total;
    }

    const gen2Lines = linesIn("gen2");
    const gen3Lines = linesIn("gen3");

    assert.ok(
        gen3Lines < gen2Lines,
        "the application layer is " + gen3Lines + " lines against " + gen2Lines + " generic lines; Gen 3 binds, it does not rebuild");

    assert.ok(
        gen3Lines < gen2Lines * 0.6,
        "Gen 3 has grown to " + Math.round(gen3Lines / gen2Lines * 100) + "% of Gen 2; check what it has started re-implementing");
});

test("the shared state object is not an element and not a global", function ()
{
    assert.equal(GEN3_ELEMENTS.indexOf(gen3.ShapeSpaceState), -1);
    assert.equal(customElements.get("shape-space-state"), undefined);

    const first = new gen3.ShapeSpaceState();
    const second = new gen3.ShapeSpaceState();

    first.set("section", "board", "test");

    assert.equal(first.section, "board");
    assert.equal(second.section, "overview", "two state objects must not share anything");
});

// -----------------------------------------------------------------------------
// Behaviour
// -----------------------------------------------------------------------------

test("the bookshelf navigates in the project's own vocabulary", function ()
{
    const shelf = connect(document.createElement("shape-bookshelf"));

    assert.equal(shelf.items.length, projectData.SHELF_BOOKS.length);
    assert.equal(shelf.orientation, "horizontal");
    assert.equal(shelf.currentSection, projectData.SHELF_BOOKS[0].value);

    const navigations = recordEvents(shelf, "shape-navigate");
    const result = shelf.showSection("three-gen");

    assert.equal(result.handled, true);
    assert.equal(result.detail.section, "three-gen");
    assert.equal(navigations.events.length, 1);
    assert.equal(navigations.events[0].detail.book.label, "Three-Gen");

    navigations.stop();
    disconnect(shelf);
});

test("the board selects a node without redrawing the graph", function ()
{
    const board = connect(document.createElement("shape-board"));

    const nodeLayer = board.getElement("nodeLayer");
    const edgeLayer = board.getElement("edgeLayer");

    assert.equal(nodeLayer.childNodes.length, projectData.BOARD_TOPOLOGY.nodes.length);
    assert.equal(edgeLayer.childNodes.length, projectData.BOARD_TOPOLOGY.edges.length);

    const firstNode = nodeLayer.firstChild;
    const selections = recordEvents(board, "shape-board-select");

    const result = board.selectNode("mbs");

    assert.equal(result.action, "select-node");
    assert.equal(result.handled, true);
    assert.equal(board.selectedNodeId, "mbs");
    assert.equal(selections.events.length, 1);
    assert.equal(nodeLayer.firstChild, firstNode, "selecting must not redraw the board");
    assert.ok(result.detail.edges.length > 0, "the board reports the edges that touch the selection");

    assert.equal(board.selectNode("not-a-node").handled, false);

    selections.stop();
    disconnect(board);
});

test("the board still answers the action it inherited", function ()
{
    const board = connect(document.createElement("shape-board"));

    assert.equal(board.performAction().action, "toggle", "with no node in the payload it is a panel");
    assert.equal(board.performAction().handled, false, "and it is not collapsible by default");

    board.collapsible = true;
    assert.equal(board.toggleCollapsed().handled, true);
    assert.equal(board.collapsed, true);

    disconnect(board);
});

test("the project tree reports the path to an area", function ()
{
    const tree = connect(document.createElement("shape-project-tree"));
    const changes = recordEvents(tree, "shape-area-change");

    const result = tree.showArea("method-checks");

    assert.equal(result.handled, true);
    assert.deepEqual(result.detail.path, ["Method", "Architecture checks"]);
    assert.equal(changes.events.length, 1);
    assert.equal(tree.currentAreaId, "method-checks");

    changes.stop();
    disconnect(tree);
});

test("the artifact grid filters the inventory by generation", function ()
{
    const grid = connect(document.createElement("shape-artifact-grid"));

    assert.equal(grid.rows.length, projectData.ARTIFACTS.length);
    assert.equal(grid.countFor("Gen 1"), 1);
    assert.equal(grid.countFor("Gen 2"), GEN2_CONTROLS.length);
    assert.equal(grid.countFor("Gen 3"), GEN3_ELEMENTS.length);

    grid.generationFilter = "Gen 3";
    assert.equal(grid.rows.length, GEN3_ELEMENTS.length);

    grid.generationFilter = "";
    assert.equal(grid.rows.length, projectData.ARTIFACTS.length);

    const opens = recordEvents(grid, "shape-artifact-open");
    grid.activateRow("TreeView");

    assert.equal(opens.events.length, 1);
    assert.equal(opens.events[0].detail.artifact.generation, "Gen 2");

    opens.stop();
    disconnect(grid);
});

test("the lineage view displays the real class hierarchy", function ()
{
    const view = connect(document.createElement("shape-lineage-view"));
    const verbs = lineage.probeActionVerbs(GEN2_CONTROLS);

    view.setClasses(GEN2_CONTROLS, GEN3_ELEMENTS, verbs);

    const expectedRows = 2 + GEN2_CONTROLS.length + GEN3_ELEMENTS.length;
    assert.equal(view.visibleNodeIds().length, expectedRows);
    assert.equal(view.lineageOf("TreeView"), "HTMLElement > AbstractElement > TreeView");
    assert.equal(view.getNode("Panel").generation, "Gen 2");
    assert.equal(view.getNode("ShapeBoard").generation, "Gen 3");
    assert.equal(view.getNode("TextBox").action, "commit", "the verb shown is the verb the control returns");

    view.generationFilter = "Gen 2";
    assert.equal(view.getNode("ShapeBoard"), null, "filtering to Gen 2 removes the application rows");
    assert.ok(view.getNode("Panel") !== null);

    disconnect(view);
});

test("the probe reports the verb each class actually returns", function ()
{
    const verbs = lineage.probeActionVerbs(GEN2_CONTROLS.concat(GEN3_ELEMENTS));

    assert.equal(verbs.Button, "invoke");
    assert.equal(verbs.TextBox, "commit");
    assert.equal(verbs.TreeView, "activate");
    assert.equal(verbs.Form, "submit");
    assert.equal(verbs.StatusMeter, "acknowledge");
    assert.equal(verbs.ShapeBookshelf, "activate");
    assert.equal(verbs.ShapeMark, "resolve");
});

test("the status label follows shared state and lets go of it on disconnect", function ()
{
    const state = new gen3.ShapeSpaceState();
    const label = connect(document.createElement("shape-status-label"));

    label.bindState(state);
    assert.match(label.text, /Section: overview/);

    state.set("section", "board", "test");
    assert.match(label.text, /Section: board/);

    state.set("boardNodeId", "mbs", "test");
    assert.match(label.text, /Board: mbs/);

    disconnect(label);
    assert.equal(label.managedListenerCount, 0, "the state subscription must be released like any other listener");

    state.set("section", "contact", "test");
    assert.match(label.text, /Section: board/, "a disconnected label must stop following the state");
});

test("the section reader shows one section and announces the change", function ()
{
    const reader = connect(document.createElement("shape-section-reader"));

    assert.equal(reader.sectionId, "overview");
    assert.equal(reader.heading, projectData.SECTIONS.overview.heading);

    const prose = reader.getElement("prose");
    assert.equal(prose.childNodes.length, projectData.SECTIONS.overview.paragraphs.length);

    const firstParagraph = prose.firstChild;
    const changes = recordEvents(reader, "shape-section-change");

    const result = reader.showSection("board");

    assert.equal(result.action, "show-section");
    assert.equal(result.handled, true);
    assert.equal(reader.heading, projectData.SECTIONS.board.heading);
    assert.equal(changes.events.length, 1);
    assert.equal(prose.firstChild, firstParagraph, "changing section rewrites paragraphs, it does not rebuild them");

    assert.equal(reader.showSection("not-a-section").handled, false);

    changes.stop();
    disconnect(reader);
});

test("the contact form composes a message and says plainly that nothing was sent", function ()
{
    const form = document.createElement("shape-contact-form");

    const name = document.createElement("tg-text-box");
    name.setAttribute("name", "name");
    name.setAttribute("required", "");

    const message = document.createElement("tg-text-area");
    message.setAttribute("name", "message");
    message.setAttribute("required", "");

    form.append(name, message);
    connect(form);

    assert.equal(form.submit().handled, false, "an empty required form cannot be submitted");

    form.setValues({ name: "A reader", message: "The pattern holds." });

    const composed = recordEvents(form, "shape-contact-composed");
    const result = form.submit();

    assert.equal(result.handled, true);
    assert.equal(result.detail.transmitted, false);
    assert.match(result.detail.message, /name: A reader/);
    assert.equal(composed.events.length, 1);
    assert.match(form.noticeText, /nothing was sent/i);

    composed.stop();
    disconnect(form);
});

test("the generation filter announces a generation", function ()
{
    const filter = connect(document.createElement("shape-generation-filter"));

    assert.equal(filter.items.length, 4);

    const filters = recordEvents(filter, "shape-generation-filter");
    filter.generation = "Gen 2";

    assert.equal(filter.generation, "Gen 2");
    assert.equal(filters.events.length, 1);
    assert.equal(filters.events[0].detail.generation, "Gen 2");

    filters.stop();
    disconnect(filter);
});

test("the mark resolves the project image", function ()
{
    const mark = connect(document.createElement("shape-mark"));

    assert.equal(mark.src, "assets/img/shape-mark.svg");
    assert.equal(mark.loadState, "loading");
    assert.match(mark.alt, /splines/);
    assert.equal(mark.markSize, "mark");

    mark.markSize = "large";
    assert.equal(mark.dataset.markSize, "large");

    disconnect(mark);
});

test("the project inventory describes files that exist", async function ()
{
    const { existsSync } = await import("node:fs");

    for (let index = 0; index < projectData.ARTIFACTS.length; index = index + 1)
    {
        const artifact = projectData.ARTIFACTS[index];
        const path = new URL("../" + artifact.file, import.meta.url);

        assert.equal(existsSync(path), true, artifact.name + " is listed at " + artifact.file + ", which does not exist");
    }
});
