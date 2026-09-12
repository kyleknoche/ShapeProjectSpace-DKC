import { AbstractElement } from "../gen1/AbstractElement.js";
import { createElement, setText, setClass, attributeToBoolean } from "./support/dom.js";

/**
 * GEN 2 - Button
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> Button
 *
 * A command control. It wraps a real native button so that keyboard activation,
 * focus behaviour and assistive technology support come from the platform
 * rather than from re-implemented key handling.
 *
 * Attributes
 *   text      Button caption.
 *   variant   "default" | "primary" | "subtle" | "danger"
 *   size      "medium" | "small"
 *   disabled  Present when the button cannot be invoked.
 *   busy      Present while a command is in flight.
 *   command   Optional caller-defined string echoed in the action detail.
 *
 * Properties
 *   text, variant, size, disabled, busy, command
 *
 * Methods
 *   focus()           Moves focus to the inner native button.
 *   invoke(payload)   Programmatic equivalent of a click.
 *
 * Events
 *   tg-action   detail.action is "invoke"; handled is false while disabled or busy.
 *
 * Abstract action
 *   "invoke" - the command this button represents. A disabled or busy button
 *   still answers, but reports handled: false, so callers can distinguish
 *   "nothing happened" from "no such control".
 */
export class Button extends AbstractElement
{
    static elementName = "tg-button";

    static get observedAttributes()
    {
        return ["text", "variant", "size", "disabled", "busy", "command"];
    }

    #text = "";
    #variant = "default";
    #size = "medium";
    #disabled = false;
    #busy = false;
    #command = "";

    constructor()
    {
        super();
        this.handleButtonClick = this.handleButtonClick.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-button");

        const button = createElement("button", "tg-button__control");
        button.type = "button";
        button.id = this.elementId + "-button";

        const caption = createElement("span", "tg-button__caption");
        const spinner = createElement("span", "tg-button__spinner");
        spinner.setAttribute("aria-hidden", "true");

        button.append(spinner, caption);

        this.defineElement("button", button);
        this.defineElement("caption", caption);
        this.defineElement("spinner", spinner);
        this.append(button);
    }

    bindEvents()
    {
        const button = this.getElement("button");
        this.addManagedListener(button, "click", this.handleButtonClick);
    }

    syncElements()
    {
        const button = this.getElement("button");
        const caption = this.getElement("caption");

        setText(caption, this.#text);
        button.disabled = this.#disabled === true || this.#busy === true;
        button.setAttribute("aria-busy", this.#busy === true ? "true" : "false");

        setClass(this, "tg-button--disabled", this.#disabled);
        setClass(this, "tg-button--busy", this.#busy);

        if (this.dataset.variant !== this.#variant)
        {
            this.dataset.variant = this.#variant;
        }

        if (this.dataset.size !== this.#size)
        {
            this.dataset.size = this.#size;
        }
    }

    onAttributeChanged(name, oldValue, newValue)
    {
        if (name === "text")
        {
            this.#text = newValue === null ? "" : newValue;
            return;
        }

        if (name === "variant")
        {
            this.#variant = newValue === null ? "default" : newValue;
            return;
        }

        if (name === "size")
        {
            this.#size = newValue === null ? "medium" : newValue;
            return;
        }

        if (name === "disabled")
        {
            this.#disabled = attributeToBoolean(newValue);
            return;
        }

        if (name === "busy")
        {
            this.#busy = attributeToBoolean(newValue);
            return;
        }

        if (name === "command")
        {
            this.#command = newValue === null ? "" : newValue;
        }
    }

    // -------------------------------------------------------------------------
    // Properties
    // -------------------------------------------------------------------------

    get text()
    {
        return this.#text;
    }

    set text(value)
    {
        this.#text = value === undefined || value === null ? "" : String(value);
        this.requestUpdate();
    }

    get variant()
    {
        return this.#variant;
    }

    set variant(value)
    {
        this.#variant = value === undefined || value === null ? "default" : String(value);
        this.requestUpdate();
    }

    get size()
    {
        return this.#size;
    }

    set size(value)
    {
        this.#size = value === undefined || value === null ? "medium" : String(value);
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

    get busy()
    {
        return this.#busy;
    }

    set busy(value)
    {
        this.#busy = value === true;
        this.requestUpdate();
    }

    get command()
    {
        return this.#command;
    }

    set command(value)
    {
        this.#command = value === undefined || value === null ? "" : String(value);
        this.requestUpdate();
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

        const button = this.getElement("button");
        button.focus(options);
    }

    /**
     * Programmatic activation. Identical in effect to a user click.
     * @param {*} [payload]
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    invoke(payload)
    {
        return this.performAction(payload);
    }

    // -------------------------------------------------------------------------
    // Gestures
    // -------------------------------------------------------------------------

    handleButtonClick(event)
    {
        this.performAction({ source: "pointer" });
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        const detail = { command: this.#command, text: this.#text, payload: payload === undefined ? null : payload };

        if (this.#disabled === true || this.#busy === true)
        {
            return { action: "invoke", handled: false, detail: detail };
        }

        return { action: "invoke", handled: true, detail: detail };
    }
}
