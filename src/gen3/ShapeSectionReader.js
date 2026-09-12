import { Panel } from "../gen2/Panel.js";
import { ChildReconciler } from "../gen2/support/ChildReconciler.js";
import { createElement, setText, setClass, toText } from "../gen2/support/dom.js";
import { SECTIONS, sectionFor } from "./data/projectSpace.js";

/**
 * GEN 3 - ShapeSectionReader
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> Panel -> ShapeSectionReader
 *
 * The reading surface of the site. It shows one section of Shape Project Space:
 * a heading, a standfirst, the paragraphs, and an aside when the section has
 * one.
 *
 * The frame and the collapse behaviour are Panel's. What this class adds is the
 * project's own content model - that a section has those four parts and that
 * switching sections is navigation rather than a rebuild. The paragraph nodes
 * are reconciled by position, so moving between two sections of the same length
 * replaces text inside paragraphs that already exist.
 *
 * Properties
 *   sectionId   {string} The section currently shown.
 *   section     {object|null} Read-only; the section record.
 *   sections    {Object<string, object>} The content source. Defaults to the project's.
 *
 * Methods
 *   showSection(id)   Shows a section and announces it.
 *
 * Events
 *   shape-section-change   detail { id, heading }
 *   plus every event Panel emits.
 *
 * Abstract action
 *   Panel's "toggle" unless the payload names a section, in which case the act
 *   is "show-section". The same arrangement ShapeBoard uses, for the same
 *   reason: an application element may add a meaning to the seam without
 *   discarding the one it inherited.
 */
export class ShapeSectionReader extends Panel
{
    static elementName = "shape-section-reader";

    #sections = SECTIONS;
    #sectionId = "overview";
    #paragraphReconciler = null;

    constructor()
    {
        super();
        this.paragraphKeyOf = this.paragraphKeyOf.bind(this);
        this.createParagraph = this.createParagraph.bind(this);
        this.updateParagraph = this.updateParagraph.bind(this);
    }

    buildElements()
    {
        super.buildElements();
        this.classList.add("shape-section-reader");

        const article = createElement("article", "shape-section-reader__article");
        const standfirst = createElement("p", "shape-section-reader__standfirst");
        const prose = createElement("div", "shape-section-reader__prose");
        const note = createElement("p", "shape-section-reader__note");

        article.append(standfirst, prose, note);

        this.defineElement("article", article);
        this.defineElement("standfirst", standfirst);
        this.defineElement("prose", prose);
        this.defineElement("note", note);

        const body = this.getElement("body");
        body.append(article);

        this.#paragraphReconciler = new ChildReconciler(prose,
        {
            keyOf: this.paragraphKeyOf,
            create: this.createParagraph,
            update: this.updateParagraph
        });
    }

    syncElements()
    {
        super.syncElements();

        if (this.hasElement("prose") === false)
        {
            return;
        }

        const section = this.section;
        const standfirst = this.getElement("standfirst");
        const note = this.getElement("note");

        if (section === null)
        {
            setText(standfirst, "");
            setText(note, "Unknown section: " + this.#sectionId);
            note.hidden = false;
            this.#paragraphReconciler.reconcile([]);
            return;
        }

        setText(standfirst, toText(section.standfirst));
        standfirst.hidden = toText(section.standfirst) === "";

        this.#paragraphReconciler.reconcile(Array.isArray(section.paragraphs) ? section.paragraphs : []);

        setText(note, toText(section.note));
        note.hidden = toText(section.note) === "";

        setClass(this, "shape-section-reader--empty", false);
    }

    paragraphKeyOf(text, index)
    {
        return "paragraph-" + String(index);
    }

    createParagraph(text, key)
    {
        const paragraph = createElement("p", "shape-section-reader__paragraph");
        paragraph.dataset.key = key;
        return paragraph;
    }

    updateParagraph(paragraph, text)
    {
        setText(paragraph, toText(text));
    }

    // -------------------------------------------------------------------------
    // Properties
    // -------------------------------------------------------------------------

    get sectionId()
    {
        return this.#sectionId;
    }

    set sectionId(value)
    {
        this.#sectionId = toText(value);
        this.#applyHeading();
        this.requestUpdate();
    }

    get section()
    {
        const section = this.#sections[this.#sectionId];
        return section === undefined ? null : section;
    }

    get sections()
    {
        return this.#sections;
    }

    set sections(value)
    {
        this.#sections = value === null || value === undefined ? {} : value;
        this.requestUpdate();
    }

    #applyHeading()
    {
        const section = this.section;
        this.heading = section === null ? "Not found" : toText(section.heading);
    }

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    /**
     * Shows a section and announces it.
     * @param {string} id
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    showSection(id)
    {
        return this.performAction({ source: "api", sectionId: toText(id) });
    }

    /**
     * @param {string} id
     * @returns {object|null}
     */
    sectionRecordFor(id)
    {
        return sectionFor(id);
    }

    onConnected()
    {
        super.onConnected();
        this.#applyHeading();
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        const wantsSection = payload !== null && payload !== undefined && payload.sectionId !== undefined;

        if (wantsSection === false)
        {
            return super.abstractAction(payload);
        }

        const id = toText(payload.sectionId);
        const section = this.#sections[id];

        if (section === undefined)
        {
            return { action: "show-section", handled: false, detail: { id: id, heading: "" } };
        }

        const previousId = this.#sectionId;
        this.#sectionId = id;
        this.#applyHeading();
        this.requestUpdate();

        if (previousId !== id)
        {
            this.emit("shape-section-change", { id: id, heading: toText(section.heading), previousId: previousId });
        }

        return { action: "show-section", handled: true, detail: { id: id, heading: toText(section.heading), previousId: previousId } };
    }
}
