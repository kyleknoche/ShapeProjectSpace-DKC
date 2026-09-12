import { AbstractElement } from "../gen1/AbstractElement.js";
import { ChildReconciler } from "./support/ChildReconciler.js";
import { nextIndexForKey, isNavigationKey } from "./support/navigation.js";
import { createElement, setText, setClass, attachParts, partsOf, attributeToBoolean, toText } from "./support/dom.js";

/**
 * GEN 2 - ListBox
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> ListBox
 *
 * A selectable list of items with keyboard navigation, single or multiple
 * selection, an empty state, and a horizontal mode. It is the general list
 * surface of the library, and it is the base of any application list that wants
 * selection semantics without re-implementing them.
 *
 * Items are data:
 *
 *     listBox.items =
 *     [
 *         { value: "a", label: "Alpha", description: "...", badge: "3", disabled: false }
 *     ];
 *
 * Rows are reconciled by value. Re-assigning items keeps the rows whose values
 * survive, which is what makes selection, focus and scrolling stable across an
 * update.
 *
 * Focus model
 *   The list container is the focusable element and reports the current item
 *   with aria-activedescendant. Rows are never focused individually, so a data
 *   update cannot move focus out of the control.
 *
 * Attributes
 *   label, value, selection-mode ("single" | "multiple" | "none"),
 *   orientation ("vertical" | "horizontal"), empty-text, disabled,
 *   activate-on-select
 *
 * Properties
 *   label, items, value, values, selectionMode, orientation, emptyText,
 *   disabled, activateOnSelect, activeValue, selectedValues, selectedItems
 *
 * Field contract (used by Form)
 *   isFieldControl, name, formValue, validate(), setValidationMessage()
 *
 * Methods
 *   selectValue(v), toggleValue(v), selectValues(list), clearSelection(),
 *   activateValue(v), focusValue(v), getItem(v), indexOfValue(v), focus()
 *
 * Events
 *   tg-change     Selection changed. detail { value, values, item, items }
 *   tg-highlight  The active (focused) item moved. detail { value, item }
 *   tg-action     detail.action is "activate".
 *
 * Abstract action
 *   "activate" - open, run or commit the current item. Selection and activation
 *   are deliberately different: selecting an item says which one you mean, and
 *   activating it says do something with it. Enter, Space and a double click
 *   activate; a single click selects, and also activates when activateOnSelect
 *   is set.
 */
export class ListBox extends AbstractElement
{
    static elementName = "tg-list-box";

    static get observedAttributes()
    {
        return ["label", "value", "name", "selection-mode", "orientation", "empty-text", "disabled", "activate-on-select", "required"];
    }

    #label = "";
    #name = "";
    #items = [];
    #selectedKeys = [];
    #activeKey = "";
    #selectionMode = "single";
    #orientation = "vertical";
    #emptyText = "Nothing to show.";
    #disabled = false;
    #required = false;
    #activateOnSelect = false;
    #invalid = false;
    #validationMessage = "";
    #reconciler = null;
    #rowSequence = 0;

    constructor()
    {
        super();
        this.handleListClick = this.handleListClick.bind(this);
        this.handleListDoubleClick = this.handleListDoubleClick.bind(this);
        this.handleListKeyDown = this.handleListKeyDown.bind(this);
        this.itemKeyOf = this.itemKeyOf.bind(this);
        this.createItemRow = this.createItemRow.bind(this);
        this.updateItemRow = this.updateItemRow.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-list-box");

        const caption = createElement("span", "tg-list-box__caption");
        caption.id = this.elementId + "-caption";

        const list = createElement("div", "tg-list-box__list");
        list.id = this.elementId + "-list";
        list.setAttribute("role", "listbox");
        list.setAttribute("tabindex", "0");
        list.setAttribute("aria-labelledby", caption.id);

        const empty = createElement("p", "tg-list-box__empty");
        const message = createElement("p", "tg-field__hint");

        this.defineElement("caption", caption);
        this.defineElement("list", list);
        this.defineElement("empty", empty);
        this.defineElement("message", message);

        this.append(caption, list, empty, message);

        this.#reconciler = new ChildReconciler(list,
        {
            keyOf: this.itemKeyOf,
            create: this.createItemRow,
            update: this.updateItemRow
        });
    }

    bindEvents()
    {
        const list = this.getElement("list");
        this.addManagedListener(list, "click", this.handleListClick);
        this.addManagedListener(list, "dblclick", this.handleListDoubleClick);
        this.addManagedListener(list, "keydown", this.handleListKeyDown);
    }

    syncElements()
    {
        const caption = this.getElement("caption");
        const list = this.getElement("list");
        const empty = this.getElement("empty");
        const message = this.getElement("message");

        setText(caption, this.#label);
        setClass(caption, "tg-list-box__caption--empty", this.#label === "");

        this.#reconciler.reconcile(this.#items);

        const isEmpty = this.#items.length === 0;
        setText(empty, this.#emptyText);
        setClass(empty, "tg-list-box__empty--visible", isEmpty);

        list.setAttribute("aria-multiselectable", this.#selectionMode === "multiple" ? "true" : "false");
        list.setAttribute("aria-disabled", this.#disabled === true ? "true" : "false");
        list.setAttribute("tabindex", this.#disabled === true ? "-1" : "0");

        this.#syncActiveDescendant(list);

        setText(message, this.#validationMessage);
        setClass(message, "tg-field__hint--error", this.#invalid);
        setClass(message, "tg-field__hint--empty", this.#validationMessage === "");

        setClass(this, "tg-list-box--disabled", this.#disabled);
        setClass(this, "tg-list-box--invalid", this.#invalid);

        if (this.dataset.orientation !== this.#orientation)
        {
            this.dataset.orientation = this.#orientation;
        }
    }

    #syncActiveDescendant(list)
    {
        const row = this.#activeKey === "" ? undefined : this.#reconciler.nodeForKey(this.#activeKey);

        if (row === undefined)
        {
            list.removeAttribute("aria-activedescendant");
            return;
        }

        list.setAttribute("aria-activedescendant", row.id);
    }

    // -------------------------------------------------------------------------
    // Row construction
    // -------------------------------------------------------------------------

    itemKeyOf(item, index)
    {
        if (item === null || typeof item !== "object")
        {
            return String(item);
        }

        return item.value === undefined ? String(index) : String(item.value);
    }

    createItemRow(item, key)
    {
        this.#rowSequence = this.#rowSequence + 1;

        const row = createElement("div", "tg-list-box__item");
        row.id = this.elementId + "-item-" + this.#rowSequence;
        row.setAttribute("role", "option");
        row.dataset.key = key;

        const marker = createElement("span", "tg-list-box__marker");
        marker.setAttribute("aria-hidden", "true");

        const body = createElement("span", "tg-list-box__body");
        const caption = createElement("span", "tg-list-box__label");
        const description = createElement("span", "tg-list-box__description");
        body.append(caption, description);

        const badge = createElement("span", "tg-list-box__badge");

        row.append(marker, body, badge);
        attachParts(row, { marker: marker, body: body, caption: caption, description: description, badge: badge });
        return row;
    }

    updateItemRow(row, item, index, key)
    {
        const parts = partsOf(row);
        const isObject = item !== null && typeof item === "object";
        const caption = isObject === true ? toText(item.label) : toText(item);
        const description = isObject === true ? toText(item.description) : "";
        const badge = isObject === true ? toText(item.badge) : "";
        const itemDisabled = isObject === true && item.disabled === true;
        const isSelected = this.#selectedKeys.indexOf(key) >= 0;

        setText(parts.caption, caption === "" ? key : caption);
        setText(parts.description, description);
        setClass(parts.description, "tg-list-box__description--visible", description !== "");
        setText(parts.badge, badge);
        setClass(parts.badge, "tg-list-box__badge--visible", badge !== "");

        setClass(row, "tg-list-box__item--selected", isSelected);
        setClass(row, "tg-list-box__item--active", key === this.#activeKey);
        setClass(row, "tg-list-box__item--disabled", itemDisabled || this.#disabled === true);

        row.setAttribute("aria-selected", isSelected === true ? "true" : "false");
        row.setAttribute("aria-disabled", itemDisabled === true ? "true" : "false");
    }

    onAttributeChanged(name, oldValue, newValue)
    {
        if (name === "label")
        {
            this.#label = toText(newValue);
            return;
        }

        if (name === "name")
        {
            this.#name = toText(newValue);
            return;
        }

        if (name === "value")
        {
            this.#selectedKeys = newValue === null || newValue === "" ? [] : [newValue];
            this.#activeKey = this.#selectedKeys.length === 0 ? "" : this.#selectedKeys[0];
            return;
        }

        if (name === "selection-mode")
        {
            this.#selectionMode = newValue === null ? "single" : newValue;
            return;
        }

        if (name === "orientation")
        {
            this.#orientation = newValue === null ? "vertical" : newValue;
            return;
        }

        if (name === "empty-text")
        {
            this.#emptyText = newValue === null ? "Nothing to show." : newValue;
            return;
        }

        if (name === "disabled")
        {
            this.#disabled = attributeToBoolean(newValue);
            return;
        }

        if (name === "required")
        {
            this.#required = attributeToBoolean(newValue);
            return;
        }

        if (name === "activate-on-select")
        {
            this.#activateOnSelect = attributeToBoolean(newValue);
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

    get name()
    {
        return this.#name;
    }

    set name(value)
    {
        this.#name = toText(value);
        this.requestUpdate();
    }

    get items()
    {
        return this.#items.slice();
    }

    set items(value)
    {
        this.#items = Array.isArray(value) ? value.slice() : [];
        this.#dropMissingKeys();
        this.requestUpdate();
    }

    #dropMissingKeys()
    {
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
    }

    #allKeys()
    {
        const keys = [];

        for (let index = 0; index < this.#items.length; index = index + 1)
        {
            keys.push(this.itemKeyOf(this.#items[index], index));
        }

        return keys;
    }

    /**
     * The single selected value. In multiple mode this is the first selection.
     */
    get value()
    {
        return this.#selectedKeys.length === 0 ? "" : this.#selectedKeys[0];
    }

    set value(value)
    {
        const key = toText(value);
        this.#selectedKeys = key === "" ? [] : [key];
        this.#activeKey = key;
        this.requestUpdate();
    }

    /**
     * Every selected value, in selection order.
     * @returns {string[]}
     */
    get values()
    {
        return this.#selectedKeys.slice();
    }

    set values(value)
    {
        this.#selectedKeys = Array.isArray(value) ? value.map(toText) : [];
        this.requestUpdate();
    }

    get selectedValues()
    {
        return this.#selectedKeys.slice();
    }

    get selectedItems()
    {
        const selected = [];

        for (let index = 0; index < this.#selectedKeys.length; index = index + 1)
        {
            const item = this.getItem(this.#selectedKeys[index]);

            if (item !== null)
            {
                selected.push(item);
            }
        }

        return selected;
    }

    get activeValue()
    {
        return this.#activeKey;
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

    get orientation()
    {
        return this.#orientation;
    }

    set orientation(value)
    {
        this.#orientation = value === undefined || value === null ? "vertical" : String(value);
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

    get disabled()
    {
        return this.#disabled;
    }

    set disabled(value)
    {
        this.#disabled = value === true;
        this.requestUpdate();
    }

    get required()
    {
        return this.#required;
    }

    set required(value)
    {
        this.#required = value === true;
        this.requestUpdate();
    }

    get activateOnSelect()
    {
        return this.#activateOnSelect;
    }

    set activateOnSelect(value)
    {
        this.#activateOnSelect = value === true;
        this.requestUpdate();
    }

    get invalid()
    {
        return this.#invalid;
    }

    get validationMessage()
    {
        return this.#validationMessage;
    }

    // -------------------------------------------------------------------------
    // Field contract
    // -------------------------------------------------------------------------

    get isFieldControl()
    {
        return true;
    }

    get formValue()
    {
        if (this.#selectionMode === "multiple")
        {
            return this.#selectedKeys.slice();
        }

        return this.value;
    }

    set formValue(value)
    {
        if (Array.isArray(value) === true)
        {
            this.values = value;
            return;
        }

        this.value = value;
    }

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    /**
     * Selects a value, replacing the current selection in single mode.
     * @param {string} value
     * @returns {boolean} True when the selection changed.
     */
    selectValue(value)
    {
        const key = toText(value);

        if (this.#selectionMode === "none" || this.#disabled === true)
        {
            return false;
        }

        if (this.#selectionMode === "multiple")
        {
            return this.#applySelection(this.#selectedKeys.concat([key]).filter(uniqueFilter), key);
        }

        return this.#applySelection([key], key);
    }

    /**
     * Adds or removes a value from the selection. Multiple mode only; in single
     * mode this behaves like selectValue().
     * @param {string} value
     * @returns {boolean} True when the selection changed.
     */
    toggleValue(value)
    {
        const key = toText(value);

        if (this.#selectionMode !== "multiple")
        {
            return this.selectValue(key);
        }

        const position = this.#selectedKeys.indexOf(key);

        if (position < 0)
        {
            return this.#applySelection(this.#selectedKeys.concat([key]), key);
        }

        const next = this.#selectedKeys.slice();
        next.splice(position, 1);
        return this.#applySelection(next, key);
    }

    /**
     * Replaces the entire selection.
     * @param {string[]} valueList
     * @returns {boolean} True when the selection changed.
     */
    selectValues(valueList)
    {
        const keys = Array.isArray(valueList) ? valueList.map(toText) : [];
        return this.#applySelection(keys, keys.length === 0 ? this.#activeKey : keys[0]);
    }

    clearSelection()
    {
        return this.#applySelection([], this.#activeKey);
    }

    #applySelection(keys, activeKey)
    {
        const unique = keys.filter(uniqueFilter);
        const changed = unique.join(" ") !== this.#selectedKeys.join(" ");

        this.#selectedKeys = unique;
        this.#activeKey = toText(activeKey);

        if (this.#invalid === true)
        {
            this.setValidationMessage("");
        }

        this.requestUpdate();

        if (changed === true)
        {
            this.emit("tg-change",
            {
                value: this.value,
                values: this.selectedValues,
                item: this.getItem(this.value),
                items: this.selectedItems,
                name: this.#name
            });
        }

        return changed;
    }

    /**
     * Activates a value: selects it if selection is enabled, then performs the
     * abstract action.
     * @param {string} value
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    activateValue(value)
    {
        return this.performAction({ source: "api", value: toText(value) });
    }

    /**
     * Moves the active (keyboard) item without changing the selection.
     * @param {string} value
     */
    focusValue(value)
    {
        const key = toText(value);

        if (key === this.#activeKey)
        {
            return;
        }

        this.#activeKey = key;
        this.requestUpdate();
        this.emit("tg-highlight", { value: key, item: this.getItem(key) });
    }

    /**
     * @param {string} value
     * @returns {object|null}
     */
    getItem(value)
    {
        const key = toText(value);

        for (let index = 0; index < this.#items.length; index = index + 1)
        {
            const item = this.#items[index];

            if (this.itemKeyOf(item, index) === key)
            {
                return item;
            }
        }

        return null;
    }

    /**
     * @param {string} value
     * @returns {number} -1 when absent.
     */
    indexOfValue(value)
    {
        return this.#allKeys().indexOf(toText(value));
    }

    focus(options)
    {
        if (this.isBuilt === false)
        {
            return;
        }

        const list = this.getElement("list");
        list.focus(options);
    }

    /**
     * @returns {{valid: boolean, message: string}}
     */
    validate()
    {
        if (this.#required === true && this.#selectedKeys.length === 0)
        {
            this.setValidationMessage("Choose at least one item.");
            return { valid: false, message: this.#validationMessage };
        }

        this.setValidationMessage("");
        return { valid: true, message: "" };
    }

    /**
     * @param {string} message
     */
    setValidationMessage(message)
    {
        const text = toText(message);
        this.#validationMessage = text;
        this.#invalid = text !== "";
        this.requestUpdate();
    }

    // -------------------------------------------------------------------------
    // Gestures
    // -------------------------------------------------------------------------

    handleListClick(event)
    {
        const key = this.#keyFromEvent(event);

        if (key === null || this.#disabled === true)
        {
            return;
        }

        const item = this.getItem(key);

        if (item !== null && typeof item === "object" && item.disabled === true)
        {
            return;
        }

        this.focusValue(key);

        if (this.#selectionMode === "multiple" && (event.ctrlKey === true || event.metaKey === true))
        {
            this.toggleValue(key);
        }
        else
        {
            this.selectValue(key);
        }

        if (this.#activateOnSelect === true)
        {
            this.performAction({ source: "pointer", value: key });
        }
    }

    handleListDoubleClick(event)
    {
        const key = this.#keyFromEvent(event);

        if (key === null || this.#disabled === true || this.#activateOnSelect === true)
        {
            return;
        }

        this.performAction({ source: "pointer", value: key });
    }

    handleListKeyDown(event)
    {
        if (this.#disabled === true)
        {
            return;
        }

        if (event.key === "Enter" || event.key === " ")
        {
            event.preventDefault();

            if (this.#activeKey !== "")
            {
                this.selectValue(this.#activeKey);
                this.performAction({ source: "keyboard", value: this.#activeKey });
            }

            return;
        }

        if (isNavigationKey(event.key, this.#orientation) === false)
        {
            return;
        }

        event.preventDefault();
        this.#moveActive(event.key);
    }

    #moveActive(key)
    {
        const keys = this.#allKeys();
        const nextIndex = nextIndexForKey(key, keys.indexOf(this.#activeKey), keys.length, this.#orientation);

        if (nextIndex < 0)
        {
            return;
        }

        this.focusValue(keys[nextIndex]);

        if (this.#selectionMode === "single")
        {
            this.selectValue(keys[nextIndex]);
        }
    }

    #keyFromEvent(event)
    {
        const target = event.target;

        if (target === null || typeof target.closest !== "function")
        {
            return null;
        }

        const row = target.closest(".tg-list-box__item");

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
        const requested = payload !== null && payload !== undefined && payload.value !== undefined;
        const key = requested === true ? toText(payload.value) : this.#activeKey;
        const item = this.getItem(key);

        if (this.#disabled === true || key === "" || item === null)
        {
            return { action: "activate", handled: false, detail: { value: key, item: item, name: this.#name } };
        }

        if (typeof item === "object" && item.disabled === true)
        {
            return { action: "activate", handled: false, detail: { value: key, item: item, name: this.#name } };
        }

        this.#activeKey = key;
        this.requestUpdate();

        return {
            action: "activate",
            handled: true,
            detail: { value: key, item: item, index: this.indexOfValue(key), name: this.#name }
        };
    }
}

/**
 * Array filter that keeps the first occurrence of each value.
 * @param {string} value
 * @param {number} index
 * @param {string[]} list
 * @returns {boolean}
 */
function uniqueFilter(value, index, list)
{
    return list.indexOf(value) === index;
}
