import { AbstractElement } from "../gen1/AbstractElement.js";
import { ChildReconciler } from "./support/ChildReconciler.js";
import { createElement, setText, setClass, setOptionalAttribute, attributeToBoolean, toText } from "./support/dom.js";

/**
 * GEN 2 - DropDown
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> DropDown
 *
 * A single-selection picker backed by a native select. The native control is
 * used on purpose: a hand-built popup listbox would have to re-implement typed
 * navigation, platform popup placement and mobile pickers, and would be worse
 * at all three.
 *
 * Options are supplied as data:
 *
 *     dropDown.items =
 *     [
 *         { value: "a", label: "Alpha", group: "Letters", disabled: false }
 *     ];
 *
 * Options are reconciled by value, so re-assigning items keeps the option nodes
 * whose values survive.
 *
 * Attributes
 *   label, name, value, placeholder, hint, disabled, required
 *
 * Properties
 *   label, name, value, items, placeholder, hint, disabled, required,
 *   selectedItem (read-only), invalid, validationMessage
 *
 * Field contract (used by Form)
 *   isFieldControl, name, formValue, validate(), setValidationMessage()
 *
 * Methods
 *   selectValue(value), getItem(value), focus(), validate(), setValidationMessage(text)
 *
 * Events
 *   tg-change   detail { value, previousValue, item, name }
 *   tg-action   detail.action is "select".
 *
 * Abstract action
 *   "select" - commit a choice. The change event of the native select is
 *   translated into a payload and routed here, so the picker has one path into
 *   its value exactly like every other control in the library.
 */
export class DropDown extends AbstractElement
{
    static elementName = "tg-drop-down";

    static get observedAttributes()
    {
        return ["label", "name", "value", "placeholder", "hint", "disabled", "required"];
    }

    #label = "";
    #name = "";
    #value = "";
    #items = [];
    #placeholder = "";
    #hint = "";
    #disabled = false;
    #required = false;
    #invalid = false;
    #validationMessage = "";
    #reconciler = null;

    constructor()
    {
        super();
        this.handleSelectChange = this.handleSelectChange.bind(this);
        this.optionKeyOf = this.optionKeyOf.bind(this);
        this.createOptionNode = this.createOptionNode.bind(this);
        this.updateOptionNode = this.updateOptionNode.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-field", "tg-drop-down");

        const selectId = this.elementId + "-select";
        const hintId = this.elementId + "-hint";

        const label = createElement("label", "tg-field__label");
        label.setAttribute("for", selectId);

        const shell = createElement("div", "tg-drop-down__shell");
        const select = createElement("select", "tg-field__input tg-drop-down__select");
        select.id = selectId;
        select.setAttribute("aria-describedby", hintId);

        const marker = createElement("span", "tg-drop-down__marker");
        marker.setAttribute("aria-hidden", "true");

        shell.append(select, marker);

        const hint = createElement("p", "tg-field__hint");
        hint.id = hintId;

        this.defineElement("label", label);
        this.defineElement("shell", shell);
        this.defineElement("select", select);
        this.defineElement("marker", marker);
        this.defineElement("hint", hint);

        this.append(label, shell, hint);

        this.#reconciler = new ChildReconciler(select,
        {
            keyOf: this.optionKeyOf,
            create: this.createOptionNode,
            update: this.updateOptionNode
        });
    }

    bindEvents()
    {
        const select = this.getElement("select");
        this.addManagedListener(select, "change", this.handleSelectChange);
    }

    syncElements()
    {
        const label = this.getElement("label");
        const select = this.getElement("select");
        const hint = this.getElement("hint");

        setText(label, this.#label);
        setClass(label, "tg-field__label--empty", this.#label === "");
        setClass(label, "tg-field__label--required", this.#required);

        this.#reconciler.reconcile(this.#optionData());

        select.value = this.#value;
        select.disabled = this.#disabled;
        select.required = this.#required;
        setOptionalAttribute(select, "name", this.#name);

        const hintText = this.#invalid === true && this.#validationMessage !== "" ? this.#validationMessage : this.#hint;
        setText(hint, hintText);
        setClass(hint, "tg-field__hint--error", this.#invalid);
        setClass(hint, "tg-field__hint--empty", hintText === "");

        setClass(this, "tg-field--disabled", this.#disabled);
        setClass(this, "tg-field--invalid", this.#invalid);
        select.setAttribute("aria-invalid", this.#invalid === true ? "true" : "false");
    }

    #optionData()
    {
        if (this.#placeholder === "")
        {
            return this.#items;
        }

        const placeholderItem = { value: "", label: this.#placeholder, placeholder: true };
        return [placeholderItem].concat(this.#items);
    }

    optionKeyOf(item, index)
    {
        if (item === null || typeof item !== "object")
        {
            return String(item);
        }

        return item.value === undefined ? String(index) : String(item.value);
    }

    createOptionNode(item, key)
    {
        const option = createElement("option");
        option.value = key;
        return option;
    }

    updateOptionNode(node, item, index, key)
    {
        const isObject = item !== null && typeof item === "object";
        const caption = isObject === true ? toText(item.label) : toText(item);

        setText(node, caption === "" ? key : caption);
        node.disabled = isObject === true && item.disabled === true;
        node.hidden = isObject === true && item.placeholder === true && this.#value !== "";
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
            this.#value = toText(newValue);
            return;
        }

        if (name === "placeholder")
        {
            this.#placeholder = toText(newValue);
            return;
        }

        if (name === "hint")
        {
            this.#hint = toText(newValue);
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

    get value()
    {
        return this.#value;
    }

    set value(value)
    {
        this.#value = toText(value);
        this.requestUpdate();
    }

    get items()
    {
        return this.#items.slice();
    }

    set items(value)
    {
        this.#items = Array.isArray(value) ? value.slice() : [];
        this.requestUpdate();
    }

    get placeholder()
    {
        return this.#placeholder;
    }

    set placeholder(value)
    {
        this.#placeholder = toText(value);
        this.requestUpdate();
    }

    get hint()
    {
        return this.#hint;
    }

    set hint(value)
    {
        this.#hint = toText(value);
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

    get selectedItem()
    {
        return this.getItem(this.#value);
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
        return this.#value;
    }

    set formValue(value)
    {
        this.value = value;
    }

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    /**
     * @param {string} value
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    selectValue(value)
    {
        return this.performAction({ source: "api", value: value });
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

            if (this.optionKeyOf(item, index) === key)
            {
                return item;
            }
        }

        return null;
    }

    focus(options)
    {
        if (this.isBuilt === false)
        {
            return;
        }

        const select = this.getElement("select");
        select.focus(options);
    }

    /**
     * @returns {{valid: boolean, message: string}}
     */
    validate()
    {
        if (this.#required === true && this.#value === "")
        {
            this.setValidationMessage("Choose an option.");
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

    handleSelectChange(event)
    {
        const select = this.getElement("select");
        this.performAction({ source: "pointer", value: select.value });
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        const previousValue = this.#value;

        if (this.#disabled === true)
        {
            this.requestUpdate();
            return { action: "select", handled: false, detail: { value: previousValue, name: this.#name } };
        }

        const hasRequested = payload !== null && payload !== undefined && payload.value !== undefined;
        const next = hasRequested === true ? toText(payload.value) : previousValue;

        this.#value = next;

        if (this.#invalid === true)
        {
            this.setValidationMessage("");
        }

        this.requestUpdate();

        if (next !== previousValue)
        {
            this.emit("tg-change", { value: next, previousValue: previousValue, item: this.getItem(next), name: this.#name });
        }

        return {
            action: "select",
            handled: true,
            detail: { value: next, previousValue: previousValue, item: this.getItem(next), name: this.#name }
        };
    }
}
