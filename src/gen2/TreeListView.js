import { AbstractElement } from "../gen1/AbstractElement.js";
import { ChildReconciler } from "./support/ChildReconciler.js";
import { HierarchyModel } from "./support/HierarchyModel.js";
import { nextIndexForKey } from "./support/navigation.js";
import { createElement, setText, setClass, attachParts, partsOf, attributeToBoolean, toText } from "./support/dom.js";

/**
 * GEN 2 - TreeListView
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> TreeListView
 *
 * A tree and a list in one control: hierarchical rows with expandable branches,
 * displayed across columns. It is the control you want when each item in a
 * hierarchy has attributes worth showing side by side - a file tree with sizes
 * and dates, a bill of materials, an outline with counts, a class hierarchy
 * with the facts about each class.
 *
 * It is a sibling of TreeView, not a subclass of it, because the pattern this
 * library follows places every concrete control exactly one step below the
 * abstract foundation. The hierarchy logic the two controls share lives in a
 * plain HierarchyModel that neither control owns exclusively.
 *
 * Columns are data:
 *
 *     view.columns =
 *     [
 *         { key: "label", title: "Name", width: "40%" },
 *         { key: "count", title: "Items", align: "right", format: formatCount }
 *     ];
 *
 * A column may carry a named format function. It receives the raw cell value
 * and the node, and returns a string. Format functions must be named functions
 * owned by the caller, never inline closures, so that a stack trace names them.
 *
 * Nodes use the same structure TreeView expects, with any extra fields the
 * columns read by key:
 *
 *     { id: "a", label: "Alpha", count: 3, children: [ ... ] }
 *
 * Rendering model
 *   A real table with treegrid semantics. Rows are reconciled by node id and
 *   cells are reconciled by column key, so changing the data, the columns or
 *   the expansion state all preserve the identity of everything that survives.
 *
 * Attributes
 *   label, selected-id, tree-column, disabled, show-header, empty-text
 *
 * Properties
 *   label, columns, nodes, selectedId, activeId, expandedIds, treeColumnKey,
 *   showHeader, disabled, emptyText, selectedNode (read-only)
 *
 * Methods
 *   setColumns(list), setNodes(list), getNode(id), getParentId(id), expand(id),
 *   collapse(id), toggleNode(id), expandAll(), collapseAll(), selectNode(id),
 *   revealNode(id), activateNode(id), visibleNodeIds(), cellValue(node, column),
 *   focus()
 *
 * Events
 *   tg-change    Selection changed. detail { id, node, previousId }
 *   tg-expand    detail { id, node }
 *   tg-collapse  detail { id, node }
 *   tg-action    detail.action is "activate".
 *
 * Abstract action
 *   "activate" - open the current row. A branch row also toggles, exactly as in
 *   TreeView, so the two hierarchy controls behave identically under the same
 *   gesture.
 */
export class TreeListView extends AbstractElement
{
    static elementName = "tg-tree-list-view";

    static get observedAttributes()
    {
        return ["label", "selected-id", "tree-column", "disabled", "show-header", "empty-text"];
    }

    #label = "";
    #columns = [];
    #selectedId = "";
    #activeId = "";
    #treeColumnKey = "";
    #showHeader = true;
    #disabled = false;
    #emptyText = "No rows.";
    #model = new HierarchyModel();
    #rowReconciler = null;
    #headerReconciler = null;
    #rowSequence = 0;

    constructor()
    {
        super();
        this.handleBodyClick = this.handleBodyClick.bind(this);
        this.handleTableKeyDown = this.handleTableKeyDown.bind(this);

        this.rowKeyOf = this.rowKeyOf.bind(this);
        this.createRowElement = this.createRowElement.bind(this);
        this.updateRowElement = this.updateRowElement.bind(this);

        this.headerKeyOf = this.headerKeyOf.bind(this);
        this.createHeaderCell = this.createHeaderCell.bind(this);
        this.updateHeaderCell = this.updateHeaderCell.bind(this);

        this.cellKeyOf = this.cellKeyOf.bind(this);
        this.createCell = this.createCell.bind(this);
        this.updateCell = this.updateCell.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-tree-list-view");

        const caption = createElement("span", "tg-tree-list-view__caption");
        caption.id = this.elementId + "-caption";

        const viewport = createElement("div", "tg-tree-list-view__viewport");

        const table = createElement("table", "tg-tree-list-view__table");
        table.id = this.elementId + "-table";
        table.setAttribute("role", "treegrid");
        table.setAttribute("tabindex", "0");
        table.setAttribute("aria-labelledby", caption.id);

        const head = createElement("thead", "tg-tree-list-view__head");
        const headRow = createElement("tr", "tg-tree-list-view__head-row");
        head.append(headRow);

        const body = createElement("tbody", "tg-tree-list-view__body");
        table.append(head, body);
        viewport.append(table);

        const empty = createElement("p", "tg-tree-list-view__empty");

        this.defineElement("caption", caption);
        this.defineElement("viewport", viewport);
        this.defineElement("table", table);
        this.defineElement("head", head);
        this.defineElement("headRow", headRow);
        this.defineElement("body", body);
        this.defineElement("empty", empty);

        this.append(caption, viewport, empty);

        this.#headerReconciler = new ChildReconciler(headRow,
        {
            keyOf: this.headerKeyOf,
            create: this.createHeaderCell,
            update: this.updateHeaderCell
        });

        this.#rowReconciler = new ChildReconciler(body,
        {
            keyOf: this.rowKeyOf,
            create: this.createRowElement,
            update: this.updateRowElement
        });
    }

    bindEvents()
    {
        const body = this.getElement("body");
        const table = this.getElement("table");
        this.addManagedListener(body, "click", this.handleBodyClick);
        this.addManagedListener(table, "keydown", this.handleTableKeyDown);
    }

    syncElements()
    {
        const caption = this.getElement("caption");
        const table = this.getElement("table");
        const head = this.getElement("head");
        const empty = this.getElement("empty");

        setText(caption, this.#label);
        setClass(caption, "tg-tree-list-view__caption--empty", this.#label === "");

        this.#headerReconciler.reconcile(this.#columns);
        head.hidden = this.#showHeader === false;

        const rows = this.#model.visibleRows();
        this.#rowReconciler.reconcile(rows);

        setText(empty, this.#emptyText);
        setClass(empty, "tg-tree-list-view__empty--visible", rows.length === 0 || this.#columns.length === 0);
        setClass(this, "tg-tree-list-view--disabled", this.#disabled);

        table.setAttribute("aria-disabled", this.#disabled === true ? "true" : "false");
        table.setAttribute("tabindex", this.#disabled === true ? "-1" : "0");

        const activeRow = this.#activeId === "" ? undefined : this.#rowReconciler.nodeForKey(this.#activeId);

        if (activeRow === undefined)
        {
            table.removeAttribute("aria-activedescendant");
            return;
        }

        table.setAttribute("aria-activedescendant", activeRow.id);
    }

    // -------------------------------------------------------------------------
    // Header cells
    // -------------------------------------------------------------------------

    headerKeyOf(column, index)
    {
        return column === null || column.key === undefined ? String(index) : String(column.key);
    }

    createHeaderCell(column, key)
    {
        const cell = createElement("th", "tg-tree-list-view__header-cell");
        cell.setAttribute("scope", "col");
        cell.dataset.key = key;
        return cell;
    }

    updateHeaderCell(cell, column, index, key)
    {
        const title = toText(column.title) === "" ? key : toText(column.title);
        setText(cell, title);
        cell.style.width = toText(column.width);
        cell.dataset.align = toText(column.align) === "" ? "left" : toText(column.align);
    }

    // -------------------------------------------------------------------------
    // Rows
    // -------------------------------------------------------------------------

    rowKeyOf(row)
    {
        return row.id;
    }

    createRowElement(row, key)
    {
        this.#rowSequence = this.#rowSequence + 1;

        const element = createElement("tr", "tg-tree-list-view__row");
        element.id = this.elementId + "-row-" + this.#rowSequence;
        element.setAttribute("role", "row");
        element.dataset.key = key;

        const cellReconciler = new ChildReconciler(element,
        {
            keyOf: this.cellKeyOf,
            create: this.createCell,
            update: this.updateCell
        });

        attachParts(element, { cells: cellReconciler });
        return element;
    }

    updateRowElement(element, row)
    {
        const parts = partsOf(element);
        const node = row.node;
        const isSelected = row.id === this.#selectedId;
        const isDisabled = node.disabled === true || this.#disabled === true;

        parts.cells.reconcile(this.#cellItemsFor(row));

        setClass(element, "tg-tree-list-view__row--selected", isSelected);
        setClass(element, "tg-tree-list-view__row--active", row.id === this.#activeId);
        setClass(element, "tg-tree-list-view__row--branch", row.hasChildren);
        setClass(element, "tg-tree-list-view__row--disabled", isDisabled);

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

    #cellItemsFor(row)
    {
        const items = [];
        const treeKey = this.#effectiveTreeColumnKey();

        for (let index = 0; index < this.#columns.length; index = index + 1)
        {
            const column = this.#columns[index];
            const key = this.headerKeyOf(column, index);
            items.push({ column: column, row: row, isTreeCell: key === treeKey });
        }

        return items;
    }

    #effectiveTreeColumnKey()
    {
        if (this.#treeColumnKey !== "")
        {
            return this.#treeColumnKey;
        }

        if (this.#columns.length === 0)
        {
            return "";
        }

        return this.headerKeyOf(this.#columns[0], 0);
    }

    // -------------------------------------------------------------------------
    // Cells
    // -------------------------------------------------------------------------

    cellKeyOf(item, index)
    {
        const columnKey = this.headerKeyOf(item.column, index);
        return item.isTreeCell === true ? columnKey + ":tree" : columnKey;
    }

    createCell(item, key)
    {
        const cell = createElement("td", "tg-tree-list-view__cell");
        cell.setAttribute("role", "gridcell");
        cell.dataset.key = key;

        if (item.isTreeCell !== true)
        {
            const text = createElement("span", "tg-tree-list-view__text");
            cell.append(text);
            attachParts(cell, { text: text });
            return cell;
        }

        cell.classList.add("tg-tree-list-view__cell--tree");

        const indent = createElement("span", "tg-tree-list-view__indent");
        indent.setAttribute("aria-hidden", "true");

        const twisty = createElement("span", "tg-tree-list-view__twisty");
        twisty.setAttribute("aria-hidden", "true");
        twisty.dataset.role = "twisty";

        const text = createElement("span", "tg-tree-list-view__text");

        cell.append(indent, twisty, text);
        attachParts(cell, { indent: indent, twisty: twisty, text: text });
        return cell;
    }

    updateCell(cell, item)
    {
        const parts = partsOf(cell);
        const row = item.row;
        const column = item.column;
        const value = this.cellValue(row.node, column);

        setText(parts.text, value);
        cell.dataset.align = toText(column.align) === "" ? "left" : toText(column.align);

        if (item.isTreeCell !== true)
        {
            return;
        }

        cell.style.setProperty("--tg-tree-depth", String(row.depth));
        setText(parts.twisty, this.#twistyTextFor(row));
        setClass(parts.twisty, "tg-tree-list-view__twisty--visible", row.hasChildren);
    }

    #twistyTextFor(row)
    {
        if (row.hasChildren === false)
        {
            return "";
        }

        return row.expanded === true ? "▾" : "▸";
    }

    /**
     * Resolves the displayed text of one cell.
     *
     * @param {object} node
     * @param {object} column
     * @returns {string}
     */
    cellValue(node, column)
    {
        if (node === null || column === null || column.key === undefined)
        {
            return "";
        }

        const raw = node[column.key];

        if (typeof column.format === "function")
        {
            return toText(column.format(raw, node));
        }

        return toText(raw);
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

        if (name === "tree-column")
        {
            this.#treeColumnKey = toText(newValue);
            return;
        }

        if (name === "disabled")
        {
            this.#disabled = attributeToBoolean(newValue);
            return;
        }

        if (name === "show-header")
        {
            this.#showHeader = attributeToBoolean(newValue);
            return;
        }

        if (name === "empty-text")
        {
            this.#emptyText = newValue === null ? "No rows." : newValue;
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

    get columns()
    {
        return this.#columns.slice();
    }

    set columns(value)
    {
        this.setColumns(value);
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

    get treeColumnKey()
    {
        return this.#effectiveTreeColumnKey();
    }

    set treeColumnKey(value)
    {
        this.#treeColumnKey = toText(value);
        this.requestUpdate();
    }

    get showHeader()
    {
        return this.#showHeader;
    }

    set showHeader(value)
    {
        this.#showHeader = value === true;
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
     * @param {Array<object>} columnList
     */
    setColumns(columnList)
    {
        this.#columns = Array.isArray(columnList) ? columnList.slice() : [];
        this.requestUpdate();
    }

    /**
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
     * @returns {string}
     */
    getParentId(id)
    {
        return this.#model.parentIdOf(id);
    }

    /**
     * @param {string} id
     * @returns {boolean}
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
     * @returns {boolean}
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
     * @param {string} id
     * @returns {boolean}
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
     * @returns {string[]}
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

        const table = this.getElement("table");
        table.focus(options);
    }

    // -------------------------------------------------------------------------
    // Gestures
    // -------------------------------------------------------------------------

    handleBodyClick(event)
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

        const rowElement = target.closest(".tg-tree-list-view__row");

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

    handleTableKeyDown(event)
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

            if (this.#activeId !== "" && this.#model.hasChildren(this.#activeId) === true)
            {
                this.expand(this.#activeId);
            }

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
