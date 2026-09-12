import { ImageView } from "../gen2/ImageView.js";

/**
 * GEN 3 - ShapeMark
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> ImageView -> ShapeMark
 *
 * The crossing-spline mark: two curves that pass through one another and carry
 * on. It is the closest thing Shape has to a likeness, and the only image on
 * this site that means anything.
 *
 * Loading, load state, the placeholder and the failure message belong to
 * ImageView. This class knows the file, the alternative text, and that the mark
 * has two sizes.
 *
 * Properties
 *   markSize   {string} "mark" | "large"
 *
 * Events
 *   Those of ImageView.
 *
 * Abstract action
 *   ImageView's "resolve". The act of an image is to become one.
 */
export class ShapeMark extends ImageView
{
    static elementName = "shape-mark";

    static get observedAttributes()
    {
        return ImageView.observedAttributes.concat(["mark-size"]);
    }

    #markSize = "mark";

    buildElements()
    {
        super.buildElements();
        this.classList.add("shape-mark");
    }

    onConnected()
    {
        if (this.src === "")
        {
            this.src = MARK_SOURCE;
        }

        if (this.alt === "")
        {
            this.alt = "The Shape mark: two splines crossing and continuing.";
        }

        this.placeholderText = "Shape";
        super.onConnected();
    }

    syncElements()
    {
        super.syncElements();

        if (this.dataset.markSize !== this.#markSize)
        {
            this.dataset.markSize = this.#markSize;
        }
    }

    onAttributeChanged(name, oldValue, newValue)
    {
        if (name === "mark-size")
        {
            this.#markSize = newValue === null ? "mark" : newValue;
            return;
        }

        super.onAttributeChanged(name, oldValue, newValue);
    }

    get markSize()
    {
        return this.#markSize;
    }

    set markSize(value)
    {
        this.#markSize = value === undefined || value === null ? "mark" : String(value);
        this.requestUpdate();
    }
}

/**
 * The mark file, relative to the site root.
 */
const MARK_SOURCE = "assets/img/shape-mark.svg";
