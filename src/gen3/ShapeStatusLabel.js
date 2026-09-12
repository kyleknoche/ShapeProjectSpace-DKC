import { Label } from "../gen2/Label.js";

/**
 * GEN 3 - ShapeStatusLabel
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> Label -> ShapeStatusLabel
 *
 * A readout of where the visitor is in Shape Project Space.
 *
 * It is the smallest Gen-3 class in the repository and it exists to demonstrate
 * one thing precisely: how an application element subscribes to shared state
 * without smuggling a store into Gen 1 or Gen 2. The subscription is registered
 * with the managed listener facility that every Three-Gen element already has,
 * so it is released on disconnect like any other listener, and the state object
 * is handed in from outside rather than imported from a global.
 *
 * Properties
 *   state   {ShapeSpaceState|null} Read-only; assign with bindState().
 *
 * Methods
 *   bindState(state)   Subscribes to a state object. Passing null unsubscribes.
 *
 * Events
 *   Those of Label.
 *
 * Abstract action
 *   Label's "activate". A status readout has no separate act of its own, and
 *   inventing one would be ceremony.
 */
export class ShapeStatusLabel extends Label
{
    static elementName = "shape-status-label";

    #state = null;
    #stateToken = null;

    constructor()
    {
        super();
        this.handleStateChange = this.handleStateChange.bind(this);
    }

    buildElements()
    {
        super.buildElements();
        this.classList.add("shape-status-label");
    }

    onConnected()
    {
        super.onConnected();
        this.#subscribe();
        this.#render();
    }

    onDisconnected()
    {
        super.onDisconnected();
        this.#stateToken = null;
    }

    /**
     * Subscribes this label to a state object.
     *
     * @param {EventTarget|null} state
     * @returns {this}
     */
    bindState(state)
    {
        if (this.#stateToken !== null)
        {
            this.removeManagedListener(this.#stateToken);
            this.#stateToken = null;
        }

        this.#state = state === undefined ? null : state;
        this.#subscribe();
        this.#render();
        return this;
    }

    get state()
    {
        return this.#state;
    }

    #subscribe()
    {
        if (this.#state === null || this.isConnected === false || this.#stateToken !== null)
        {
            return;
        }

        this.#stateToken = this.addManagedListener(this.#state, "shape-state-change", this.handleStateChange);
    }

    #render()
    {
        if (this.#state === null)
        {
            this.text = "No state bound.";
            return;
        }

        const snapshot = this.#state.snapshot();
        const parts = ["Section: " + snapshot.section];

        if (snapshot.boardNodeId !== "")
        {
            parts.push("Board: " + snapshot.boardNodeId);
        }

        if (snapshot.projectAreaId !== "")
        {
            parts.push("Area: " + snapshot.projectAreaId);
        }

        if (snapshot.lastAction !== "")
        {
            parts.push("Last: " + snapshot.lastAction);
        }

        this.text = parts.join("  ·  ");
    }

    handleStateChange(event)
    {
        this.#render();
    }
}
