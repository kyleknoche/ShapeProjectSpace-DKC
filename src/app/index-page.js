import { registerGen2Controls } from "./registerGen2.js";
import { registerGen3Elements } from "./registerGen3.js";
import { ShapeSpaceState } from "../gen3/ShapeSpaceState.js";
import { SHELF_BOOKS } from "../gen3/data/projectSpace.js";

/**
 * APP - index page
 * =============================================================================
 * Wiring for the public Shape Project Space page.
 *
 * What a page script is allowed to be
 *   A page script connects objects to each other. It owns the shared state, it
 *   routes events between elements, and it owns the address bar. It does not
 *   contain control behaviour, it does not build widget DOM, and it does not
 *   reach inside another object's owned elements. If something here started
 *   looking like a control, it would mean a Gen-3 class was missing.
 *
 * Ownership
 *   This module constructs the one ShapeSpaceState for the page and hands it to
 *   the status readout. Nothing else is shared and nothing is global.
 */

registerGen2Controls();
registerGen3Elements();

const state = new ShapeSpaceState();

const bookshelf = document.getElementById("bookshelf");
const reader = document.getElementById("reader");
const board = document.getElementById("board");
const projectTree = document.getElementById("project-tree");
const artifactGrid = document.getElementById("artifact-grid");
const inventoryFilter = document.getElementById("inventory-filter");
const contactForm = document.getElementById("contact-form");
const statusReadout = document.getElementById("status-readout");

statusReadout.bindState(state);

/**
 * Subjects offered by the contact form. Page-level content, so it is set here
 * rather than hard-wired into the control.
 */
const CONTACT_SUBJECTS =
[
    { value: "pattern", label: "The Three-Gen pattern" },
    { value: "library", label: "The control library" },
    { value: "method", label: "MBS++ and method" },
    { value: "notation", label: "ShapeScript" },
    { value: "correction", label: "Something here is wrong" }
];

const subjectField = contactForm.fieldNamed("subject");

if (subjectField !== null)
{
    subjectField.items = CONTACT_SUBJECTS;
}

// -----------------------------------------------------------------------------
// Event routing. Every handler is a named function, so a stack trace says what
// happened rather than pointing at an anonymous arrow.
// -----------------------------------------------------------------------------

function handleNavigate(event)
{
    const section = event.detail.section;
    reader.showSection(section);
    state.set("section", section, "bookshelf");
    writeHash(section);
}

function handleSectionChange(event)
{
    state.set("section", event.detail.id, "reader");
}

function handleBoardSelect(event)
{
    state.set("boardNodeId", event.detail.id, "board");
    state.set("lastAction", event.detail.id === "" ? "" : "board: " + event.detail.id, "board");
}

function handleAreaChange(event)
{
    state.set("projectAreaId", event.detail.id, "tree");
    state.set("lastAction", "area: " + event.detail.path.join(" / "), "tree");
}

function handleArtifactOpen(event)
{
    const artifact = event.detail.artifact;

    if (artifact === null)
    {
        return;
    }

    state.set("lastAction", "artifact: " + artifact.name, "grid");
}

function handleGenerationFilter(event)
{
    artifactGrid.generationFilter = event.detail.generation;
}

function handleContactComposed(event)
{
    state.set("lastAction", "message composed", "contact");
}

function handleHashChange(event)
{
    applyHash();
}

bookshelf.addEventListener("shape-navigate", handleNavigate);
reader.addEventListener("shape-section-change", handleSectionChange);
board.addEventListener("shape-board-select", handleBoardSelect);
projectTree.addEventListener("shape-area-change", handleAreaChange);
artifactGrid.addEventListener("shape-artifact-open", handleArtifactOpen);
inventoryFilter.addEventListener("shape-generation-filter", handleGenerationFilter);
contactForm.addEventListener("shape-contact-composed", handleContactComposed);
window.addEventListener("hashchange", handleHashChange);

// -----------------------------------------------------------------------------
// Addresses. Routing is an application concern and lives at Gen 3, never below.
// -----------------------------------------------------------------------------

/**
 * @param {string} section
 */
function writeHash(section)
{
    const wanted = "#" + section;

    if (window.location.hash !== wanted)
    {
        window.history.replaceState(null, "", wanted);
    }
}

/**
 * Reads the address bar and shows whatever section it names.
 */
function applyHash()
{
    const requested = window.location.hash.replace("#", "");
    const section = isKnownSection(requested) === true ? requested : SHELF_BOOKS[0].value;

    bookshelf.showSection(section);
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isKnownSection(value)
{
    for (let index = 0; index < SHELF_BOOKS.length; index = index + 1)
    {
        if (SHELF_BOOKS[index].value === value)
        {
            return true;
        }
    }

    return false;
}

applyHash();
