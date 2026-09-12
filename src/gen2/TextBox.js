import { AbstractElement } from "../gen1/AbstractElement.js";
import { createElement, setText, setClass, setOptionalAttribute, attributeToBoolean, toText } from "./support/dom.js";

/**
 * GEN 2 - TextBox
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> TextBox
 *
 * A single-line text entry control with a label, a hint line and validation
 * reporting. It wraps a native input so that autofill, input methods, selection
 * and mobile keyboards keep working.
 *
 * Attributes
 *   label, value, placeholder, hint, name, type, maxlength, pattern,
 *   disabled, readonly, required, invalid
 *
 * Properties
 *   label         {string}
 *   value         {string}   The committed value.
 *   draftValue    {string}   What is currently typed, committed or not.
 *   placeholder   {string}
 *   hint          {string}
 *   name          {string}
 *   type          {string}   text | search | email | password | tel | url | number
 *   maxLength     {number}   -1 when unlimited.
 *   pattern       {string}
 *   disabled      {boolean}
 *   readOnly      {boolean}
 *   required      {boolean}
 *   invalid       {boolean}  Read-only view of the last validation outcome.
 *   validationMessage {string}
 *
 * Field contract (used by Form)
 *   isFieldControl, name, formValue, validate(), setValidationMessage()
 *
 * Methods
 *   focus(), select(), clear(), commit(), validate(), setValidationMessage(text)
 *
 * Events
 *   tg-input    Every keystroke. detail { value, name }
 *   tg-change   The committed value changed. detail { value, previousValue, name }
 *   tg-action   detail.action is "commit".
 *
 * Abstract action
 *   "commit" - accept what the user has typed as the value of this control.
 *   Typing is not the act; accepting the text is. The Enter key, a blur, and a
 *   programmatic commit() all route through here, so there is one code path
 *   that can change a committed value.
 */
export class TextBox extends AbstractElement
{
    static elementName = "tg-text-box";

    static get observedAttributes()
    {
        return ["label", "value", "placeholder", "hint", "name", "type", "maxlength", "pattern", "disabled", "readonly", "required"];
    }

    #label = "";
    #value = "";
    #placeholder = "";
    #hint = "";
    #name = "";
    #type = "text";
    #maxLength = -1;
    #pattern = "";
    #disabled = false;
    #readOnly = false;
    #required = false;
    #invalid = false;
    #validationMessage = "";
    #draftDirty = false;

    constructor()
    {
        super();
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-field", "tg-text-box");

        const inputId = this.elementId + "-input";
        const hintId = this.elementId + "-hint";

        const label = createElement("label", "tg-field__label");
        label.setAttribute("for", inputId);

        const input = createElement("input", "tg-field__input");
        input.id = inputId;
        input.type = "text";
        input.setAttribute("aria-describedby", hintId);

        const hint = createElement("p", "tg-field__hint");
        hint.id = hintId;

        this.defineElement("label", label);
        this.defineElement("input", input);
        this.defineElement("hint", hint);

        this.append(label, input, hint);
    }

    bindEvents()
    {
        const input = this.getElement("input");
        this.addManagedListener(input, "input", this.handleInput);
        this.addManagedListener(input, "keydown", this.handleKeyDown);
        this.addManagedListener(input, "blur", this.handleBlur);
    }

    syncElements()
    {
        const label = this.getElement("label");
        const input = this.getElement("input");
        const hint = this.getElement("hint");

        setText(label, this.#label);
        setClass(label, "tg-field__label--empty", this.#label === "");
        setClass(label, "tg-field__label--required", this.#required);

        if (this.#draftDirty === false && input.value !== this.#value)
        {
            input.value = this.#value;
        }

        input.type = this.#type;
        input.placeholder = this.#placeholder;
        input.disabled = this.#disabled;
        input.readOnly = this.#readOnly;
        input.required = this.#required;

        setOptionalAttribute(input, "name", this.#name);
        setOptionalAttribute(input, "pattern", this.#pattern);

        if (this.#maxLength >= 0)
        {
            input.maxLength = this.#maxLength;
        }
        else
        {
            input.removeAttribute("maxlength");
        }

        const hintText = this.#invalid === true && this.#validationMessage !== "" ? this.#validationMessage : this.#hint;
        setText(hint, hintText);
        setClass(hint, "tg-field__hint--error", this.#invalid);
        setClass(hint, "tg-field__hint--empty", hintText === "");

        setClass(this, "tg-field--disabled", this.#disabled);
        setClass(this, "tg-field--readonly", this.#readOnly);
        setClass(this, "tg-field--invalid", this.#invalid);

        input.setAttribute("aria-invalid", this.#invalid === true ? "true" : "false");
    }

    onAttributeChanged(name, oldValue, newValue)
    {
        if (name === "label")
        {
            this.#label = toText(newValue);
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

        if (name === "name")
        {
            this.#name = toText(newValue);
            return;
        }

        if (name === "type")
        {
            this.#type = newValue === null ? "text" : newValue;
            return;
        }

        if (name === "maxlength")
        {
            this.#maxLength = newValue === null ? -1 : Number(newValue);
            return;
        }

        if (name === "pattern")
        {
            this.#pattern = toText(newValue);
            return;
        }

        if (name === "disabled")
        {
            this.#disabled = attributeToBoolean(newValue);
            return;
        }

        if (name === "readonly")
        {
            this.#readOnly = attributeToBoolean(newValue);
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

    get value()
    {
        return this.#value;
    }

    set value(value)
    {
        const next = toText(value);

        if (next === this.#value)
        {
            return;
        }

        this.#value = next;
        this.#draftDirty = false;

        if (this.isBuilt === true)
        {
            const input = this.getElement("input");
            input.value = next;
        }

        this.requestUpdate();
    }

    /**
     * What is currently in the input, whether or not it has been committed.
     * @returns {string}
     */
    get draftValue()
    {
        if (this.isBuilt === false)
        {
            return this.#value;
        }

        const input = this.getElement("input");
        return input.value;
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

    get name()
    {
        return this.#name;
    }

    set name(value)
    {
        this.#name = toText(value);
        this.requestUpdate();
    }

    get type()
    {
        return this.#type;
    }

    set type(value)
    {
        this.#type = value === undefined || value === null ? "text" : String(value);
        this.requestUpdate();
    }

    get maxLength()
    {
        return this.#maxLength;
    }

    set maxLength(value)
    {
        this.#maxLength = Number(value);
        this.requestUpdate();
    }

    get pattern()
    {
        return this.#pattern;
    }

    set pattern(value)
    {
        this.#pattern = toText(value);
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

    get readOnly()
    {
        return this.#readOnly;
    }

    set readOnly(value)
    {
        this.#readOnly = value === true;
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
        return this.#value;
    }

    set formValue(value)
    {
        this.value = value;
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

    select()
    {
        if (this.isBuilt === false)
        {
            return;
        }

        const input = this.getElement("input");
        input.select();
    }

    /**
     * Clears the draft and the committed value.
     */
    clear()
    {
        if (this.isBuilt === true)
        {
            const input = this.getElement("input");
            input.value = "";
        }

        this.value = "";
        this.setValidationMessage("");
    }

    /**
     * Commits the current draft. Equivalent to pressing Enter.
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    commit()
    {
        return this.performAction({ source: "api" });
    }

    /**
     * Validates the current draft against required, pattern, length and type.
     * Updates the control's invalid state and hint line as a side effect.
     *
     * @returns {{valid: boolean, message: string}}
     */
    validate()
    {
        const draft = this.draftValue;

        if (this.#required === true && draft.trim() === "")
        {
            this.setValidationMessage("This field is required.");
            return { valid: false, message: this.#validationMessage };
        }

        if (this.#maxLength >= 0 && draft.length > this.#maxLength)
        {
            this.setValidationMessage("Use " + this.#maxLength + " characters or fewer.");
            return { valid: false, message: this.#validationMessage };
        }

        if (this.isBuilt === true)
        {
            const input = this.getElement("input");

            if (typeof input.checkValidity === "function" && input.checkValidity() === false)
            {
                const nativeMessage = input.validationMessage === "" ? "This value is not valid." : input.validationMessage;
                this.setValidationMessage(nativeMessage);
                return { valid: false, message: this.#validationMessage };
            }
        }

        this.setValidationMessage("");
        return { valid: true, message: "" };
    }

    /**
     * Shows or clears an error on this field. An empty message clears the error.
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

    handleInput(event)
    {
        this.#draftDirty = true;
        this.emit("tg-input", { value: this.draftValue, name: this.#name });

        if (this.#invalid === true)
        {
            this.setValidationMessage("");
        }
    }

    handleKeyDown(event)
    {
        if (event.key !== "Enter")
        {
            return;
        }

        this.performAction({ source: "keyboard" });
    }

    handleBlur(event)
    {
        if (this.draftValue === this.#value)
        {
            return;
        }

        this.performAction({ source: "blur" });
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        const previousValue = this.#value;
        const draft = this.draftValue;

        if (this.#disabled === true || this.#readOnly === true)
        {
            return { action: "commit", handled: false, detail: { value: previousValue, name: this.#name } };
        }

        const outcome = this.validate();
        this.#draftDirty = false;

        if (draft !== previousValue)
        {
            this.#value = draft;
            this.requestUpdate();
            this.emit("tg-change", { value: draft, previousValue: previousValue, name: this.#name });
        }

        return {
            action: "commit",
            handled: true,
            detail: { value: this.#value, previousValue: previousValue, name: this.#name, valid: outcome.valid }
        };
    }
}
