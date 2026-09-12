import { AbstractElement } from "../gen1/AbstractElement.js";
import { createElement, setText, setClass, setOptionalAttribute, attributeToBoolean } from "./support/dom.js";

/**
 * GEN 2 - Label
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> Label
 *
 * A text label that can be associated with another control. It is the smallest
 * complete control in the library and is the reference example for how a Gen-2
 * control is written: build once, keep stable references, synchronise state,
 * route the primary gesture through performAction().
 *
 * Attributes
 *   text      Label text.
 *   for       Element id this label describes.
 *   variant   "default" | "caption" | "heading" | "field"
 *   muted     Present for a de-emphasised label.
 *   required  Present to show the required marker.
 *
 * Properties
 *   text      {string}
 *   htmlFor   {string}   Reflects the "for" attribute.
 *   variant   {string}
 *   muted     {boolean}
 *   required  {boolean}
 *
 * Methods
 *   targetElement() -> Element|null   Resolves htmlFor within the owner document.
 *
 * Events
 *   tg-action   Emitted by performAction(). detail.action is "activate".
 *
 * Abstract action
 *   "activate" - moves focus to the associated control, which is what a label
 *   is for. With no association the action reports handled: false rather than
 *   inventing a meaning.
 */
export class Label extends AbstractElement
{
    static elementName = "tg-label";

    static get observedAttributes()
    {
        return ["text", "for", "variant", "muted", "required"];
    }

    #text = "";
    #variant = "default";
    #muted = false;
    #required = false;

    constructor()
    {
        super();
        this.handleClick = this.handleClick.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-label");

        const text = createElement("span", "tg-label__text");
        const marker = createElement("span", "tg-label__required", "*");

        this.defineElement("text", text);
        this.defineElement("marker", marker);
        this.append(text, marker);
    }

    bindEvents()
    {
        this.addManagedListener(this, "click", this.handleClick);
    }

    syncElements()
    {
        const text = this.getElement("text");
        const marker = this.getElement("marker");

        setText(text, this.#text);
        setClass(this, "tg-label--muted", this.#muted);
        setClass(marker, "tg-label__required--visible", this.#required);

        if (this.dataset.variant !== this.#variant)
        {
            this.dataset.variant = this.#variant;
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

        if (name === "muted")
        {
            this.#muted = attributeToBoolean(newValue);
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

    get text()
    {
        return this.#text;
    }

    set text(value)
    {
        this.#text = value === undefined || value === null ? "" : String(value);
        this.requestUpdate();
    }

    get htmlFor()
    {
        const value = this.getAttribute("for");
        return value === null ? "" : value;
    }

    set htmlFor(value)
    {
        setOptionalAttribute(this, "for", value);
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

    get muted()
    {
        return this.#muted;
    }

    set muted(value)
    {
        this.#muted = value === true;
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

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    /**
     * Resolves the element named by the "for" attribute.
     * @returns {Element|null}
     */
    targetElement()
    {
        const targetId = this.htmlFor;

        if (targetId === "")
        {
            return null;
        }

        const root = this.getRootNode();

        if (typeof root.getElementById === "function")
        {
            return root.getElementById(targetId);
        }

        return document.getElementById(targetId);
    }

    // -------------------------------------------------------------------------
    // Gestures
    // -------------------------------------------------------------------------

    handleClick(event)
    {
        this.performAction({ source: "pointer" });
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        const target = this.targetElement();

        if (target === null)
        {
            return { action: "activate", handled: false, detail: { text: this.#text, targetId: this.htmlFor } };
        }

        if (typeof target.focus === "function")
        {
            target.focus();
        }

        return { action: "activate", handled: true, detail: { text: this.#text, targetId: this.htmlFor } };
    }
}
