import { AbstractElement } from "../gen1/AbstractElement.js";
import { createElement, setText, setClass, attributeToBoolean, toText } from "./support/dom.js";

/**
 * GEN 2 - Form
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> Form
 *
 * A composition control. It gathers the field controls placed inside it,
 * validates them together, collects their values and reports a submission.
 *
 * Field discovery
 *   A descendant takes part when it exposes the field contract:
 *
 *       get isFieldControl()        -> true
 *       get name()                  -> string
 *       get formValue() / set       -> the value
 *       validate()                  -> { valid, message }
 *       setValidationMessage(text)
 *
 *   TextBox, TextArea, CheckBox, RadioGroup, DropDown and ListBox all implement
 *   it. The contract is duck-typed rather than registered, so a control from
 *   outside this library can take part, and Form needs no import of any other
 *   control. A field inside a nested form belongs to that form, not this one.
 *
 * Authored children
 *   Markup written inside the element is moved into the form body on first
 *   build, exactly as in Panel. Fields are therefore authored in HTML or
 *   appended from script; Form does not create them.
 *
 * Attributes
 *   heading, description, submit-text, reset-text, notice, notice-state,
 *   show-reset, busy, disabled
 *
 * Properties
 *   heading, description, submitText, resetText, showReset, busy, disabled,
 *   noticeText, noticeState ("info" | "success" | "warning" | "error")
 *
 * Methods
 *   fields(), fieldNamed(name), getValues(), setValues(object), validate(),
 *   reset(), submit(), setFieldError(name, message), clearErrors(),
 *   appendField(node)
 *
 * Events
 *   tg-submit    Cancelable. detail { values, fieldCount }
 *   tg-invalid   detail { errors: [ { name, message } ] }
 *   tg-reset     detail { values }
 *   tg-action    detail.action is "submit".
 *
 * Abstract action
 *   "submit" - validate every field and, if they all pass, announce the
 *   collected values. A form that fails validation reports handled: false and
 *   emits tg-invalid, so a caller always learns which of the two happened.
 */
export class Form extends AbstractElement
{
    static elementName = "tg-form";

    static get observedAttributes()
    {
        return ["heading", "description", "submit-text", "reset-text", "notice", "notice-state", "show-reset", "busy", "disabled"];
    }

    #heading = "";
    #description = "";
    #submitText = "Submit";
    #resetText = "Reset";
    #showReset = false;
    #busy = false;
    #disabled = false;
    #noticeText = "";
    #noticeState = "info";
    #initialValues = null;

    constructor()
    {
        super();
        this.handleSubmitClick = this.handleSubmitClick.bind(this);
        this.handleResetClick = this.handleResetClick.bind(this);
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
    }

    buildElements()
    {
        const adoptedNodes = Array.prototype.slice.call(this.childNodes);

        this.classList.add("tg-control", "tg-form");

        const form = createElement("form", "tg-form__form");
        form.noValidate = true;

        const header = createElement("div", "tg-form__header");
        const title = createElement("h2", "tg-form__title");
        const description = createElement("p", "tg-form__description");
        header.append(title, description);

        const body = createElement("div", "tg-form__body");
        const notice = createElement("p", "tg-form__notice");
        notice.setAttribute("role", "status");

        const actions = createElement("div", "tg-form__actions");

        const submit = createElement("button", "tg-form__submit");
        submit.type = "button";

        const reset = createElement("button", "tg-form__reset");
        reset.type = "button";

        actions.append(submit, reset);
        form.append(header, body, notice, actions);

        this.defineElement("form", form);
        this.defineElement("header", header);
        this.defineElement("title", title);
        this.defineElement("description", description);
        this.defineElement("body", body);
        this.defineElement("notice", notice);
        this.defineElement("actions", actions);
        this.defineElement("submit", submit);
        this.defineElement("reset", reset);

        this.append(form);

        for (let index = 0; index < adoptedNodes.length; index = index + 1)
        {
            body.appendChild(adoptedNodes[index]);
        }
    }

    bindEvents()
    {
        const form = this.getElement("form");
        const submit = this.getElement("submit");
        const reset = this.getElement("reset");

        this.addManagedListener(form, "submit", this.handleFormSubmit);
        this.addManagedListener(submit, "click", this.handleSubmitClick);
        this.addManagedListener(reset, "click", this.handleResetClick);
    }

    syncElements()
    {
        const title = this.getElement("title");
        const description = this.getElement("description");
        const header = this.getElement("header");
        const notice = this.getElement("notice");
        const submit = this.getElement("submit");
        const reset = this.getElement("reset");

        setText(title, this.#heading);
        setClass(title, "tg-form__title--empty", this.#heading === "");

        setText(description, this.#description);
        setClass(description, "tg-form__description--visible", this.#description !== "");

        header.hidden = this.#heading === "" && this.#description === "";

        setText(notice, this.#noticeText);
        notice.hidden = this.#noticeText === "";
        notice.dataset.state = this.#noticeState;

        setText(submit, this.#busy === true ? "Working" : this.#submitText);
        submit.disabled = this.#disabled === true || this.#busy === true;

        setText(reset, this.#resetText);
        reset.hidden = this.#showReset === false;
        reset.disabled = this.#disabled === true || this.#busy === true;

        setClass(this, "tg-form--busy", this.#busy);
        setClass(this, "tg-form--disabled", this.#disabled);
    }

    onConnected()
    {
        if (this.#initialValues === null)
        {
            this.#initialValues = this.getValues();
        }
    }

    onAttributeChanged(name, oldValue, newValue)
    {
        if (name === "heading")
        {
            this.#heading = toText(newValue);
            return;
        }

        if (name === "description")
        {
            this.#description = toText(newValue);
            return;
        }

        if (name === "submit-text")
        {
            this.#submitText = newValue === null ? "Submit" : newValue;
            return;
        }

        if (name === "reset-text")
        {
            this.#resetText = newValue === null ? "Reset" : newValue;
            return;
        }

        if (name === "notice")
        {
            this.#noticeText = toText(newValue);
            return;
        }

        if (name === "notice-state")
        {
            this.#noticeState = newValue === null ? "info" : newValue;
            return;
        }

        if (name === "show-reset")
        {
            this.#showReset = attributeToBoolean(newValue);
            return;
        }

        if (name === "busy")
        {
            this.#busy = attributeToBoolean(newValue);
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

    get isFormControl()
    {
        return true;
    }

    get heading()
    {
        return this.#heading;
    }

    set heading(value)
    {
        this.#heading = toText(value);
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

    get submitText()
    {
        return this.#submitText;
    }

    set submitText(value)
    {
        this.#submitText = value === undefined || value === null ? "Submit" : String(value);
        this.requestUpdate();
    }

    get resetText()
    {
        return this.#resetText;
    }

    set resetText(value)
    {
        this.#resetText = value === undefined || value === null ? "Reset" : String(value);
        this.requestUpdate();
    }

    get showReset()
    {
        return this.#showReset;
    }

    set showReset(value)
    {
        this.#showReset = value === true;
        this.requestUpdate();
    }

    get busy()
    {
        return this.#busy;
    }

    set busy(value)
    {
        this.#busy = value === true;
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

    get noticeText()
    {
        return this.#noticeText;
    }

    set noticeText(value)
    {
        this.#noticeText = toText(value);
        this.requestUpdate();
    }

    get noticeState()
    {
        return this.#noticeState;
    }

    set noticeState(value)
    {
        this.#noticeState = value === undefined || value === null ? "info" : String(value);
        this.requestUpdate();
    }

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    /**
     * The field controls this form owns, in document order.
     * @returns {Element[]}
     */
    fields()
    {
        const candidates = this.querySelectorAll("*");
        const owned = [];

        for (let index = 0; index < candidates.length; index = index + 1)
        {
            const candidate = candidates[index];

            if (candidate.isFieldControl !== true)
            {
                continue;
            }

            if (this.#ownsField(candidate) === true)
            {
                owned.push(candidate);
            }
        }

        return owned;
    }

    #ownsField(field)
    {
        let ancestor = field.parentElement;

        while (ancestor !== null)
        {
            if (ancestor.isFormControl === true)
            {
                return ancestor === this;
            }

            ancestor = ancestor.parentElement;
        }

        return false;
    }

    /**
     * @param {string} name
     * @returns {Element|null}
     */
    fieldNamed(name)
    {
        const wanted = toText(name);
        const fields = this.fields();

        for (let index = 0; index < fields.length; index = index + 1)
        {
            if (fields[index].name === wanted)
            {
                return fields[index];
            }
        }

        return null;
    }

    /**
     * Collects every named field value.
     * @returns {Object<string, *>}
     */
    getValues()
    {
        const values = {};
        const fields = this.fields();

        for (let index = 0; index < fields.length; index = index + 1)
        {
            const field = fields[index];
            const name = toText(field.name);

            if (name === "")
            {
                continue;
            }

            values[name] = field.formValue;
        }

        return values;
    }

    /**
     * Applies values by field name. Unknown names are ignored.
     * @param {Object<string, *>} values
     */
    setValues(values)
    {
        if (values === null || typeof values !== "object")
        {
            return;
        }

        const names = Object.keys(values);

        for (let index = 0; index < names.length; index = index + 1)
        {
            const field = this.fieldNamed(names[index]);

            if (field !== null)
            {
                field.formValue = values[names[index]];
            }
        }
    }

    /**
     * Validates every field and reports all failures, not just the first.
     * @returns {{valid: boolean, errors: Array<{name: string, message: string}>}}
     */
    validate()
    {
        const fields = this.fields();
        const errors = [];

        for (let index = 0; index < fields.length; index = index + 1)
        {
            const field = fields[index];

            if (typeof field.validate !== "function")
            {
                continue;
            }

            const outcome = field.validate();

            if (outcome !== null && outcome.valid === false)
            {
                errors.push({ name: toText(field.name), message: toText(outcome.message) });
            }
        }

        return { valid: errors.length === 0, errors: errors };
    }

    /**
     * Restores the values captured when the form first connected and clears
     * every error.
     * @returns {Object<string, *>} The values after the reset.
     */
    reset()
    {
        this.clearErrors();

        if (this.#initialValues !== null)
        {
            this.setValues(this.#initialValues);
        }

        this.noticeText = "";
        const values = this.getValues();
        this.emit("tg-reset", { values: values });
        return values;
    }

    /**
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    submit()
    {
        return this.performAction({ source: "api" });
    }

    /**
     * @param {string} name
     * @param {string} message
     * @returns {boolean} True when a field with that name exists.
     */
    setFieldError(name, message)
    {
        const field = this.fieldNamed(name);

        if (field === null || typeof field.setValidationMessage !== "function")
        {
            return false;
        }

        field.setValidationMessage(message);
        return true;
    }

    clearErrors()
    {
        const fields = this.fields();

        for (let index = 0; index < fields.length; index = index + 1)
        {
            const field = fields[index];

            if (typeof field.setValidationMessage === "function")
            {
                field.setValidationMessage("");
            }
        }
    }

    /**
     * Adds a node to the form body.
     * @param {Node} node
     * @returns {Node} The same node.
     */
    appendField(node)
    {
        const body = this.getElement("body");
        body.appendChild(node);
        return node;
    }

    // -------------------------------------------------------------------------
    // Gestures
    // -------------------------------------------------------------------------

    /**
     * The submit button is deliberately type="button", so this handler exists
     * only for implicit submission - a native control inside the form asking to
     * submit on Enter. Without it the browser would navigate.
     */
    handleFormSubmit(event)
    {
        event.preventDefault();
        this.performAction({ source: "implicit" });
    }

    handleSubmitClick(event)
    {
        event.preventDefault();
        this.performAction({ source: "pointer" });
    }

    handleResetClick(event)
    {
        event.preventDefault();
        this.reset();
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        if (this.#disabled === true || this.#busy === true)
        {
            return { action: "submit", handled: false, detail: { reason: "unavailable", values: this.getValues() } };
        }

        const outcome = this.validate();

        if (outcome.valid === false)
        {
            this.noticeText = "Check the highlighted fields.";
            this.noticeState = "error";
            this.emit("tg-invalid", { errors: outcome.errors });
            return { action: "submit", handled: false, detail: { reason: "invalid", errors: outcome.errors } };
        }

        const values = this.getValues();
        const accepted = this.emit("tg-submit", { values: values, fieldCount: this.fields().length }, { cancelable: true });

        return {
            action: "submit",
            handled: true,
            detail: { values: values, accepted: accepted }
        };
    }
}
