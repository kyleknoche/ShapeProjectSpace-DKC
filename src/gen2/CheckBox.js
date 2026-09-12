import { AbstractElement } from "../gen1/AbstractElement.js";
import { createElement, setText, setClass, setOptionalAttribute, attributeToBoolean, toText } from "./support/dom.js";

/**
 * GEN 2 - CheckBox
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> CheckBox
 *
 * A two-state or three-state checkbox with a label and an optional description.
 * It wraps a native input, so the indeterminate visual, keyboard activation and
 * assistive technology reporting are the platform's.
 *
 * Attributes
 *   label, description, name, value, checked, indeterminate, disabled, required
 *
 * Properties
 *   label, description, name, value, checked, indeterminate, disabled, required,
 *   invalid, validationMessage
 *
 * Field contract (used by Form)
 *   isFieldControl, name, formValue, validate(), setValidationMessage()
 *
 * Methods
 *   focus(), toggle(), check(), uncheck(), validate(), setValidationMessage(text)
 *
 * Events
 *   tg-change   detail { checked, value, name }
 *   tg-action   detail.action is "toggle".
 *
 * Abstract action
 *   "toggle" - change the checked state. This is the only path that mutates
 *   checked in response to intent: the DOM listener translates the user gesture
 *   into a payload and calls performAction(), so a click and a programmatic
 *   toggle() produce exactly the same sequence of state changes and events.
 *
 *   Passing { checked: true|false } sets a specific state instead of inverting,
 *   which is what the native change event supplies.
 */
export class CheckBox extends AbstractElement
{
    static elementName = "tg-check-box";

    static get observedAttributes()
    {
        return ["label", "description", "name", "value", "checked", "indeterminate", "disabled", "required"];
    }

    #label = "";
    #description = "";
    #name = "";
    #value = "on";
    #checked = false;
    #indeterminate = false;
    #disabled = false;
    #required = false;
    #invalid = false;
    #validationMessage = "";

    constructor()
    {
        super();
        this.handleInputChange = this.handleInputChange.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-check-box");

        const inputId = this.elementId + "-input";

        const input = createElement("input", "tg-check-box__input");
        input.type = "checkbox";
        input.id = inputId;

        const label = createElement("label", "tg-check-box__label");
        label.setAttribute("for", inputId);

        const caption = createElement("span", "tg-check-box__caption");
        const description = createElement("span", "tg-check-box__description");

        label.append(caption, description);

        this.defineElement("input", input);
        this.defineElement("label", label);
        this.defineElement("caption", caption);
        this.defineElement("description", description);

        this.append(input, label);
    }

    bindEvents()
    {
        const input = this.getElement("input");
        this.addManagedListener(input, "change", this.handleInputChange);
    }

    syncElements()
    {
        const input = this.getElement("input");
        const caption = this.getElement("caption");
        const description = this.getElement("description");

        input.checked = this.#checked;
        input.indeterminate = this.#indeterminate;
        input.disabled = this.#disabled;
        input.required = this.#required;
        input.value = this.#value;

        setOptionalAttribute(input, "name", this.#name);

        setText(caption, this.#label);
        setText(description, this.#description);
        setClass(description, "tg-check-box__description--visible", this.#description !== "");

        setClass(this, "tg-check-box--checked", this.#checked);
        setClass(this, "tg-check-box--indeterminate", this.#indeterminate);
        setClass(this, "tg-check-box--disabled", this.#disabled);
        setClass(this, "tg-check-box--invalid", this.#invalid);

        input.setAttribute("aria-invalid", this.#invalid === true ? "true" : "false");
        setOptionalAttribute(input, "title", this.#validationMessage);
    }

    onAttributeChanged(name, oldValue, newValue)
    {
        if (name === "label")
        {
            this.#label = toText(newValue);
            return;
        }

        if (name === "description")
        {
            this.#description = toText(newValue);
            return;
        }

        if (name === "name")
        {
            this.#name = toText(newValue);
            return;
        }

        if (name === "value")
        {
            this.#value = newValue === null ? "on" : newValue;
            return;
        }

        if (name === "checked")
        {
            this.#checked = attributeToBoolean(newValue);
            return;
        }

        if (name === "indeterminate")
        {
            this.#indeterminate = attributeToBoolean(newValue);
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

    get description()
    {
        return this.#description;
    }

    set description(value)
    {
        this.#description = toText(value);
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
        this.#value = value === undefined || value === null ? "on" : String(value);
        this.requestUpdate();
    }

    get checked()
    {
        return this.#checked;
    }

    /**
     * Setting checked directly is a state assignment, not an act: it does not
     * emit tg-change. Use toggle() or performAction() to express intent.
     */
    set checked(value)
    {
        this.#checked = value === true;
        this.#indeterminate = false;
        this.requestUpdate();
    }

    get indeterminate()
    {
        return this.#indeterminate;
    }

    set indeterminate(value)
    {
        this.#indeterminate = value === true;
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
        return this.#checked;
    }

    set formValue(value)
    {
        this.checked = value === true;
    }

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    focus(options)
    {
        if (this.isBuilt === false)
        {
            return;
        }

        const input = this.getElement("input");
        input.focus(options);
    }

    /**
     * Inverts the checked state as an act, emitting tg-change and tg-action.
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    toggle()
    {
        return this.performAction({ source: "api" });
    }

    check()
    {
        return this.performAction({ source: "api", checked: true });
    }

    uncheck()
    {
        return this.performAction({ source: "api", checked: false });
    }

    /**
     * @returns {{valid: boolean, message: string}}
     */
    validate()
    {
        if (this.#required === true && this.#checked === false)
        {
            this.setValidationMessage("This box must be checked.");
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

    handleInputChange(event)
    {
        const input = this.getElement("input");
        this.performAction({ source: "pointer", checked: input.checked });
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        const previousChecked = this.#checked;

        if (this.#disabled === true)
        {
            this.requestUpdate();
            return { action: "toggle", handled: false, detail: { checked: previousChecked, value: this.#value, name: this.#name } };
        }

        const requested = payload !== null && payload !== undefined && typeof payload.checked === "boolean";
        const next = requested === true ? payload.checked : previousChecked === false;

        this.#checked = next;
        this.#indeterminate = false;
        this.requestUpdate();

        if (next !== previousChecked)
        {
            this.emit("tg-change", { checked: next, value: this.#value, name: this.#name });
        }

        return {
            action: "toggle",
            handled: true,
            detail: { checked: next, previousChecked: previousChecked, value: this.#value, name: this.#name }
        };
    }
}
