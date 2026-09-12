import { DataGrid } from "../gen2/DataGrid.js";
import { ARTIFACTS } from "./data/projectSpace.js";

/**
 * GEN 3 - ShapeArtifactGrid
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> DataGrid -> ShapeArtifactGrid
 *
 * The repository's inventory of itself: every class this project ships, which
 * generation it belongs to, what it is for, and the file it lives in.
 *
 * Sorting, selection, keyboard navigation, row reconciliation and the empty
 * state are DataGrid's. This class knows the columns the project wants, the
 * rows the project has, and how to narrow them to one generation.
 *
 * Properties
 *   artifacts         {Array<object>} Defaults to the project's inventory.
 *   generationFilter  {string} "" for everything, or "Gen 1" | "Gen 2" | "Gen 3".
 *   visibleArtifacts  {Array<object>} Read-only, after filtering.
 *
 * Methods
 *   countFor(generation)   How many artifacts a generation has.
 *
 * Events
 *   shape-artifact-open   detail { id, artifact }
 *   plus every event DataGrid emits.
 *
 * Abstract action
 *   Inherited as "activate", extended with the project's announcement.
 */
export class ShapeArtifactGrid extends DataGrid
{
    static elementName = "shape-artifact-grid";

    #artifacts = ARTIFACTS;
    #generationFilter = "";

    buildElements()
    {
        super.buildElements();
        this.classList.add("shape-artifact-grid");
    }

    onConnected()
    {
        super.onConnected();

        if (this.columns.length === 0)
        {
            this.setColumns(ARTIFACT_COLUMNS);
        }

        this.rowKey = "id";
        this.emptyText = "No artifacts match this filter.";
        this.#applyRows();
    }

    #applyRows()
    {
        this.setRows(this.visibleArtifacts);
    }

    /**
     * @returns {Array<object>}
     */
    get artifacts()
    {
        return this.#artifacts.slice();
    }

    set artifacts(value)
    {
        this.#artifacts = Array.isArray(value) ? value.slice() : [];
        this.#applyRows();
    }

    /**
     * @returns {string}
     */
    get generationFilter()
    {
        return this.#generationFilter;
    }

    set generationFilter(value)
    {
        this.#generationFilter = value === undefined || value === null ? "" : String(value);
        this.#applyRows();
    }

    /**
     * @returns {Array<object>}
     */
    get visibleArtifacts()
    {
        if (this.#generationFilter === "")
        {
            return this.#artifacts.slice();
        }

        const matching = [];

        for (let index = 0; index < this.#artifacts.length; index = index + 1)
        {
            if (this.#artifacts[index].generation === this.#generationFilter)
            {
                matching.push(this.#artifacts[index]);
            }
        }

        return matching;
    }

    /**
     * @param {string} generation
     * @returns {number}
     */
    countFor(generation)
    {
        let total = 0;

        for (let index = 0; index < this.#artifacts.length; index = index + 1)
        {
            if (this.#artifacts[index].generation === generation)
            {
                total = total + 1;
            }
        }

        return total;
    }

    abstractAction(payload)
    {
        const result = super.abstractAction(payload);

        if (result.handled === false)
        {
            return result;
        }

        this.emit("shape-artifact-open", { id: result.detail.key, artifact: result.detail.row });

        return {
            action: result.action,
            handled: true,
            detail: { id: result.detail.key, artifact: result.detail.row }
        };
    }
}

/**
 * Column definitions for the inventory. Kept beside the class because they are
 * project decisions, not grid behaviour.
 */
const ARTIFACT_COLUMNS =
[
    { key: "name", title: "Artifact", width: "26%", sortable: true },
    { key: "generation", title: "Generation", width: "14%", sortable: true },
    { key: "kind", title: "Kind", width: "18%", sortable: true },
    { key: "status", title: "Status", width: "12%", sortable: true },
    { key: "file", title: "File", width: "30%", sortable: true }
];
