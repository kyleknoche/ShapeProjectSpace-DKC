import { AbstractElement } from "../gen1/AbstractElement.js";
import { ChildReconciler } from "./support/ChildReconciler.js";
import { nextIndexForKey } from "./support/navigation.js";
import { createElement, setText, setClass, attachParts, partsOf, attributeToBoolean, toText } from "./support/dom.js";

/**
 * GEN 2 - DataGrid
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> DataGrid
 *
 * A tabular view of records with sortable columns, row selection, keyboard
 * navigation and an empty state. It is a flat grid on purpose; hierarchy is
 * TreeListView's job, and a control that tried to be both would be worse at
 * each.
 *
 * Columns are data:
 *
 *     grid.columns =
 *     [
 *         { key: "name", title: "Name", sortable: true, width: "40%" },
 *         { key: "size", title: "Size", align: "right", format: formatBytes,
 *           compare: compareNumbers }
 *     ];
 *
 * Rows are plain records. The row key column decides identity:
 *
 *     grid.rowKey = "id";
 *     grid.rows = [ { id: "a", name: "Alpha", size: 1024 } ];
 *
 * Sorting
 *   Sorting is a view concern and is performed on a copy; the rows array the
 *   caller supplied is never reordered. A column may supply a named compare
 *   function; otherwise numbers sort numerically and everything else sorts as
 *   text, case-insensitively.
 *
 * Attributes
 *   label, row-key, selection-mode, sort-key, sort-direction, empty-text,
 *   striped, disabled
 *
 * Properties
 *   label, columns, rows, rowKey, selectionMode, selectedKey, selectedKeys,
 *   selectedRow, selectedRows, activeKey, sortKey, sortDirection, emptyText,
 *   striped, disabled
 *
 * Methods
 *   setColumns(list), setRows(list), sortBy(key, direction), getRow(key),
 *   selectRow(key), toggleRow(key), clearSelection(), activateRow(key),
 *   displayedRows(), cellValue(row, column), focus()
 *
 * Events
 *   tg-sort     detail { key, direction }
 *   tg-change   Selection changed. detail { key, keys, row, rows }
 *   tg-action   detail.action is "activate".
 *
 * Abstract action
 *   "activate" - open the current row. In a grid, selection says which record
 *   you mean and activation says do something with it, which is why they are
 *   separate events with separate gestures.
 */
export class DataGrid extends AbstractElement
{
    static elementName = "tg-data-grid";

    static get observedAttributes()
    {
        return ["label", "row-key", "selection-mode", "sort-key", "sort-direction", "empty-text", "striped", "disabled"];
    }

    #label = "";
    #columns = [];
    #rows = [];
    #rowKey = "id";
    #selectionMode = "single";
    #selectedKeys = [];
    #activeKey = "";
    #sortKey = "";
    #sortDirection = "ascending";
    #emptyText = "No rows.";
    #striped = true;
    #disabled = false;
    #headerReconciler = null;
    #rowReconciler = null;
    #rowSequence = 0;

    constructor()
    {
        super();
        this.handleHeaderClick = this.handleHeaderClick.bind(this);
        this.handleBodyClick = this.handleBodyClick.bind(this);
        this.handleBodyDoubleClick = this.handleBodyDoubleClick.bind(this);
        this.handleTableKeyDown = this.handleTableKeyDown.bind(this);

        this.columnKeyOf = this.columnKeyOf.bind(this);
        this.createHeaderCell = this.createHeaderCell.bind(this);
        this.updateHeaderCell = this.updateHeaderCell.bind(this);

        this.gridRowKeyOf = this.gridRowKeyOf.bind(this);
        this.createRowElement = this.createRowElement.bind(this);
        this.updateRowElement = this.updateRowElement.bind(this);

        this.cellKeyOf = this.cellKeyOf.bind(this);
        this.createCell = this.createCell.bind(this);
        this.updateCell = this.updateCell.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-data-grid");

        const caption = createElement("span", "tg-data-grid__caption");
        caption.id = this.elementId + "-caption";

        const viewport = createElement("div", "tg-data-grid__viewport");

        const table = createElement("table", "tg-data-grid__table");
        table.id = this.elementId + "-table";
        table.setAttribute("role", "grid");
        table.setAttribute("tabindex", "0");
        table.setAttribute("aria-labelledby", caption.id);

        const head = createElement("thead", "tg-data-grid__head");
        const headRow = createElement("tr", "tg-data-grid__head-row");
        head.append(headRow);

        const body = createElement("tbody", "tg-data-grid__body");
        table.append(head, body);
        viewport.append(table);

        const empty = createElement("p", "tg-data-grid__empty");
        const status = createElement("p", "tg-data-grid__status");

        this.defineElement("caption", caption);
        this.defineElement("viewport", viewport);
        this.defineElement("table", table);
        this.defineElement("head", head);
        this.defineElement("headRow", headRow);
        this.defineElement("body", body);
        this.defineElement("empty", empty);
        this.defineElement("status", status);

        this.append(caption, viewport, empty, status);

        this.#headerReconciler = new ChildReconciler(headRow,
        {
            keyOf: this.columnKeyOf,
            create: this.createHeaderCell,
            update: this.updateHeaderCell
        });

        this.#rowReconciler = new ChildReconciler(body,
        {
            keyOf: this.gridRowKeyOf,
            create: this.createRowElement,
            update: this.updateRowElement
        });
    }

    bindEvents()
    {
        const headRow = this.getElement("headRow");
        const body = this.getElement("body");
        const table = this.getElement("table");

        this.addManagedListener(headRow, "click", this.handleHeaderClick);
        this.addManagedListener(body, "click", this.handleBodyClick);
        this.addManagedListener(body, "dblclick", this.handleBodyDoubleClick);
        this.addManagedListener(table, "keydown", this.handleTableKeyDown);
    }

    syncElements()
    {
        const caption = this.getElement("caption");
        const table = this.getElement("table");
        const empty = this.getElement("empty");
        const status = this.getElement("status");

        setText(caption, this.#label);
        setClass(caption, "tg-data-grid__caption--empty", this.#label === "");

        this.#headerReconciler.reconcile(this.#columns);

        const displayed = this.displayedRows();
        this.#rowReconciler.reconcile(displayed);

        setText(empty, this.#emptyText);
        setClass(empty, "tg-data-grid__empty--visible", displayed.length === 0);

        setText(status, this.#statusText(displayed));
        setClass(this, "tg-data-grid--striped", this.#striped);
        setClass(this, "tg-data-grid--disabled", this.#disabled);

        table.setAttribute("aria-disabled", this.#disabled === true ? "true" : "false");
        table.setAttribute("tabindex", this.#disabled === true ? "-1" : "0");
        table.setAttribute("aria-rowcount", String(displayed.length));

        const activeRow = this.#activeKey === "" ? undefined : this.#rowReconciler.nodeForKey(this.#activeKey);

        if (activeRow === undefined)
        {
            table.removeAttribute("aria-activedescendant");
            return;
        }

        table.setAttribute("aria-activedescendant", activeRow.id);
    }

    #statusText(displayed)
    {
        if (displayed.length === 0)
        {
            return "";
        }

        const selectedCount = this.#selectedKeys.length;

        if (selectedCount === 0)
        {
            return displayed.length + " rows";
        }

        return displayed.length + " rows, " + selectedCount + " selected";
    }

    // -------------------------------------------------------------------------
    // Header cells
    // -------------------------------------------------------------------------

    columnKeyOf(column, index)
    {
        return column === null || column.key === undefined ? String(index) : String(column.key);
    }

    createHeaderCell(column, key)
    {
        const cell = createElement("th", "tg-data-grid__header-cell");
        cell.setAttribute("scope", "col");
        cell.dataset.key = key;

        const title = createElement("span", "tg-data-grid__header-title");
        const indicator = createElement("span", "tg-data-grid__sort-indicator");
        indicator.setAttribute("aria-hidden", "true");

        cell.append(title, indicator);
        attachParts(cell, { title: title, indicator: indicator });
        return cell;
    }

    updateHeaderCell(cell, column, index, key)
    {
        const parts = partsOf(cell);
        const title = toText(column.title) === "" ? key : toText(column.title);
        const isSortable = column.sortable === true;
        const isSorted = isSortable === true && key === this.#sortKey;

        setText(parts.title, title);
        cell.style.width = toText(column.width);
        cell.dataset.align = toText(column.align) === "" ? "left" : toText(column.align);

        setClass(cell, "tg-data-grid__header-cell--sortable", isSortable);
        setClass(cell, "tg-data-grid__header-cell--sorted", isSorted);
        setText(parts.indicator, this.#sortIndicatorFor(isSorted));

        if (isSortable === false)
        {
            cell.removeAttribute("aria-sort");
            return;
        }

        cell.setAttribute("aria-sort", isSorted === true ? this.#sortDirection : "none");
    }

    #sortIndicatorFor(isSorted)
    {
        if (isSorted === false)
        {
            return "";
        }

        return this.#sortDirection === "descending" ? "▾" : "▴";
    }

    // -------------------------------------------------------------------------
    // Rows
    // -------------------------------------------------------------------------

    gridRowKeyOf(row, index)
    {
        if (row === null || typeof row !== "object")
        {
            return String(index);
        }

        const value = row[this.#rowKey];
        return value === undefined ? String(index) : String(value);
    }

    createRowElement(row, key)
    {
        this.#rowSequence = this.#rowSequence + 1;

        const element = createElement("tr", "tg-data-grid__row");
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

    updateRowElement(element, row, index, key)
    {
        const parts = partsOf(element);
        const isSelected = this.#selectedKeys.indexOf(key) >= 0;

        parts.cells.reconcile(this.#cellItemsFor(row));

        setClass(element, "tg-data-grid__row--selected", isSelected);
        setClass(element, "tg-data-grid__row--active", key === this.#activeKey);
        setClass(element, "tg-data-grid__row--odd", index % 2 === 1);

        element.setAttribute("aria-selected", isSelected === true ? "true" : "false");
        element.setAttribute("aria-rowindex", String(index + 1));
    }

    #cellItemsFor(row)
    {
        const items = [];

        for (let index = 0; index < this.#columns.length; index = index + 1)
        {
            items.push({ column: this.#columns[index], row: row });
        }

        return items;
    }

    cellKeyOf(item, index)
    {
        return this.columnKeyOf(item.column, index);
    }

    createCell(item, key)
    {
        const cell = createElement("td", "tg-data-grid__cell");
        cell.setAttribute("role", "gridcell");
        cell.dataset.key = key;

        const text = createElement("span", "tg-data-grid__text");
        cell.append(text);
        attachParts(cell, { text: text });
        return cell;
    }

    updateCell(cell, item)
    {
        const parts = partsOf(cell);
        const column = item.column;

        setText(parts.text, this.cellValue(item.row, column));
        cell.dataset.align = toText(column.align) === "" ? "left" : toText(column.align);
    }

    /**
     * Resolves the displayed text of one cell.
     * @param {object} row
     * @param {object} column
     * @returns {string}
     */
    cellValue(row, column)
    {
        if (row === null || column === null || column.key === undefined)
        {
            return "";
        }

        const raw = row[column.key];

        if (typeof column.format === "function")
        {
            return toText(column.format(raw, row));
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

        if (name === "row-key")
        {
            this.#rowKey = newValue === null ? "id" : newValue;
            return;
        }

        if (name === "selection-mode")
        {
            this.#selectionMode = newValue === null ? "single" : newValue;
            return;
        }

        if (name === "sort-key")
        {
            this.#sortKey = toText(newValue);
            return;
        }

        if (name === "sort-direction")
        {
            this.#sortDirection = newValue === "descending" ? "descending" : "ascending";
            return;
        }

        if (name === "empty-text")
        {
            this.#emptyText = newValue === null ? "No rows." : newValue;
            return;
        }

        if (name === "striped")
        {
            this.#striped = attributeToBoolean(newValue);
            return;
        }

        if (name === "disabled")
        {
            this.#disabled = attributeToBoolean(newValue);
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

    get rows()
    {
        return this.#rows.slice();
    }

    set rows(value)
    {
        this.setRows(value);
    }

    get rowKey()
    {
        return this.#rowKey;
    }

    set rowKey(value)
    {
        this.#rowKey = value === undefined || value === null || value === "" ? "id" : String(value);
        this.requestUpdate();
    }

    get selectionMode()
    {
        return this.#selectionMode;
    }

    set selectionMode(value)
    {
        this.#selectionMode = value === undefined || value === null ? "single" : String(value);

        if (this.#selectionMode === "none")
        {
            this.#selectedKeys = [];
        }

        if (this.#selectionMode === "single" && this.#selectedKeys.length > 1)
        {
            this.#selectedKeys = [this.#selectedKeys[0]];
        }

        this.requestUpdate();
    }

    get selectedKey()
    {
        return this.#selectedKeys.length === 0 ? "" : this.#selectedKeys[0];
    }

    set selectedKey(value)
    {
        const key = toText(value);
        this.#selectedKeys = key === "" ? [] : [key];
        this.#activeKey = key;
        this.requestUpdate();
    }

    get selectedKeys()
    {
        return this.#selectedKeys.slice();
    }

    get selectedRow()
    {
        return this.getRow(this.selectedKey);
    }

    get selectedRows()
    {
        const selected = [];

        for (let index = 0; index < this.#selectedKeys.length; index = index + 1)
        {
            const row = this.getRow(this.#selectedKeys[index]);

            if (row !== null)
            {
                selected.push(row);
            }
        }

        return selected;
    }

    get activeKey()
    {
        return this.#activeKey;
    }

    get sortKey()
    {
        return this.#sortKey;
    }

    get sortDirection()
    {
        return this.#sortDirection;
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

    get striped()
    {
        return this.#striped;
    }

    set striped(value)
    {
        this.#striped = value === true;
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
     * Replaces the rows. Selection survives for keys that still exist.
     * @param {Array<object>} rowList
     */
    setRows(rowList)
    {
        this.#rows = Array.isArray(rowList) ? rowList.slice() : [];

        const availableKeys = this.#allKeys();
        const kept = [];

        for (let index = 0; index < this.#selectedKeys.length; index = index + 1)
        {
            const key = this.#selectedKeys[index];

            if (availableKeys.indexOf(key) >= 0)
            {
                kept.push(key);
            }
        }

        this.#selectedKeys = kept;

        if (availableKeys.indexOf(this.#activeKey) < 0)
        {
            this.#activeKey = "";
        }

        this.requestUpdate();
    }

    #allKeys()
    {
        const keys = [];

        for (let index = 0; index < this.#rows.length; index = index + 1)
        {
            keys.push(this.gridRowKeyOf(this.#rows[index], index));
        }

        return keys;
    }

    /**
     * Sorts the view. Passing the current key without a direction reverses it.
     *
     * @param {string} key Column key, or an empty string to clear sorting.
     * @param {string} [direction] "ascending" or "descending".
     * @returns {boolean} True when the sort changed.
     */
    sortBy(key, direction)
    {
        const nextKey = toText(key);
        let nextDirection = direction === "descending" ? "descending" : "ascending";

        if (direction === undefined && nextKey === this.#sortKey && this.#sortDirection === "ascending")
        {
            nextDirection = "descending";
        }

        if (nextKey === this.#sortKey && nextDirection === this.#sortDirection)
        {
            return false;
        }

        this.#sortKey = nextKey;
        this.#sortDirection = nextDirection;
        this.requestUpdate();
        this.emit("tg-sort", { key: nextKey, direction: nextDirection });
        return true;
    }

    /**
     * The rows as currently displayed, after sorting.
     * @returns {Array<object>}
     */
    displayedRows()
    {
        if (this.#sortKey === "")
        {
            return this.#rows.slice();
        }

        const column = this.#columnFor(this.#sortKey);

        if (column === null)
        {
            return this.#rows.slice();
        }

        const sorted = this.#rows.slice();
        const key = this.#sortKey;
        const factor = this.#sortDirection === "descending" ? -1 : 1;
        const compare = typeof column.compare === "function" ? column.compare : compareValues;

        sorted.sort(function compareRows(left, right)
        {
            return factor * compare(left[key], right[key], left, right);
        });

        return sorted;
    }

    #columnFor(key)
    {
        for (let index = 0; index < this.#columns.length; index = index + 1)
        {
            if (this.columnKeyOf(this.#columns[index], index) === key)
            {
                return this.#columns[index];
            }
        }

        return null;
    }

    /**
     * @param {string} key
     * @returns {object|null}
     */
    getRow(key)
    {
        const wanted = toText(key);

        for (let index = 0; index < this.#rows.length; index = index + 1)
        {
            if (this.gridRowKeyOf(this.#rows[index], index) === wanted)
            {
                return this.#rows[index];
            }
        }

        return null;
    }

    /**
     * @param {string} key
     * @returns {boolean} True when the selection changed.
     */
    selectRow(key)
    {
        const wanted = toText(key);

        if (this.#selectionMode === "none" || this.#disabled === true)
        {
            return false;
        }

        if (this.#selectionMode === "multiple")
        {
            return this.#applySelection(this.#selectedKeys.concat([wanted]), wanted);
        }

        return this.#applySelection([wanted], wanted);
    }

    /**
     * @param {string} key
     * @returns {boolean} True when the selection changed.
     */
    toggleRow(key)
    {
        const wanted = toText(key);

        if (this.#selectionMode !== "multiple")
        {
            return this.selectRow(wanted);
        }

        const position = this.#selectedKeys.indexOf(wanted);

        if (position < 0)
        {
            return this.#applySelection(this.#selectedKeys.concat([wanted]), wanted);
        }

        const next = this.#selectedKeys.slice();
        next.splice(position, 1);
        return this.#applySelection(next, wanted);
    }

    clearSelection()
    {
        return this.#applySelection([], this.#activeKey);
    }

    #applySelection(keys, activeKey)
    {
        const unique = [];

        for (let index = 0; index < keys.length; index = index + 1)
        {
            if (unique.indexOf(keys[index]) < 0)
            {
                unique.push(keys[index]);
            }
        }

        const changed = unique.join(" ") !== this.#selectedKeys.join(" ");
        this.#selectedKeys = unique;
        this.#activeKey = toText(activeKey);
        this.requestUpdate();

        if (changed === true)
        {
            this.emit("tg-change",
            {
                key: this.selectedKey,
                keys: this.selectedKeys,
                row: this.selectedRow,
                rows: this.selectedRows
            });
        }

        return changed;
    }

    /**
     * @param {string} key
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    activateRow(key)
    {
        return this.performAction({ source: "api", key: toText(key) });
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

    handleHeaderClick(event)
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

        const cell = target.closest(".tg-data-grid__header-cell");

        if (cell === null)
        {
            return;
        }

        const key = cell.dataset.key;
        const column = this.#columnFor(key);

        if (column === null || column.sortable !== true)
        {
            return;
        }

        this.sortBy(key);
    }

    handleBodyClick(event)
    {
        const key = this.#keyFromEvent(event);

        if (key === null || this.#disabled === true)
        {
            return;
        }

        this.#setActiveKey(key);

        if (this.#selectionMode === "multiple" && (event.ctrlKey === true || event.metaKey === true))
        {
            this.toggleRow(key);
            return;
        }

        this.selectRow(key);
    }

    handleBodyDoubleClick(event)
    {
        const key = this.#keyFromEvent(event);

        if (key === null || this.#disabled === true)
        {
            return;
        }

        this.performAction({ source: "pointer", key: key });
    }

    handleTableKeyDown(event)
    {
        if (this.#disabled === true)
        {
            return;
        }

        const displayed = this.displayedRows();

        if (displayed.length === 0)
        {
            return;
        }

        const keys = [];

        for (let index = 0; index < displayed.length; index = index + 1)
        {
            keys.push(this.gridRowKeyOf(displayed[index], index));
        }

        if (event.key === "Enter")
        {
            event.preventDefault();

            if (this.#activeKey !== "")
            {
                this.performAction({ source: "keyboard", key: this.#activeKey });
            }

            return;
        }

        if (event.key === " ")
        {
            event.preventDefault();

            if (this.#activeKey !== "")
            {
                this.toggleRow(this.#activeKey);
            }

            return;
        }

        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End")
        {
            event.preventDefault();
            this.#moveActive(event.key, keys);
        }
    }

    #moveActive(key, keys)
    {
        const nextIndex = nextIndexForKey(key, keys.indexOf(this.#activeKey), keys.length);

        if (nextIndex < 0)
        {
            return;
        }

        this.#setActiveKey(keys[nextIndex]);

        if (this.#selectionMode === "single")
        {
            this.selectRow(keys[nextIndex]);
        }
    }

    #setActiveKey(key)
    {
        const wanted = toText(key);

        if (wanted === this.#activeKey)
        {
            return;
        }

        this.#activeKey = wanted;
        this.requestUpdate();
    }

    #keyFromEvent(event)
    {
        const target = event.target;

        if (target === null || typeof target.closest !== "function")
        {
            return null;
        }

        const row = target.closest(".tg-data-grid__row");

        if (row === null || row.dataset === undefined)
        {
            return null;
        }

        const key = row.dataset.key;
        return key === undefined ? null : key;
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        const requested = payload !== null && payload !== undefined && payload.key !== undefined;
        const key = requested === true ? toText(payload.key) : this.#activeKey;
        const row = this.getRow(key);

        if (this.#disabled === true || row === null)
        {
            return { action: "activate", handled: false, detail: { key: key, row: row } };
        }

        this.#setActiveKey(key);
        this.selectRow(key);

        return { action: "activate", handled: true, detail: { key: key, row: row } };
    }
}

/**
 * Default column comparator: numbers numerically, everything else as text.
 *
 * @param {*} left
 * @param {*} right
 * @returns {number}
 */
function compareValues(left, right)
{
    if (typeof left === "number" && typeof right === "number")
    {
        return left - right;
    }

    const leftText = left === undefined || left === null ? "" : String(left);
    const rightText = right === undefined || right === null ? "" : String(right);

    return leftText.localeCompare(rightText, undefined, { sensitivity: "base", numeric: true });
}
