import { AbstractElement } from "../gen1/AbstractElement.js";
import { createElement, setText, setClass, removeAllChildren, attributeToBoolean, toText } from "./support/dom.js";

/**
 * GEN 2 - Panel
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> Panel
 *
 * A titled region with an optional collapse control, a toolbar slot and a
 * footer. It is the container the rest of a layout is built from, and it is the
 * natural base for any application region that has a heading and a body.
 *
 * Authored children
 *   Markup written inside the element is adopted, not discarded:
 *
 *       <tg-panel heading="Notes">
 *           <p>Anything here becomes the panel body.</p>
 *       </tg-panel>
 *
 *   The existing child nodes are moved into the body container on first build.
 *   They are moved, not recreated, so references held elsewhere stay valid.
 *
 * Attributes
 *   heading, subheading, variant, collapsible, collapsed, padded, flush
 *
 * Properties
 *   heading, subheading, variant, collapsible, collapsed, padded, flush
 *
 * Methods
 *   expand(), collapse(), toggleCollapsed(), setContent(node),
 *   appendContent(node), clearContent(), setToolbar(node), setFooter(node)
 *
 * Events
 *   tg-toggle   detail { collapsed }
 *   tg-action   detail.action is "toggle".
 *
 * Abstract action
 *   "toggle" - show or hide the body. A panel that is not collapsible answers
 *   with handled: false rather than pretending to act, which is the honest
 *   result and is exactly what the disabled-state convention in this library
 *   does everywhere else.
 */
export class Panel extends AbstractElement
{
    static elementName = "tg-panel";

    static get observedAttributes()
    {
        return ["heading", "subheading", "variant", "collapsible", "collapsed", "padded", "flush"];
    }

    #heading = "";
    #subheading = "";
    #variant = "default";
    #collapsible = false;
    #collapsed = false;
    #padded = true;
    #flush = false;

    constructor()
    {
        super();
        this.handleToggleClick = this.handleToggleClick.bind(this);
    }

    buildElements()
    {
        const adoptedNodes = Array.prototype.slice.call(this.childNodes);

        this.classList.add("tg-control", "tg-panel");

        const header = createElement("header", "tg-panel__header");

        const headings = createElement("div", "tg-panel__headings");
        const title = createElement("h2", "tg-panel__title");
        title.id = this.elementId + "-title";
        const subtitle = createElement("p", "tg-panel__subtitle");
        headings.append(title, subtitle);

        const toolbar = createElement("div", "tg-panel__toolbar");

        const toggle = createElement("button", "tg-panel__toggle");
        toggle.type = "button";
        toggle.setAttribute("aria-controls", this.elementId + "-body");

        header.append(headings, toolbar, toggle);

        const body = createElement("div", "tg-panel__body");
        body.id = this.elementId + "-body";
        body.setAttribute("role", "region");
        body.setAttribute("aria-labelledby", title.id);

        const footer = createElement("footer", "tg-panel__footer");

        this.defineElement("header", header);
        this.defineElement("headings", headings);
        this.defineElement("title", title);
        this.defineElement("subtitle", subtitle);
        this.defineElement("toolbar", toolbar);
        this.defineElement("toggle", toggle);
        this.defineElement("body", body);
        this.defineElement("footer", footer);

        this.append(header, body, footer);

        for (let index = 0; index < adoptedNodes.length; index = index + 1)
        {
            body.appendChild(adoptedNodes[index]);
        }
    }

    bindEvents()
    {
        const toggle = this.getElement("toggle");
        this.addManagedListener(toggle, "click", this.handleToggleClick);
    }

    syncElements()
    {
        const title = this.getElement("title");
        const subtitle = this.getElement("subtitle");
        const toggle = this.getElement("toggle");
        const body = this.getElement("body");
        const header = this.getElement("header");
        const footer = this.getElement("footer");
        const toolbar = this.getElement("toolbar");

        setText(title, this.#heading);
        setClass(title, "tg-panel__title--empty", this.#heading === "");

        setText(subtitle, this.#subheading);
        setClass(subtitle, "tg-panel__subtitle--visible", this.#subheading !== "");

        setText(toggle, this.#collapsed === true ? "Show" : "Hide");
        toggle.hidden = this.#collapsible === false;
        toggle.setAttribute("aria-expanded", this.#collapsed === true ? "false" : "true");

        body.hidden = this.#collapsible === true && this.#collapsed === true;

        header.hidden = this.#heading === "" && this.#subheading === "" && this.#collapsible === false && toolbar.childNodes.length === 0;
        footer.hidden = footer.childNodes.length === 0;

        setClass(this, "tg-panel--collapsed", this.#collapsible === true && this.#collapsed === true);
        setClass(this, "tg-panel--collapsible", this.#collapsible);
        setClass(this, "tg-panel--padded", this.#padded);
        setClass(this, "tg-panel--flush", this.#flush);

        if (this.dataset.variant !== this.#variant)
        {
            this.dataset.variant = this.#variant;
        }
    }

    onAttributeChanged(name, oldValue, newValue)
    {
        if (name === "heading")
        {
            this.#heading = toText(newValue);
            return;
        }

        if (name === "subheading")
        {
            this.#subheading = toText(newValue);
            return;
        }

        if (name === "variant")
        {
            this.#variant = newValue === null ? "default" : newValue;
            return;
        }

        if (name === "collapsible")
        {
            this.#collapsible = attributeToBoolean(newValue);
            return;
        }

        if (name === "collapsed")
        {
            this.#collapsed = attributeToBoolean(newValue);
            return;
        }

        if (name === "padded")
        {
            this.#padded = attributeToBoolean(newValue);
            return;
        }

        if (name === "flush")
        {
            this.#flush = attributeToBoolean(newValue);
        }
    }

    // -------------------------------------------------------------------------
    // Properties
    // -------------------------------------------------------------------------

    get heading()
    {
        return this.#heading;
    }

    set heading(value)
    {
        this.#heading = toText(value);
        this.requestUpdate();
    }

    get subheading()
    {
        return this.#subheading;
    }

    set subheading(value)
    {
        this.#subheading = toText(value);
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

    get collapsible()
    {
        return this.#collapsible;
    }

    set collapsible(value)
    {
        this.#collapsible = value === true;
        this.requestUpdate();
    }

    get collapsed()
    {
        return this.#collapsed;
    }

    /**
     * State assignment. Does not emit tg-toggle; use collapse(), expand() or
     * toggleCollapsed() to express intent.
     */
    set collapsed(value)
    {
        this.#collapsed = value === true;
        this.requestUpdate();
    }

    get padded()
    {
        return this.#padded;
    }

    set padded(value)
    {
        this.#padded = value === true;
        this.requestUpdate();
    }

    get flush()
    {
        return this.#flush;
    }

    set flush(value)
    {
        this.#flush = value === true;
        this.requestUpdate();
    }

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    expand()
    {
        return this.performAction({ source: "api", collapsed: false });
    }

    collapse()
    {
        return this.performAction({ source: "api", collapsed: true });
    }

    toggleCollapsed()
    {
        return this.performAction({ source: "api" });
    }

    /**
     * Replaces the body content with one node.
     * @param {Node} node
     * @returns {Node} The same node.
     */
    setContent(node)
    {
        const body = this.getElement("body");
        removeAllChildren(body);
        body.appendChild(node);
        this.requestUpdate();
        return node;
    }

    /**
     * Adds a node to the body without disturbing what is there.
     * @param {Node} node
     * @returns {Node} The same node.
     */
    appendContent(node)
    {
        const body = this.getElement("body");
        body.appendChild(node);
        this.requestUpdate();
        return node;
    }

    clearContent()
    {
        const body = this.getElement("body");
        removeAllChildren(body);
        this.requestUpdate();
    }

    /**
     * Replaces the header toolbar content.
     * @param {Node} node
     * @returns {Node} The same node.
     */
    setToolbar(node)
    {
        const toolbar = this.getElement("toolbar");
        removeAllChildren(toolbar);
        toolbar.appendChild(node);
        this.requestUpdate();
        return node;
    }

    /**
     * Replaces the footer content.
     * @param {Node} node
     * @returns {Node} The same node.
     */
    setFooter(node)
    {
        const footer = this.getElement("footer");
        removeAllChildren(footer);
        footer.appendChild(node);
        this.requestUpdate();
        return node;
    }

    // -------------------------------------------------------------------------
    // Gestures
    // -------------------------------------------------------------------------

    handleToggleClick(event)
    {
        this.performAction({ source: "pointer" });
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        if (this.#collapsible === false)
        {
            return { action: "toggle", handled: false, detail: { collapsed: this.#collapsed, heading: this.#heading } };
        }

        const previousCollapsed = this.#collapsed;
        const requested = payload !== null && payload !== undefined && typeof payload.collapsed === "boolean";
        const next = requested === true ? payload.collapsed : previousCollapsed === false;

        this.#collapsed = next;
        this.requestUpdate();

        if (next !== previousCollapsed)
        {
            this.emit("tg-toggle", { collapsed: next, heading: this.#heading });
        }

        return {
            action: "toggle",
            handled: true,
            detail: { collapsed: next, previousCollapsed: previousCollapsed, heading: this.#heading }
        };
    }
}
