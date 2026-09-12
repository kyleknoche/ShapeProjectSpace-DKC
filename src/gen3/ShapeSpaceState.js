/**
 * GEN 3 - ShapeSpaceState
 * =============================================================================
 * The one piece of shared application state on this site, and the only one.
 *
 * Ownership
 *   A page constructs exactly one of these and hands it to whoever needs it.
 *   There is no module-level instance, no singleton accessor and no global. If
 *   you cannot see where an object got its state from, it did not get it from
 *   here.
 *
 * Why it exists outside Gen 1 and Gen 2
 *   Gen 1 must not own application state, and Gen 2 must not know that this
 *   application exists. A shared store is therefore a Gen-3 object, written
 *   explicitly, with its notifications carried on the ordinary DOM event system
 *   rather than a second mechanism invented for the purpose.
 *
 * Notifications
 *   Dispatches "shape-state-change" with detail:
 *
 *       { key, value, previousValue, origin, snapshot }
 *
 *   Listeners are ordinary event listeners, so a Three-Gen element can register
 *   one with addManagedListener() and have it released automatically on
 *   disconnect.
 */
export class ShapeSpaceState extends EventTarget
{
    #values = {};

    /**
     * @param {Object<string, *>} [initialValues]
     */
    constructor(initialValues)
    {
        super();

        this.#values =
        {
            section: "overview",
            boardNodeId: "",
            projectAreaId: "",
            lastAction: ""
        };

        if (initialValues !== null && initialValues !== undefined)
        {
            const keys = Object.keys(initialValues);

            for (let index = 0; index < keys.length; index = index + 1)
            {
                this.#values[keys[index]] = initialValues[keys[index]];
            }
        }
    }

    /**
     * @param {string} key
     * @returns {*}
     */
    get(key)
    {
        return this.#values[key];
    }

    /**
     * Sets one value and announces the change. Setting a value to what it
     * already is announces nothing.
     *
     * @param {string} key
     * @param {*} value
     * @param {string} [origin] Who made the change, for tracing.
     * @returns {boolean} True when the value changed.
     */
    set(key, value, origin)
    {
        const previousValue = this.#values[key];

        if (previousValue === value)
        {
            return false;
        }

        this.#values[key] = value;

        const event = new CustomEvent("shape-state-change",
        {
            detail:
            {
                key: key,
                value: value,
                previousValue: previousValue,
                origin: origin === undefined ? "unknown" : origin,
                snapshot: this.snapshot()
            }
        });

        this.dispatchEvent(event);
        return true;
    }

    get section()
    {
        return this.#values.section;
    }

    get boardNodeId()
    {
        return this.#values.boardNodeId;
    }

    get projectAreaId()
    {
        return this.#values.projectAreaId;
    }

    get lastAction()
    {
        return this.#values.lastAction;
    }

    /**
     * @returns {Object<string, *>} A copy; mutating it changes nothing.
     */
    snapshot()
    {
        const copy = {};
        const keys = Object.keys(this.#values);

        for (let index = 0; index < keys.length; index = index + 1)
        {
            copy[keys[index]] = this.#values[keys[index]];
        }

        return copy;
    }
}
