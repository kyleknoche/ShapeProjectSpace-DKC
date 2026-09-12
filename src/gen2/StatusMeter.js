import { AbstractElement } from "../gen1/AbstractElement.js";
import { createElement, setText, setClass, attributeToBoolean, toText, toNumber, clamp } from "./support/dom.js";

/**
 * GEN 2 - StatusMeter
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> StatusMeter
 *
 * A progress bar and a status line in one control: how far along something is,
 * what state it is in, and what it has to say about itself. It covers the two
 * things a status region in real software has to do - show a determinate or
 * indeterminate meter, and carry a message that a person can dismiss.
 *
 * A note on the abstract action
 *   This control is the hardest case for the action seam, and it is worth being
 *   honest about why. A meter mostly reports; it does not obviously act. The
 *   temptation is to invent something ceremonial so the inheritance looks tidy.
 *   The act chosen here is acknowledge: taking notice of the current status and,
 *   when the control is dismissible, clearing it. That is a real operation with
 *   a real effect and a real gesture behind it - the dismiss button - rather
 *   than a method that exists to satisfy a base class. See docs/DECISIONS.md,
 *   decision 4.
 *
 * Attributes
 *   label, value, max, state, message, indeterminate, show-value, dismissible
 *
 * Properties
 *   label, value, max, state ("idle" | "busy" | "success" | "warning" | "error"),
 *   message, indeterminate, showValue, dismissible, percent (read-only)
 *
 * Methods
 *   setProgress(value, max), advance(amount), report(state, message), reset(),
 *   acknowledge(), snapshot()
 *
 * Events
 *   tg-progress   detail { value, max, percent }
 *   tg-status     detail { state, message, previousState }
 *   tg-action     detail.action is "acknowledge".
 */
export class StatusMeter extends AbstractElement
{
    static elementName = "tg-status-meter";

    static get observedAttributes()
    {
        return ["label", "value", "max", "state", "message", "indeterminate", "show-value", "dismissible"];
    }

    #label = "";
    #value = 0;
    #max = 100;
    #state = "idle";
    #message = "";
    #indeterminate = false;
    #showValue = true;
    #dismissible = false;

    constructor()
    {
        super();
        this.handleDismissClick = this.handleDismissClick.bind(this);
    }

    buildElements()
    {
        this.classList.add("tg-control", "tg-status-meter");

        const header = createElement("div", "tg-status-meter__header");
        const caption = createElement("span", "tg-status-meter__label");
        const readout = createElement("span", "tg-status-meter__readout");
        header.append(caption, readout);

        const track = createElement("div", "tg-status-meter__track");
        track.setAttribute("role", "progressbar");

        const bar = createElement("div", "tg-status-meter__bar");
        track.append(bar);

        const footer = createElement("div", "tg-status-meter__footer");
        const message = createElement("p", "tg-status-meter__message");
        message.setAttribute("role", "status");

        const dismiss = createElement("button", "tg-status-meter__dismiss");
        dismiss.type = "button";
        dismiss.textContent = "Acknowledge";

        footer.append(message, dismiss);

        this.defineElement("header", header);
        this.defineElement("caption", caption);
        this.defineElement("readout", readout);
        this.defineElement("track", track);
        this.defineElement("bar", bar);
        this.defineElement("footer", footer);
        this.defineElement("message", message);
        this.defineElement("dismiss", dismiss);

        this.append(header, track, footer);
    }

    bindEvents()
    {
        const dismiss = this.getElement("dismiss");
        this.addManagedListener(dismiss, "click", this.handleDismissClick);
    }

    syncElements()
    {
        const caption = this.getElement("caption");
        const readout = this.getElement("readout");
        const track = this.getElement("track");
        const bar = this.getElement("bar");
        const message = this.getElement("message");
        const dismiss = this.getElement("dismiss");
        const header = this.getElement("header");
        const footer = this.getElement("footer");

        setText(caption, this.#label);
        setClass(caption, "tg-status-meter__label--empty", this.#label === "");

        const percent = this.percent;
        setText(readout, this.#readoutText(percent));
        readout.hidden = this.#showValue === false;
        header.hidden = this.#label === "" && this.#showValue === false;

        bar.style.setProperty("--tg-meter-percent", String(percent));
        setClass(bar, "tg-status-meter__bar--indeterminate", this.#indeterminate);

        if (this.#indeterminate === true)
        {
            track.removeAttribute("aria-valuenow");
        }
        else
        {
            track.setAttribute("aria-valuenow", String(this.#value));
        }

        track.setAttribute("aria-valuemin", "0");
        track.setAttribute("aria-valuemax", String(this.#max));
        track.setAttribute("aria-label", this.#label === "" ? "Progress" : this.#label);

        setText(message, this.#message);
        message.hidden = this.#message === "";
        dismiss.hidden = this.#dismissible === false || this.#message === "";
        footer.hidden = message.hidden === true && dismiss.hidden === true;

        if (this.dataset.state !== this.#state)
        {
            this.dataset.state = this.#state;
        }
    }

    #readoutText(percent)
    {
        if (this.#indeterminate === true)
        {
            return "Working";
        }

        return String(Math.round(percent)) + "%";
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
            this.#value = toNumber(newValue, 0);
            return;
        }

        if (name === "max")
        {
            this.#max = toNumber(newValue, 100);
            return;
        }

        if (name === "state")
        {
            this.#state = newValue === null ? "idle" : newValue;
            return;
        }

        if (name === "message")
        {
            this.#message = toText(newValue);
            return;
        }

        if (name === "indeterminate")
        {
            this.#indeterminate = attributeToBoolean(newValue);
            return;
        }

        if (name === "show-value")
        {
            this.#showValue = attributeToBoolean(newValue);
            return;
        }

        if (name === "dismissible")
        {
            this.#dismissible = attributeToBoolean(newValue);
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
        this.setProgress(value, this.#max);
    }

    get max()
    {
        return this.#max;
    }

    set max(value)
    {
        this.setProgress(this.#value, value);
    }

    get state()
    {
        return this.#state;
    }

    set state(value)
    {
        this.report(value, this.#message);
    }

    get message()
    {
        return this.#message;
    }

    set message(value)
    {
        this.report(this.#state, value);
    }

    get indeterminate()
    {
        return this.#indeterminate;
    }

    set indeterminate(value)
    {
        this.#indeterminate = value === true;
        this.requestUpdate();
    }

    get showValue()
    {
        return this.#showValue;
    }

    set showValue(value)
    {
        this.#showValue = value === true;
        this.requestUpdate();
    }

    get dismissible()
    {
        return this.#dismissible;
    }

    set dismissible(value)
    {
        this.#dismissible = value === true;
        this.requestUpdate();
    }

    /**
     * Completion as a number from 0 to 100.
     * @returns {number}
     */
    get percent()
    {
        if (this.#max <= 0)
        {
            return 0;
        }

        return clamp(this.#value / this.#max * 100, 0, 100);
    }

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    /**
     * Sets the meter position. Emits tg-progress when the position moves.
     *
     * @param {number} value
     * @param {number} [max]
     * @returns {boolean} True when something changed.
     */
    setProgress(value, max)
    {
        const nextMax = max === undefined ? this.#max : toNumber(max, this.#max);
        const nextValue = clamp(toNumber(value, 0), 0, nextMax < 0 ? 0 : nextMax);
        const changed = nextValue !== this.#value || nextMax !== this.#max;

        this.#value = nextValue;
        this.#max = nextMax;
        this.requestUpdate();

        if (changed === true)
        {
            this.emit("tg-progress", { value: this.#value, max: this.#max, percent: this.percent });
        }

        return changed;
    }

    /**
     * Moves the meter by a relative amount.
     * @param {number} amount
     * @returns {boolean}
     */
    advance(amount)
    {
        return this.setProgress(this.#value + toNumber(amount, 0), this.#max);
    }

    /**
     * Sets the state and the message together. Emits tg-status when either
     * changes.
     *
     * @param {string} state "idle" | "busy" | "success" | "warning" | "error"
     * @param {string} [message]
     * @returns {boolean} True when something changed.
     */
    report(state, message)
    {
        const nextState = state === undefined || state === null ? "idle" : String(state);
        const nextMessage = message === undefined ? this.#message : toText(message);
        const previousState = this.#state;
        const changed = nextState !== this.#state || nextMessage !== this.#message;

        this.#state = nextState;
        this.#message = nextMessage;
        this.requestUpdate();

        if (changed === true)
        {
            this.emit("tg-status", { state: nextState, message: nextMessage, previousState: previousState });
        }

        return changed;
    }

    /**
     * Returns the meter to an empty idle state.
     */
    reset()
    {
        this.setProgress(0, this.#max);
        this.report("idle", "");
        this.indeterminate = false;
    }

    /**
     * Takes notice of the current status; clears it when dismissible.
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    acknowledge()
    {
        return this.performAction({ source: "api" });
    }

    /**
     * The current status as plain data.
     * @returns {{label: string, value: number, max: number, percent: number,
     *            state: string, message: string, indeterminate: boolean}}
     */
    snapshot()
    {
        return {
            label: this.#label,
            value: this.#value,
            max: this.#max,
            percent: this.percent,
            state: this.#state,
            message: this.#message,
            indeterminate: this.#indeterminate
        };
    }

    // -------------------------------------------------------------------------
    // Gestures
    // -------------------------------------------------------------------------

    handleDismissClick(event)
    {
        this.performAction({ source: "pointer" });
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        const acknowledged = this.snapshot();

        if (this.#dismissible === false)
        {
            return { action: "acknowledge", handled: false, detail: acknowledged };
        }

        this.report("idle", "");
        return { action: "acknowledge", handled: true, detail: acknowledged };
    }
}
