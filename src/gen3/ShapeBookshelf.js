import { ListBox } from "../gen2/ListBox.js";
import { SHELF_BOOKS } from "./data/projectSpace.js";

/**
 * GEN 3 - ShapeBookshelf
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> ListBox -> ShapeBookshelf
 *
 * The one-row bookshelf that navigates Shape Project Space. Each book is a
 * section of the site; selecting a book is navigation.
 *
 * This class adds almost no behaviour, which is the point. A horizontal list of
 * selectable items with keyboard navigation, an active descendant and an
 * activation gesture is a solved problem and the solution lives in ListBox.
 * What Gen 3 supplies is what ListBox is not allowed to know: that the items
 * are the project's sections, that a spine carries a number, that activation
 * means navigation, and that the event other parts of this site listen for is
 * called shape-navigate.
 *
 * Properties
 *   books        {Array<object>} The shelf contents. Defaults to the project's.
 *   currentSection {string} Shorthand for the selected value.
 *
 * Methods
 *   showSection(value)   Selects and activates a section by name.
 *
 * Events
 *   shape-navigate   detail { section, book, source }
 *   plus every event ListBox emits.
 *
 * Abstract action
 *   Inherited from ListBox as "activate", then extended: after the generic
 *   activation succeeds, the shelf announces navigation in the project's own
 *   vocabulary. Gen 3 specialises the seam rather than replacing it.
 */
export class ShapeBookshelf extends ListBox
{
    static elementName = "shape-bookshelf";

    #books = SHELF_BOOKS;

    buildElements()
    {
        super.buildElements();
        this.classList.add("shape-bookshelf");
    }

    onConnected()
    {
        super.onConnected();
        this.orientation = "horizontal";
        this.selectionMode = "single";
        this.activateOnSelect = true;
        this.emptyText = "The shelf is empty.";

        if (this.items.length === 0)
        {
            this.items = this.#shelfItems();
        }

        if (this.value === "" && this.#books.length > 0)
        {
            this.value = this.#books[0].value;
        }
    }

    #shelfItems()
    {
        const items = [];

        for (let index = 0; index < this.#books.length; index = index + 1)
        {
            const book = this.#books[index];

            items.push(
            {
                value: book.value,
                label: book.label,
                description: book.description,
                badge: book.spine
            });
        }

        return items;
    }

    /**
     * @returns {Array<object>}
     */
    get books()
    {
        return this.#books.slice();
    }

    set books(value)
    {
        this.#books = Array.isArray(value) ? value.slice() : [];
        this.items = this.#shelfItems();
    }

    /**
     * @returns {string}
     */
    get currentSection()
    {
        return this.value;
    }

    /**
     * Selects and activates a section by name.
     * @param {string} value
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    showSection(value)
    {
        this.selectValue(value);
        return this.activateValue(value);
    }

    /**
     * @param {string} value
     * @returns {object|null}
     */
    bookFor(value)
    {
        for (let index = 0; index < this.#books.length; index = index + 1)
        {
            if (this.#books[index].value === value)
            {
                return this.#books[index];
            }
        }

        return null;
    }

    abstractAction(payload)
    {
        const result = super.abstractAction(payload);

        if (result.handled === false)
        {
            return result;
        }

        const book = this.bookFor(result.detail.value);
        const source = payload === null || payload === undefined ? "unknown" : payload.source;

        this.emit("shape-navigate", { section: result.detail.value, book: book, source: source });

        return {
            action: result.action,
            handled: true,
            detail: { section: result.detail.value, book: book, index: result.detail.index }
        };
    }
}
