import { AbstractElement } from "../gen1/AbstractElement.js";
import { ChildReconciler } from "./support/ChildReconciler.js";
import { HierarchyModel } from "./support/HierarchyModel.js";
import { nextIndexForKey } from "./support/navigation.js";
import { createElement, setText, setClass, attachParts, partsOf, attributeToBoolean, toText } from "./support/dom.js";

/**
 * GEN 2 - TreeView
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> TreeView
 *
 * A hierarchical list with expandable branches, selection and full keyboard
 * navigation. It is a working tree the moment it is given nodes; nothing about
 * it is specific to any application.
 *
 * Nodes are plain data. A node needs an id and a label; everything else is
 * optional:
 *
 *     tree.nodes =
 *     [
 *         {
 *             id: "root",
 *             label: "Root",
 *             badge: "4",
 *             icon: "*",
 *             disabled: false,
 *             expanded: true,
 *             children: [ { id: "child", label: "Child" } ]
 *         }
 *     ];
 *
 * Rendering model
 *   Hierarchy, parentage and expansion live in a HierarchyModel. The visible
 *   nodes are flattened into one flat row list and reconciled by node id, so
 *   expanding a branch inserts rows and leaves every other row node alone.
 *   Indentation comes from a CSS custom property rather than nested containers,
 *   which keeps row identity stable even when a node changes depth.
 *
 * Focus model
 *   The viewport is the single focusable element and names the current row with
 *   aria-activedescendant, so a data update can never move focus out of the
 *   control.
 *
 * Attributes
 *   label, selected-id, disabled, show-guides, empty-text
 *
 * Properties
 *   label, nodes, selectedId, activeId, expandedIds, disabled, showGuides,
 *   emptyText, selectedNode (read-only)
 *
 * Methods
 *   setNodes(list), getNode(id), getParentId(id), expand(id), collapse(id),
 *   toggleNode(id), expandAll(), collapseAll(), selectNode(id), revealNode(id),
 *   activateNode(id), visibleNodeIds(), focus()
 *
 * Events
 *   tg-change    Selection changed. detail { id, node, previousId }
 *   tg-expand    detail { id, node }
 *   tg-collapse  detail { id, node }
 *   tg-action    detail.action is "activate".
 *
 * Abstract action
 *   "activate" - open the current node. For a leaf this is the thing the tree
 *   exists to do; for a branch, activation also toggles the branch, which is
 *   what a file tree in an editor does.
 */
export class TreeView extends AbstractElement
{
    static elementName = "tg-tree-view";

    static get observedAttributes()
    {
        return ["label", "selected-id", "disabled", "show-guides", "empty-text"];
    }

    #label = "";
    #selectedId = "";
    #activeId = "";
    #disabled = false;
    #showGuides = true;
    #emptyText = "No items.";
    #model = new HierarchyModel();
    #reconciler = null;
    #rowSequence = 0;

    constructor()
    {
        super();
        this.handleViewportClick = this.handleViewportClick.bind(this);
        this.handleViewportKeyDown = this.handleViewportKeyDown.bind(this);
        this.rowKeyOf = this.rowKeyOf.bind(this);
        this.createNodeRow = this.createNodeRow.bind(this);
        this.updateNodeRow = this.updateNodeRow.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-tree-view");

        const caption = createElement("span", "tg-tree-view__caption");
        caption.id = this.elementId + "-caption";

        const viewport = createElement("div", "tg-tree-view__viewport");
        viewport.id = this.elementId + "-viewport";
        viewport.setAttribute("role", "tree");
        viewport.setAttribute("tabindex", "0");
        viewport.setAttribute("aria-labelledby", caption.id);

        const empty = createElement("p", "tg-tree-view__empty");

        this.defineElement("caption", caption);
        this.defineElement("viewport", viewport);
        this.defineElement("empty", empty);

        this.append(caption, viewport, empty);

        this.#reconciler = new ChildReconciler(viewport,
        {
            keyOf: this.rowKeyOf,
            create: this.createNodeRow,
            update: this.updateNodeRow
        });
    }

    bindEvents()
    {
        const viewport = this.getElement("viewport");
        this.addManagedListener(viewport, "click", this.handleViewportClick);
        this.addManagedListener(viewport, "keydown", this.handleViewportKeyDown);
    }

    syncElements()
    {
        const caption = this.getElement("caption");
        const viewport = this.getElement("viewport");
        const empty = this.getElement("empty");

        setText(caption, this.#label);
        setClass(caption, "tg-tree-view__caption--empty", this.#label === "");

        const rows = this.#model.visibleRows();
        this.#reconciler.reconcile(rows);

        setText(empty, this.#emptyText);
        setClass(empty, "tg-tree-view__empty--visible", rows.length === 0);
        setClass(this, "tg-tree-view--guides", this.#showGuides);
        setClass(this, "tg-tree-view--disabled", this.#disabled);

        viewport.setAttribute("aria-disabled", this.#disabled === true ? "true" : "false");
        viewport.setAttribute("tabindex", this.#disabled === true ? "-1" : "0");

        const activeRow = this.#activeId === "" ? undefined : this.#reconciler.nodeForKey(this.#activeId);

        if (activeRow === undefined)
        {
            viewport.removeAttribute("aria-activedescendant");
        }
        else
        {
            viewport.setAttribute("aria-activedescendant", activeRow.id);
        }
    }

    // -------------------------------------------------------------------------
    // Row construction. Bound once in the constructor and owned by this control.
    // -------------------------------------------------------------------------

    rowKeyOf(row)
    {
        return row.id;
    }

    createNodeRow(row, key)
    {
        this.#rowSequence = this.#rowSequence + 1;

        const element = createElement("div", "tg-tree-view__row");
        element.id = this.elementId + "-row-" + this.#rowSequence;
        element.setAttribute("role", "treeitem");
        element.dataset.key = key;

        const indent = createElement("span", "tg-tree-view__indent");
        indent.setAttribute("aria-hidden", "true");

        const twisty = createElement("span", "tg-tree-view__twisty");
        twisty.setAttribute("aria-hidden", "true");
        twisty.dataset.role = "twisty";

        const icon = createElement("span", "tg-tree-view__icon");
        icon.setAttribute("aria-hidden", "true");

        const caption = createElement("span", "tg-tree-view__label");
        const badge = createElement("span", "tg-tree-view__badge");

        element.append(indent, twisty, icon, caption, badge);
        attachParts(element, { indent: indent, twisty: twisty, icon: icon, caption: caption, badge: badge });
        return element;
    }

    updateNodeRow(element, row)
    {
        const parts = partsOf(element);
        const node = row.node;
        const label = toText(node.label);
        const icon = toText(node.icon);
        const badge = toText(node.badge);
        const isSelected = row.id === this.#selectedId;
        const isDisabled = node.disabled === true || this.#disabled === true;

        setText(parts.caption, label === "" ? row.id : label);
        setText(parts.icon, icon);
        setClass(parts.icon, "tg-tree-view__icon--visible", icon !== "");
        setText(parts.badge, badge);
        setClass(parts.badge, "tg-tree-view__badge--visible", badge !== "");

        setText(parts.twisty, this.#twistyTextFor(row));
        setClass(parts.twisty, "tg-tree-view__twisty--visible", row.hasChildren);

        element.style.setProperty("--tg-tree-depth", String(row.depth));

        setClass(element, "tg-tree-view__row--selected", isSelected);
        setClass(element, "tg-tree-view__row--active", row.id === this.#activeId);
        setClass(element, "tg-tree-view__row--branch", row.hasChildren);
        setClass(element, "tg-tree-view__row--disabled", isDisabled);

        element.setAttribute("aria-level", String(row.depth + 1));
        element.setAttribute("aria-selected", isSelected === true ? "true" : "false");
        element.setAttribute("aria-disabled", isDisabled === true ? "true" : "false");

        if (row.hasChildren === true)
        {
            element.setAttribute("aria-expanded", row.expanded === true ? "true" : "false");
            return;
        }

        element.removeAttribute("aria-expanded");
    }

    #twistyTextFor(row)
    {
        if (row.hasChildren === false)
        {
            return "";
        }

        return row.expanded === true ? "▾" : "▸";
    }

    onAttributeChanged(name, oldValue, newValue)
    {
        if (name === "label")
        {
            this.#label = toText(newValue);
            return;
        }

        if (name === "selected-id")
        {
            this.#selectedId = toText(newValue);
            this.#activeId = this.#selectedId;
            return;
        }

        if (name === "disabled")
        {
            this.#disabled = attributeToBoolean(newValue);
            return;
        }

        if (name === "show-guides")
        {
            this.#showGuides = attributeToBoolean(newValue);
            return;
        }

        if (name === "empty-text")
        {
            this.#emptyText = newValue === null ? "No items." : newValue;
        }
    }

    // -------------------------------------------------------------------------
    // Properties
    // -------------------------------------------------------------------------

    get label()
    {
        return this.#label;
    }

    set label(value)
    {
        this.#label = toText(value);
        this.requestUpdate();
    }

    get nodes()
    {
        return this.#model.nodes;
    }

    set nodes(value)
    {
        this.setNodes(value);
    }

    get selectedId()
    {
        return this.#selectedId;
    }

    set selectedId(value)
    {
        this.#selectedId = toText(value);
        this.#activeId = this.#selectedId;
        this.requestUpdate();
    }

    get activeId()
    {
        return this.#activeId;
    }

    get selectedNode()
    {
        return this.#model.nodeOf(this.#selectedId);
    }

    get expandedIds()
    {
        return this.#model.expandedIds;
    }

    set expandedIds(value)
    {
        this.#model.expandedIds = value;
        this.requestUpdate();
    }

    get disabled()
    {
        return this.#disabled;
    }

    set disabled(value)
    {
        this.#disabled = value === true;
        this.requestUpdate();
    }

    get showGuides()
    {
        return this.#showGuides;
    }

    set showGuides(value)
    {
        this.#showGuides = value === true;
        this.requestUpdate();
    }

    get emptyText()
    {
        return this.#emptyText;
    }

    set emptyText(value)
    {
        this.#emptyText = toText(value);
        this.requestUpdate();
    }

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    /**
     * Replaces the node data. Expansion state survives for ids that still exist.
     * @param {Array<object>} nodeList
     */
    setNodes(nodeList)
    {
        this.#model.setNodes(nodeList);

        if (this.#model.has(this.#selectedId) === false)
        {
            this.#selectedId = "";
        }

        if (this.#model.has(this.#activeId) === false)
        {
            this.#activeId = "";
        }

        this.requestUpdate();
    }

    /**
     * @param {string} id
     * @returns {object|null}
     */
    getNode(id)
    {
        return this.#model.nodeOf(id);
    }

    /**
     * @param {string} id
     * @returns {string} Empty string for a root node or an unknown id.
     */
    getParentId(id)
    {
        return this.#model.parentIdOf(id);
    }

    /**
     * @param {string} id
     * @returns {boolean} True when the branch changed state.
     */
    expand(id)
    {
        const key = toText(id);

        if (this.#model.expand(key) === false)
        {
            return false;
        }

        this.requestUpdate();
        this.emit("tg-expand", { id: key, node: this.#model.nodeOf(key) });
        return true;
    }

    /**
     * @param {string} id
     * @returns {boolean} True when the branch changed state.
     */
    collapse(id)
    {
        const key = toText(id);

        if (this.#model.collapse(key) === false)
        {
            return false;
        }

        this.requestUpdate();
        this.emit("tg-collapse", { id: key, node: this.#model.nodeOf(key) });
        return true;
    }

    /**
     * @param {string} id
     * @returns {boolean}
     */
    toggleNode(id)
    {
        if (this.#model.isExpanded(id) === true)
        {
            return this.collapse(id);
        }

        return this.expand(id);
    }

    expandAll()
    {
        this.#model.expandAll();
        this.requestUpdate();
    }

    collapseAll()
    {
        this.#model.collapseAll();
        this.requestUpdate();
    }

    /**
     * Selects a node as an act: emits tg-change when the selection moves.
     * @param {string} id
     * @returns {boolean}
     */
    selectNode(id)
    {
        const key = toText(id);
        const node = this.#model.nodeOf(key);

        if (node === null || this.#disabled === true || node.disabled === true)
        {
            return false;
        }

        const previousId = this.#selectedId;
        this.#selectedId = key;
        this.#activeId = key;
        this.requestUpdate();

        if (previousId === key)
        {
            return false;
        }

        this.emit("tg-change", { id: key, node: node, previousId: previousId });
        return true;
    }

    /**
     * Expands every ancestor so that a node becomes visible.
     * @param {string} id
     * @returns {boolean} True when the node exists.
     */
    revealNode(id)
    {
        const revealed = this.#model.reveal(id);
        this.requestUpdate();
        return revealed;
    }

    /**
     * @param {string} id
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    activateNode(id)
    {
        return this.performAction({ source: "api", id: toText(id) });
    }

    /**
     * @returns {string[]} Ids of the rows currently rendered, in display order.
     */
    visibleNodeIds()
    {
        return this.#model.visibleIds();
    }

    focus(options)
    {
        if (this.isBuilt === false)
        {
            return;
        }

        const viewport = this.getElement("viewport");
        viewport.focus(options);
    }

    // -------------------------------------------------------------------------
    // Gestures
    // -------------------------------------------------------------------------

    handleViewportClick(event)
    {
        if (this.#disabled === true)
        {
            return;
        }

        const target = event.target;

        if (target === null || typeof target.closest !== "function")
        {
            return;
        }

        const rowElement = target.closest(".tg-tree-view__row");

        if (rowElement === null)
        {
            return;
        }

        const id = rowElement.dataset.key;
        const node = this.#model.nodeOf(id);

        if (node === null || node.disabled === true)
        {
            return;
        }

        this.#setActiveId(id);

        if (target.dataset !== undefined && target.dataset.role === "twisty")
        {
            this.toggleNode(id);
            return;
        }

        this.selectNode(id);
    }

    handleViewportKeyDown(event)
    {
        if (this.#disabled === true)
        {
            return;
        }

        const visibleIds = this.#model.visibleIds();

        if (visibleIds.length === 0)
        {
            return;
        }

        if (event.key === "Enter" || event.key === " ")
        {
            event.preventDefault();

            if (this.#activeId !== "")
            {
                this.performAction({ source: "keyboard", id: this.#activeId });
            }

            return;
        }

        if (event.key === "ArrowRight")
        {
            event.preventDefault();
            this.#handleExpandKey(visibleIds);
            return;
        }

        if (event.key === "ArrowLeft")
        {
            event.preventDefault();
            this.#handleCollapseKey();
            return;
        }

        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End")
        {
            event.preventDefault();
            this.#moveActive(event.key, visibleIds);
        }
    }

    #handleExpandKey(visibleIds)
    {
        if (this.#activeId === "")
        {
            this.#setActiveId(visibleIds[0]);
            return;
        }

        if (this.#model.hasChildren(this.#activeId) === false)
        {
            return;
        }

        if (this.#model.isExpanded(this.#activeId) === false)
        {
            this.expand(this.#activeId);
            return;
        }

        const node = this.#model.nodeOf(this.#activeId);
        this.#setActiveId(String(node.children[0].id));
    }

    #handleCollapseKey()
    {
        if (this.#activeId === "")
        {
            return;
        }

        if (this.#model.isExpanded(this.#activeId) === true)
        {
            this.collapse(this.#activeId);
            return;
        }

        const parentId = this.#model.parentIdOf(this.#activeId);

        if (parentId !== "")
        {
            this.#setActiveId(parentId);
        }
    }

    #moveActive(key, visibleIds)
    {
        const nextIndex = nextIndexForKey(key, visibleIds.indexOf(this.#activeId), visibleIds.length);

        if (nextIndex < 0)
        {
            return;
        }

        this.#setActiveId(visibleIds[nextIndex]);
    }

    #setActiveId(id)
    {
        const key = toText(id);

        if (key === this.#activeId)
        {
            return;
        }

        this.#activeId = key;
        this.requestUpdate();
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        const requested = payload !== null && payload !== undefined && payload.id !== undefined;
        const id = requested === true ? toText(payload.id) : this.#activeId;
        const node = this.#model.nodeOf(id);

        if (this.#disabled === true || node === null || node.disabled === true)
        {
            return { action: "activate", handled: false, detail: { id: id, node: node } };
        }

        const isBranch = this.#model.hasChildren(id);

        this.#setActiveId(id);
        this.selectNode(id);

        if (isBranch === true)
        {
            this.toggleNode(id);
        }

        return {
            action: "activate",
            handled: true,
            detail:
            {
                id: id,
                node: node,
                depth: this.#model.depthOf(id),
                isBranch: isBranch,
                parentId: this.#model.parentIdOf(id)
            }
        };
    }
}
