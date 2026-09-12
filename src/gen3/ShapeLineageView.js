import { TreeListView } from "../gen2/TreeListView.js";
import { buildLineageTree, generationLabelOf } from "./data/lineage.js";

/**
 * GEN 3 - ShapeLineageView
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> TreeListView -> ShapeLineageView
 *
 * The inheritance lineages of this repository, read from the live class objects
 * and displayed as a hierarchy with columns.
 *
 * This is the control that makes the reference page unable to lie. It is handed
 * the actual constructor functions, walks their prototype chains, computes each
 * class's generation from its distance to AbstractElement rather than from the
 * folder it happens to sit in, and displays the result. If somebody changed a
 * base class tomorrow, this view would show the change; it has nothing written
 * down to contradict.
 *
 * Properties
 *   gen2Classes       {Function[]} The generic library, as classes.
 *   gen3Classes       {Function[]} The application elements, as classes.
 *   actionVerbs       {Object<string, string>} Class name to abstract action verb.
 *   generationFilter  {string} "" for everything, or "Gen 1" | "Gen 2" | "Gen 3".
 *
 * Methods
 *   setClasses(gen2, gen3, actionVerbs)   Supplies the classes to inspect.
 *   lineageOf(name)                       The lineage string for one class.
 *
 * Events
 *   shape-lineage-select   detail { name, generation, lineage }
 *   plus every event TreeListView emits.
 *
 * Abstract action
 *   Inherited as "activate", extended with the project's announcement.
 */
export class ShapeLineageView extends TreeListView
{
    static elementName = "shape-lineage-view";

    #gen2Classes = [];
    #gen3Classes = [];
    #actionVerbs = {};
    #generationFilter = "";

    buildElements()
    {
        super.buildElements();
        this.classList.add("shape-lineage-view");
    }

    onConnected()
    {
        super.onConnected();

        if (this.columns.length === 0)
        {
            this.setColumns(LINEAGE_COLUMNS);
        }

        this.emptyText = "No classes to inspect.";
    }

    /**
     * Supplies the classes this view reports on.
     *
     * @param {Function[]} gen2Classes
     * @param {Function[]} gen3Classes
     * @param {Object<string, string>} [actionVerbs]
     * @returns {this}
     */
    setClasses(gen2Classes, gen3Classes, actionVerbs)
    {
        this.#gen2Classes = Array.isArray(gen2Classes) ? gen2Classes.slice() : [];
        this.#gen3Classes = Array.isArray(gen3Classes) ? gen3Classes.slice() : [];
        this.#actionVerbs = actionVerbs === undefined || actionVerbs === null ? {} : actionVerbs;
        this.#applyNodes();
        return this;
    }

    #applyNodes()
    {
        const tree = buildLineageTree(
        {
            gen2: this.#gen2Classes,
            gen3: this.#gen3Classes,
            actionVerbs: this.#actionVerbs
        });

        this.setNodes(this.#filterTree(tree));
        this.expandAll();
    }

    #filterTree(nodes)
    {
        if (this.#generationFilter === "")
        {
            return nodes;
        }

        const kept = [];

        for (let index = 0; index < nodes.length; index = index + 1)
        {
            const node = nodes[index];
            const children = Array.isArray(node.children) ? this.#filterTree(node.children) : [];
            const matches = node.generation === this.#generationFilter;

            if (matches === false && children.length === 0)
            {
                continue;
            }

            kept.push(
            {
                id: node.id,
                label: node.label,
                generation: node.generation,
                tag: node.tag,
                action: node.action,
                role: node.role,
                lineage: node.lineage,
                expanded: true,
                children: children
            });
        }

        return kept;
    }

    get gen2Classes()
    {
        return this.#gen2Classes.slice();
    }

    get gen3Classes()
    {
        return this.#gen3Classes.slice();
    }

    get actionVerbs()
    {
        return this.#actionVerbs;
    }

    get generationFilter()
    {
        return this.#generationFilter;
    }

    set generationFilter(value)
    {
        this.#generationFilter = value === undefined || value === null ? "" : String(value);
        this.#applyNodes();
    }

    /**
     * @param {string} name Class name.
     * @returns {string} For example "HTMLElement > AbstractElement > TreeView".
     */
    lineageOf(name)
    {
        const node = this.getNode(name);
        return node === null ? "" : String(node.lineage);
    }

    /**
     * The generation a class object actually belongs to.
     * @param {Function} constructorFunction
     * @returns {string}
     */
    generationOf(constructorFunction)
    {
        return generationLabelOf(constructorFunction);
    }

    abstractAction(payload)
    {
        const result = super.abstractAction(payload);

        if (result.handled === false)
        {
            return result;
        }

        const node = result.detail.node;
        this.emit("shape-lineage-select", { name: node.id, generation: node.generation, lineage: node.lineage });

        return {
            action: result.action,
            handled: true,
            detail: { name: node.id, generation: node.generation, lineage: node.lineage, tag: node.tag }
        };
    }
}

/**
 * Column definitions for the lineage view. Every column except Role displays a
 * computed value.
 */
const LINEAGE_COLUMNS =
[
    { key: "label", title: "Class", width: "26%" },
    { key: "generation", title: "Generation", width: "12%" },
    { key: "tag", title: "Tag name", width: "16%" },
    { key: "action", title: "Abstract action", width: "14%" },
    { key: "role", title: "Role", width: "32%" }
];
