import { AbstractElement } from "../gen1/AbstractElement.js";
import { ChildReconciler } from "./support/ChildReconciler.js";
import { createElement, setText, setClass, attachParts, partsOf, attributeToBoolean, toText } from "./support/dom.js";

/**
 * GEN 2 - RadioGroup
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> RadioGroup
 *
 * A mutually exclusive set of options. The group is the control, not the
 * individual radio: a lone radio button has no meaning and no useful API, so
 * there is no separate RadioButton class in this library.
 *
 * Options are supplied as data, not as markup:
 *
 *     group.items =
 *     [
 *         { value: "one", label: "One", description: "Optional", disabled: false }
 *     ];
 *
 * Option rows are reconciled by value, so changing the items array reuses the
 * rows whose values survive and keeps focus and DOM identity intact.
 *
 * Attributes
 *   label, name, value, orientation ("vertical" | "horizontal"), disabled, required
 *
 * Properties
 *   label, name, value, items, orientation, disabled, required,
 *   selectedItem (read-only), invalid, validationMessage
 *
 * Field contract (used by Form)
 *   isFieldControl, name, formValue, validate(), setValidationMessage()
 *
 * Methods
 *   selectValue(value), clearSelection(), getItem(value), focus(),
 *   validate(), setValidationMessage(text)
 *
 * Events
 *   tg-change   detail { value, previousValue, item, name }
 *   tg-action   detail.action is "select".
 *
 * Abstract action
 *   "select" - choose one option. The payload carries { value }; without one,
 *   the current value is re-affirmed, which is how a programmatic no-op is
 *   distinguished from a change.
 */
export class RadioGroup extends AbstractElement
{
    static elementName = "tg-radio-group";

    static get observedAttributes()
    {
        return ["label", "name", "value", "orientation", "disabled", "required"];
    }

    #label = "";
    #name = "";
    #value = "";
    #items = [];
    #orientation = "vertical";
    #disabled = false;
    #required = false;
    #invalid = false;
    #validationMessage = "";
    #reconciler = null;
    #optionSequence = 0;

    constructor()
    {
        super();
        this.handleOptionChange = this.handleOptionChange.bind(this);
        this.optionKeyOf = this.optionKeyOf.bind(this);
        this.createOptionRow = this.createOptionRow.bind(this);
        this.updateOptionRow = this.updateOptionRow.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-radio-group");
        this.setAttribute("role", "radiogroup");

        const legend = createElement("span", "tg-radio-group__legend");
        legend.id = this.elementId + "-legend";
        this.setAttribute("aria-labelledby", legend.id);

        const list = createElement("div", "tg-radio-group__list");
        const message = createElement("p", "tg-field__hint");

        this.defineElement("legend", legend);
        this.defineElement("list", list);
        this.defineElement("message", message);

        this.append(legend, list, message);

        this.#reconciler = new ChildReconciler(list,
        {
            keyOf: this.optionKeyOf,
            create: this.createOptionRow,
            update: this.updateOptionRow
        });
    }

    bindEvents()
    {
        const list = this.getElement("list");
        this.addManagedListener(list, "change", this.handleOptionChange);
    }

    syncElements()
    {
        const legend = this.getElement("legend");
        const message = this.getElement("message");

        setText(legend, this.#label);
        setClass(legend, "tg-radio-group__legend--empty", this.#label === "");

        this.#reconciler.reconcile(this.#items);

        setText(message, this.#validationMessage);
        setClass(message, "tg-field__hint--error", this.#invalid);
        setClass(message, "tg-field__hint--empty", this.#validationMessage === "");

        setClass(this, "tg-radio-group--disabled", this.#disabled);
        setClass(this, "tg-radio-group--invalid", this.#invalid);

        if (this.dataset.orientation !== this.#orientation)
        {
            this.dataset.orientation = this.#orientation;
        }
    }

    // -------------------------------------------------------------------------
    // Row construction. These three methods belong to the reconciler and are
    // bound once in the constructor.
    // -------------------------------------------------------------------------

    optionKeyOf(item, index)
    {
        if (item === null || typeof item !== "object")
        {
            return String(item);
        }

        return item.value === undefined ? String(index) : String(item.value);
    }

    createOptionRow(item, key)
    {
        const row = createElement("div", "tg-radio-group__option");
        this.#optionSequence = this.#optionSequence + 1;
        const inputId = this.elementId + "-option-" + this.#optionSequence;

        const input = createElement("input", "tg-radio-group__input");
        input.type = "radio";
        input.id = inputId;
        input.value = key;

        const label = createElement("label", "tg-radio-group__option-label");
        label.setAttribute("for", inputId);

        const caption = createElement("span", "tg-radio-group__caption");
        const description = createElement("span", "tg-radio-group__description");

        label.append(caption, description);
        row.append(input, label);

        attachParts(row, { input: input, label: label, caption: caption, description: description });
        return row;
    }

    updateOptionRow(row, item, index, key)
    {
        const parts = partsOf(row);
        const groupName = this.#name === "" ? this.elementId : this.#name;
        const itemDisabled = item !== null && typeof item === "object" && item.disabled === true;
        const caption = item !== null && typeof item === "object" ? toText(item.label) : toText(item);
        const description = item !== null && typeof item === "object" ? toText(item.description) : "";

        parts.input.name = groupName;
        parts.input.checked = key === this.#value;
        parts.input.disabled = this.#disabled === true || itemDisabled === true;

        setText(parts.caption, caption === "" ? key : caption);
        setText(parts.description, description);
        setClass(parts.description, "tg-radio-group__description--visible", description !== "");
        setClass(row, "tg-radio-group__option--selected", key === this.#value);
        setClass(row, "tg-radio-group__option--disabled", parts.input.disabled);
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

        if (name === "orientation")
        {
            this.#orientation = newValue === null ? "vertical" : newValue;
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

    /**
     * State assignment. Does not emit tg-change; selectValue() expresses intent.
     */
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

    get orientation()
    {
        return this.#orientation;
    }

    set orientation(value)
    {
        this.#orientation = value === undefined || value === null ? "vertical" : String(value);
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
     * Selects an option as an act: emits tg-change when the value moves.
     * @param {string} value
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    selectValue(value)
    {
        return this.performAction({ source: "api", value: value });
    }

    clearSelection()
    {
        return this.performAction({ source: "api", value: "" });
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

        const selectedKey = this.#value === "" ? this.#reconciler.keys()[0] : this.#value;

        if (selectedKey === undefined)
        {
            return;
        }

        const row = this.#reconciler.nodeForKey(selectedKey);

        if (row === undefined)
        {
            return;
        }

        const parts = partsOf(row);
        parts.input.focus(options);
    }

    /**
     * @returns {{valid: boolean, message: string}}
     */
    validate()
    {
        if (this.#required === true && this.#value === "")
        {
            this.setValidationMessage("Choose one option.");
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

    handleOptionChange(event)
    {
        const input = event.target;

        if (input === null || input.type !== "radio")
        {
            return;
        }

        this.performAction({ source: "pointer", value: input.value });
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
