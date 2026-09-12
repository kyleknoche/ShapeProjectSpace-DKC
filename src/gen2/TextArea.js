import { AbstractElement } from "../gen1/AbstractElement.js";
import { createElement, setText, setClass, setOptionalAttribute, attributeToBoolean, toText, toNumber } from "./support/dom.js";

/**
 * GEN 2 - TextArea
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> TextArea
 *
 * A multi-line text entry control with a label, an optional character counter
 * and validation reporting. It is deliberately a sibling of TextBox rather than
 * a subclass of it: the two controls share an idea, not an implementation, and
 * a single-line control that grows a rows property would be worse than both.
 *
 * Attributes
 *   label, value, placeholder, hint, name, rows, maxlength,
 *   disabled, readonly, required, autogrow
 *
 * Properties
 *   label, value, draftValue, placeholder, hint, name, rows, maxLength,
 *   disabled, readOnly, required, autoGrow, invalid, validationMessage
 *
 * Field contract (used by Form)
 *   isFieldControl, name, formValue, validate(), setValidationMessage()
 *
 * Methods
 *   focus(), select(), clear(), commit(), validate(), setValidationMessage(text)
 *
 * Events
 *   tg-input    Every keystroke. detail { value, name, length }
 *   tg-change   The committed value changed. detail { value, previousValue, name }
 *   tg-action   detail.action is "commit".
 *
 * Abstract action
 *   "commit" - accept the typed text as the value. Enter inserts a newline in a
 *   text area, so the keyboard commit gesture is Ctrl+Enter or Cmd+Enter, and a
 *   blur with a changed draft commits as well.
 */
export class TextArea extends AbstractElement
{
    static elementName = "tg-text-area";

    static get observedAttributes()
    {
        return ["label", "value", "placeholder", "hint", "name", "rows", "maxlength", "disabled", "readonly", "required", "autogrow"];
    }

    #label = "";
    #value = "";
    #placeholder = "";
    #hint = "";
    #name = "";
    #rows = 4;
    #maxLength = -1;
    #disabled = false;
    #readOnly = false;
    #required = false;
    #autoGrow = false;
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
        this.classList.add("tg-control", "tg-field", "tg-text-area");

        const inputId = this.elementId + "-input";
        const hintId = this.elementId + "-hint";

        const label = createElement("label", "tg-field__label");
        label.setAttribute("for", inputId);

        const input = createElement("textarea", "tg-field__input tg-text-area__input");
        input.id = inputId;
        input.setAttribute("aria-describedby", hintId);

        const footer = createElement("div", "tg-text-area__footer");
        const hint = createElement("p", "tg-field__hint");
        hint.id = hintId;
        const counter = createElement("span", "tg-text-area__counter");

        footer.append(hint, counter);

        this.defineElement("label", label);
        this.defineElement("input", input);
        this.defineElement("footer", footer);
        this.defineElement("hint", hint);
        this.defineElement("counter", counter);

        this.append(label, input, footer);
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
        const counter = this.getElement("counter");

        setText(label, this.#label);
        setClass(label, "tg-field__label--empty", this.#label === "");
        setClass(label, "tg-field__label--required", this.#required);

        if (this.#draftDirty === false && input.value !== this.#value)
        {
            input.value = this.#value;
        }

        input.rows = this.#rows;
        input.placeholder = this.#placeholder;
        input.disabled = this.#disabled;
        input.readOnly = this.#readOnly;
        input.required = this.#required;

        setOptionalAttribute(input, "name", this.#name);

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

        this.#syncCounter(counter, input);

        setClass(this, "tg-field--disabled", this.#disabled);
        setClass(this, "tg-field--readonly", this.#readOnly);
        setClass(this, "tg-field--invalid", this.#invalid);
        setClass(this, "tg-text-area--autogrow", this.#autoGrow);

        input.setAttribute("aria-invalid", this.#invalid === true ? "true" : "false");
    }

    #syncCounter(counter, input)
    {
        if (this.#maxLength < 0)
        {
            setText(counter, "");
            setClass(counter, "tg-text-area__counter--visible", false);
            return;
        }

        const used = input.value.length;
        setText(counter, used + " / " + this.#maxLength);
        setClass(counter, "tg-text-area__counter--visible", true);
        setClass(counter, "tg-text-area__counter--full", used >= this.#maxLength);
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

        if (name === "rows")
        {
            this.#rows = toNumber(newValue, 4);
            return;
        }

        if (name === "maxlength")
        {
            this.#maxLength = newValue === null ? -1 : toNumber(newValue, -1);
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
            return;
        }

        if (name === "autogrow")
        {
            this.#autoGrow = attributeToBoolean(newValue);
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

    get rows()
    {
        return this.#rows;
    }

    set rows(value)
    {
        this.#rows = toNumber(value, 4);
        this.requestUpdate();
    }

    get maxLength()
    {
        return this.#maxLength;
    }

    set maxLength(value)
    {
        this.#maxLength = toNumber(value, -1);
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

    get autoGrow()
    {
        return this.#autoGrow;
    }

    set autoGrow(value)
    {
        this.#autoGrow = value === true;
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

    commit()
    {
        return this.performAction({ source: "api" });
    }

    /**
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

    handleInput(event)
    {
        this.#draftDirty = true;
        this.emit("tg-input", { value: this.draftValue, name: this.#name, length: this.draftValue.length });

        if (this.#invalid === true)
        {
            this.setValidationMessage("");
            return;
        }

        this.requestUpdate();
    }

    handleKeyDown(event)
    {
        if (event.key !== "Enter")
        {
            return;
        }

        if (event.ctrlKey !== true && event.metaKey !== true)
        {
            return;
        }

        event.preventDefault();
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
