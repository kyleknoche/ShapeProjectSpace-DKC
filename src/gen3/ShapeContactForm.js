import { Form } from "../gen2/Form.js";
import { CONTACT_ADDRESS, SECTIONS } from "./data/projectSpace.js";

/**
 * GEN 3 - ShapeContactForm
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> Form -> ShapeContactForm
 *
 * Correspondence with the project.
 *
 * Field discovery, validation, value collection and the submit protocol are all
 * Form's. This class supplies the project's heading, the address, and one piece
 * of honesty that matters: this site has no backend, so a submitted message is
 * composed locally and is not transmitted anywhere. The form says so rather
 * than showing a success notice for something that did not happen.
 *
 * Properties
 *   address   {string} The correspondence address shown after a submission.
 *
 * Methods
 *   composeMessage(values)   Builds the plain-text message from field values.
 *
 * Events
 *   shape-contact-composed   detail { values, message, address }
 *   plus every event Form emits.
 *
 * Abstract action
 *   Form's "submit", extended. Validation and collection are not repeated here;
 *   this class runs after them and decides what submission means for a site
 *   with nothing to submit to.
 */
export class ShapeContactForm extends Form
{
    static elementName = "shape-contact-form";

    #address = CONTACT_ADDRESS;

    buildElements()
    {
        super.buildElements();
        this.classList.add("shape-contact-form");
    }

    onConnected()
    {
        super.onConnected();

        if (this.heading === "")
        {
            this.heading = SECTIONS.contact.heading;
        }

        if (this.description === "")
        {
            this.description = SECTIONS.contact.standfirst;
        }

        this.submitText = "Compose message";
        this.showReset = true;
    }

    get address()
    {
        return this.#address;
    }

    set address(value)
    {
        this.#address = value === undefined || value === null ? "" : String(value);
    }

    /**
     * Builds the plain-text message a visitor can copy and send themselves.
     *
     * @param {Object<string, *>} values
     * @returns {string}
     */
    composeMessage(values)
    {
        const lines = [];
        const names = Object.keys(values);

        for (let index = 0; index < names.length; index = index + 1)
        {
            const name = names[index];
            lines.push(name + ": " + String(values[name]));
        }

        return lines.join("\n");
    }

    abstractAction(payload)
    {
        const result = super.abstractAction(payload);

        if (result.handled === false)
        {
            return result;
        }

        const values = result.detail.values;
        const message = this.composeMessage(values);

        this.noticeState = "success";
        this.noticeText = "Message composed. This site has no server, so nothing was sent. Write to " + this.#address + " to reach the project.";

        this.emit("shape-contact-composed", { values: values, message: message, address: this.#address });

        return {
            action: result.action,
            handled: true,
            detail: { values: values, message: message, address: this.#address, transmitted: false }
        };
    }
}
