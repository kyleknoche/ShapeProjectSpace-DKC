import { AbstractElement } from "../gen1/AbstractElement.js";
import { createElement, setText, setClass, setOptionalAttribute, attributeToBoolean, toText } from "./support/dom.js";

/**
 * GEN 2 - ImageView
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> ImageView
 *
 * A figure with a load state. It shows a placeholder before a source resolves,
 * a caption underneath, and a readable failure message instead of a broken
 * image glyph when a source cannot be loaded.
 *
 * The class is called ImageView rather than Image because Image is a global
 * constructor in every browser, and a module that imports a class called Image
 * silently shadows it. The custom element tag is still tg-image.
 *
 * Attributes
 *   src, alt, caption, fit ("contain" | "cover"), ratio, placeholder-text, lazy
 *
 * Properties
 *   src, alt, caption, fit, ratio, placeholderText, lazy,
 *   loadState (read-only: "idle" | "loading" | "loaded" | "error")
 *
 * Methods
 *   resolve()       Loads or reloads the current source.
 *   naturalSize()   { width, height } of the loaded image, zeros before that.
 *
 * Events
 *   tg-load     detail { src, width, height }
 *   tg-error    detail { src }
 *   tg-action   detail.action is "resolve".
 *
 * Abstract action
 *   "resolve" - turn a source into a displayed picture. That is the whole
 *   purpose of the control, and it is genuinely an operation rather than a
 *   state: it can be retried, it can fail, and it reports an outcome.
 */
export class ImageView extends AbstractElement
{
    static elementName = "tg-image";

    static get observedAttributes()
    {
        return ["src", "alt", "caption", "fit", "ratio", "placeholder-text", "lazy"];
    }

    #src = "";
    #alt = "";
    #caption = "";
    #fit = "contain";
    #ratio = "";
    #placeholderText = "No image";
    #lazy = false;
    #loadState = "idle";
    #resolvedSrc = "";

    constructor()
    {
        super();
        this.handleImageLoad = this.handleImageLoad.bind(this);
        this.handleImageError = this.handleImageError.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-image");

        const figure = createElement("figure", "tg-image__figure");
        const frame = createElement("div", "tg-image__frame");

        const picture = createElement("img", "tg-image__picture");
        picture.decoding = "async";

        const placeholder = createElement("span", "tg-image__placeholder");
        const caption = createElement("figcaption", "tg-image__caption");

        frame.append(placeholder, picture);
        figure.append(frame, caption);

        this.defineElement("figure", figure);
        this.defineElement("frame", frame);
        this.defineElement("picture", picture);
        this.defineElement("placeholder", placeholder);
        this.defineElement("caption", caption);

        this.append(figure);
    }

    bindEvents()
    {
        const picture = this.getElement("picture");
        this.addManagedListener(picture, "load", this.handleImageLoad);
        this.addManagedListener(picture, "error", this.handleImageError);
    }

    syncElements()
    {
        const picture = this.getElement("picture");
        const placeholder = this.getElement("placeholder");
        const caption = this.getElement("caption");
        const frame = this.getElement("frame");

        picture.alt = this.#alt;
        picture.loading = this.#lazy === true ? "lazy" : "eager";

        setText(caption, this.#caption);
        setClass(caption, "tg-image__caption--visible", this.#caption !== "");

        setText(placeholder, this.#placeholderTextForState());
        setClass(placeholder, "tg-image__placeholder--visible", this.#loadState !== "loaded");
        setClass(picture, "tg-image__picture--visible", this.#loadState === "loaded");

        frame.style.setProperty("--tg-image-ratio", this.#ratio === "" ? "auto" : this.#ratio);
        setOptionalAttribute(frame, "data-fit", this.#fit);

        if (this.dataset.state !== this.#loadState)
        {
            this.dataset.state = this.#loadState;
        }
    }

    #placeholderTextForState()
    {
        if (this.#loadState === "loading")
        {
            return "Loading";
        }

        if (this.#loadState === "error")
        {
            return "Image unavailable";
        }

        return this.#placeholderText;
    }

    onConnected()
    {
        if (this.#src !== "" && this.#loadState === "idle")
        {
            this.resolve();
        }
    }

    onAttributeChanged(name, oldValue, newValue)
    {
        if (name === "src")
        {
            this.#src = toText(newValue);
            this.#loadState = "idle";
            return;
        }

        if (name === "alt")
        {
            this.#alt = toText(newValue);
            return;
        }

        if (name === "caption")
        {
            this.#caption = toText(newValue);
            return;
        }

        if (name === "fit")
        {
            this.#fit = newValue === null ? "contain" : newValue;
            return;
        }

        if (name === "ratio")
        {
            this.#ratio = toText(newValue);
            return;
        }

        if (name === "placeholder-text")
        {
            this.#placeholderText = newValue === null ? "No image" : newValue;
            return;
        }

        if (name === "lazy")
        {
            this.#lazy = attributeToBoolean(newValue);
        }
    }

    // -------------------------------------------------------------------------
    // Properties
    // -------------------------------------------------------------------------

    get src()
    {
        return this.#src;
    }

    set src(value)
    {
        const next = toText(value);

        if (next === this.#src)
        {
            return;
        }

        this.#src = next;
        this.#loadState = "idle";
        this.requestUpdate();

        if (this.isBuilt === true && this.isConnected === true)
        {
            this.resolve();
        }
    }

    get alt()
    {
        return this.#alt;
    }

    set alt(value)
    {
        this.#alt = toText(value);
        this.requestUpdate();
    }

    get caption()
    {
        return this.#caption;
    }

    set caption(value)
    {
        this.#caption = toText(value);
        this.requestUpdate();
    }

    get fit()
    {
        return this.#fit;
    }

    set fit(value)
    {
        this.#fit = value === undefined || value === null ? "contain" : String(value);
        this.requestUpdate();
    }

    get ratio()
    {
        return this.#ratio;
    }

    set ratio(value)
    {
        this.#ratio = toText(value);
        this.requestUpdate();
    }

    get placeholderText()
    {
        return this.#placeholderText;
    }

    set placeholderText(value)
    {
        this.#placeholderText = toText(value);
        this.requestUpdate();
    }

    get lazy()
    {
        return this.#lazy;
    }

    set lazy(value)
    {
        this.#lazy = value === true;
        this.requestUpdate();
    }

    get loadState()
    {
        return this.#loadState;
    }

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    /**
     * Loads or reloads the current source.
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    resolve()
    {
        return this.performAction({ source: "api" });
    }

    /**
     * @returns {{width: number, height: number}}
     */
    naturalSize()
    {
        if (this.isBuilt === false)
        {
            return { width: 0, height: 0 };
        }

        const picture = this.getElement("picture");
        return { width: picture.naturalWidth, height: picture.naturalHeight };
    }

    // -------------------------------------------------------------------------
    // Gestures and platform callbacks
    // -------------------------------------------------------------------------

    handleImageLoad(event)
    {
        const picture = this.getElement("picture");
        this.#loadState = "loaded";
        this.#resolvedSrc = this.#src;
        this.requestUpdate();
        this.emit("tg-load", { src: this.#src, width: picture.naturalWidth, height: picture.naturalHeight });
    }

    handleImageError(event)
    {
        this.#loadState = "error";
        this.requestUpdate();
        this.emit("tg-error", { src: this.#src });
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        if (this.isBuilt === false)
        {
            return { action: "resolve", handled: false, detail: { src: this.#src, state: this.#loadState } };
        }

        const picture = this.getElement("picture");

        if (this.#src === "")
        {
            picture.removeAttribute("src");
            this.#loadState = "idle";
            this.#resolvedSrc = "";
            this.requestUpdate();
            return { action: "resolve", handled: false, detail: { src: "", state: this.#loadState } };
        }

        this.#loadState = "loading";
        this.requestUpdate();
        picture.src = this.#src;

        return { action: "resolve", handled: true, detail: { src: this.#src, state: this.#loadState, previousSrc: this.#resolvedSrc } };
    }
}
