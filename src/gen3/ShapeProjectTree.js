import { TreeView } from "../gen2/TreeView.js";
import { PROJECT_TREE } from "./data/projectSpace.js";

/**
 * GEN 3 - ShapeProjectTree
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> TreeView -> ShapeProjectTree
 *
 * Navigation over the project's own areas: pattern, method, notation, space.
 *
 * Expansion, selection, keyboard navigation, the active descendant and row
 * reconciliation are all TreeView's and are untouched here. This class supplies
 * the project's node data, its default expansion, and the vocabulary the rest
 * of the site listens for.
 *
 * Properties
 *   areas         {Array<object>} The tree data. Defaults to the project's.
 *   currentAreaId {string} Shorthand for the selected node id.
 *
 * Methods
 *   showArea(id)   Reveals, selects and activates an area.
 *
 * Events
 *   shape-area-change   detail { id, label, path }
 *   plus every event TreeView emits.
 *
 * Abstract action
 *   Inherited as "activate" and extended with the project's announcement. The
 *   path in the detail is the chain of labels from the root, which is
 *   application meaning assembled from generic parentage.
 */
export class ShapeProjectTree extends TreeView
{
    static elementName = "shape-project-tree";

    buildElements()
    {
        super.buildElements();
        this.classList.add("shape-project-tree");
    }

    onConnected()
    {
        super.onConnected();

        if (this.nodes.length === 0)
        {
            this.setNodes(PROJECT_TREE);
        }

        if (this.label === "")
        {
            this.label = "Project areas";
        }
    }

    /**
     * @returns {Array<object>}
     */
    get areas()
    {
        return this.nodes;
    }

    set areas(value)
    {
        this.setNodes(value);
    }

    /**
     * @returns {string}
     */
    get currentAreaId()
    {
        return this.selectedId;
    }

    /**
     * The labels from the root down to a node.
     * @param {string} id
     * @returns {string[]}
     */
    pathTo(id)
    {
        const labels = [];
        let current = id;

        while (current !== "")
        {
            const node = this.getNode(current);

            if (node === null)
            {
                break;
            }

            labels.unshift(String(node.label));
            current = this.getParentId(current);
        }

        return labels;
    }

    /**
     * Reveals, selects and activates an area.
     * @param {string} id
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    showArea(id)
    {
        this.revealNode(id);
        return this.activateNode(id);
    }

    abstractAction(payload)
    {
        const result = super.abstractAction(payload);

        if (result.handled === false)
        {
            return result;
        }

        const path = this.pathTo(result.detail.id);
        this.emit("shape-area-change", { id: result.detail.id, label: String(result.detail.node.label), path: path });

        return {
            action: result.action,
            handled: true,
            detail: { id: result.detail.id, label: String(result.detail.node.label), path: path, isBranch: result.detail.isBranch }
        };
    }
}
