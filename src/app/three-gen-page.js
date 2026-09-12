import { registerGen2Controls } from "./registerGen2.js";
import { registerGen3Elements } from "./registerGen3.js";
import { GEN2_CONTROLS } from "../gen2/index.js";
import { GEN3_ELEMENTS } from "../gen3/index.js";
import { findLineageViolations, probeActionVerbs, generationLabelOf, classLineage } from "../gen3/data/lineage.js";

/**
 * APP - Three-Gen reference page
 * =============================================================================
 * Drives three-gen.html.
 *
 * The page describes the pattern using this repository's own classes, and this
 * module is the reason it cannot drift. Nothing on the page is transcribed from
 * the source: the lineages come from prototype chains, the generations come
 * from inheritance distance, the abstract action verbs come from asking each
 * control, and the verdict comes from checking every application element in the
 * browser the visitor is using.
 *
 * If somebody changed a base class and forgot to update the prose, this page
 * would report the change and the verdict would fail.
 */

registerGen2Controls();
registerGen3Elements();

const lineageView = document.getElementById("lineage-view");
const lineageFilter = document.getElementById("lineage-filter");
const actionGrid = document.getElementById("action-grid");
const verdict = document.getElementById("verdict");
const verdictText = document.getElementById("verdict-text");

const actionVerbs = probeActionVerbs(GEN2_CONTROLS.concat(GEN3_ELEMENTS));

lineageView.setClasses(GEN2_CONTROLS, GEN3_ELEMENTS, actionVerbs);

// -----------------------------------------------------------------------------
// The verdict
// -----------------------------------------------------------------------------

const violations = findLineageViolations(GEN3_ELEMENTS, GEN2_CONTROLS);

function reportVerdict()
{
    const counts = GEN2_CONTROLS.length + " generic controls, " + GEN3_ELEMENTS.length + " application elements";

    if (violations.length === 0)
    {
        verdictText.textContent = counts + ". Every application element inherits a generic control exactly two steps below AbstractElement. No violations.";
        return;
    }

    const names = [];

    for (let index = 0; index < violations.length; index = index + 1)
    {
        names.push(violations[index].name + " " + violations[index].problem);
    }

    verdict.classList.add("verdict--failed");
    verdictText.textContent = counts + ". " + String(violations.length) + " violation(s): " + names.join("; ");
}

reportVerdict();

// -----------------------------------------------------------------------------
// The abstract action table
// -----------------------------------------------------------------------------

const ACTION_COLUMNS =
[
    { key: "name", title: "Class", width: "26%", sortable: true },
    { key: "generation", title: "Generation", width: "14%", sortable: true },
    { key: "action", title: "Abstract action", width: "20%", sortable: true },
    { key: "lineage", title: "Lineage", width: "40%" }
];

/**
 * Builds one row per class, with every field computed.
 * @returns {Array<object>}
 */
function buildActionRows()
{
    const classes = GEN2_CONTROLS.concat(GEN3_ELEMENTS);
    const rows = [];

    for (let index = 0; index < classes.length; index = index + 1)
    {
        const constructorFunction = classes[index];
        const name = constructorFunction.name;

        rows.push(
        {
            name: name,
            generation: generationLabelOf(constructorFunction),
            action: actionVerbs[name] === undefined ? "" : actionVerbs[name],
            lineage: classLineage(constructorFunction).join(" > ")
        });
    }

    return rows;
}

actionGrid.setColumns(ACTION_COLUMNS);
actionGrid.setRows(buildActionRows());

// -----------------------------------------------------------------------------
// Filtering
// -----------------------------------------------------------------------------

function handleGenerationFilter(event)
{
    lineageView.generationFilter = event.detail.generation;
}

lineageFilter.addEventListener("shape-generation-filter", handleGenerationFilter);
