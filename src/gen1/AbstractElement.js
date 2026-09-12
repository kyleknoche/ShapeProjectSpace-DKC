/**
 * GEN 1 - AbstractElement
 * =============================================================================
 * The single abstract foundation of the Three-Gen Design Pattern.
 *
 *     HTMLElement
 *         v
 *     AbstractElement        <-- GEN 1 (this file)
 *         v
 *     Concrete controls      <-- GEN 2
 *         v
 *     Application elements   <-- GEN 3
 *
 * Gen 1 is deliberately small. It owns exactly five concerns and nothing else:
 *
 *     1. Identity        - a stable id for every instance.
 *     2. Lifecycle       - build once, bind on connect, release on disconnect.
 *     3. Owned DOM       - durable named references to nodes the element created.
 *     4. Managed events  - listeners that are guaranteed to be removable.
 *     5. The action seam - performAction() / abstractAction().
 *
 * Gen 1 owns NO routing, NO stores, NO repositories, NO application state, NO
 * graph logic, NO content loading, NO dependency injection, NO metadata system
 * and NO knowledge whatsoever of any particular application. Before adding
 * anything here, answer this question honestly:
 *
 *     "Is this intrinsic to the existence and lifecycle contract of
 *      essentially every Three-Gen element?"
 *
 * If the answer is no, it belongs in Gen 2 or Gen 3.
 *
 * See docs/THREE-GEN.md and CODING-STANDARDS.md before modifying this file.
 */

let instanceCounter = 0;

/**
 * Abstract base class for every Three-Gen element.
 *
 * @abstract
 * @extends HTMLElement
 *
 * @fires tg-connected    Once per connection, after build/bind/sync.
 * @fires tg-disconnected Once per disconnection, after listeners are released.
 * @fires tg-action       Whenever performAction() completes. detail = ActionResult.
 */
export class AbstractElement extends HTMLElement
{
    /**
     * Default custom-element tag name. Every concrete subclass must override
     * this with a valid hyphenated tag name.
     * @type {string|null}
     */
    static elementName = null;

    /**
     * Gen 1 observes no attributes of its own. Subclasses override this and
     * handle changes in onAttributeChanged().
     * @returns {string[]}
     */
    static get observedAttributes()
    {
        return [];
    }

    /**
     * Registers this class with the custom element registry.
     *
     * Registration is idempotent: calling define() twice is a no-op, which lets
     * several independent page scripts register the same library without
     * coordinating. Registering a different class under an occupied tag name is
     * an error, because that is always a mistake rather than a convenience.
     *
     * @param {string} [tagName] Defaults to the class's static elementName.
     * @returns {typeof AbstractElement} This class, for convenience.
     */
    static define(tagName = this.elementName)
    {
        if (typeof tagName !== "string" || tagName.indexOf("-") < 0)
        {
            throw new TypeError(this.name + ".define() requires a hyphenated tag name.");
        }

        if (typeof customElements === "undefined")
        {
            throw new ReferenceError("Custom element registry unavailable; cannot define " + tagName + ".");
        }

        const existing = customElements.get(tagName);

        if (existing === this)
        {
            return this;
        }

        if (existing !== undefined)
        {
            throw new Error("Tag name " + tagName + " is already defined by " + existing.name + ".");
        }

        customElements.define(tagName, this);
        return this;
    }

    #elementId = "";
    #listeners = [];
    #built = false;
    #connectionCount = 0;
    #updateDepth = 0;
    #updatesSuspended = 0;

    /**
     * Custom element constructors may not touch attributes or children, so this
     * constructor only establishes JavaScript state. All DOM work happens on
     * first connection, in buildElements().
     */
    constructor()
    {
        super();

        if (new.target === AbstractElement)
        {
            throw new TypeError("AbstractElement is abstract and cannot be instantiated directly.");
        }

        if (this.abstractAction === AbstractElement.prototype.abstractAction)
        {
            throw new TypeError(new.target.name + " must implement abstractAction(); Gen 1 cannot know what acting means.");
        }

        instanceCounter = instanceCounter + 1;
        this.#elementId = this.#buildElementId(new.target, instanceCounter);

        /**
         * Durable references to the DOM nodes this element created and owns.
         * Populated by buildElements() through defineElement(). Never rebuilt.
         * @type {Object<string, Element>}
         */
        this.elements = Object.create(null);
    }

    #buildElementId(constructorFunction, ordinal)
    {
        const rawName = constructorFunction.elementName || constructorFunction.name || "element";
        const slug = String(rawName).replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
        return slug + "-" + ordinal;
    }

    // -------------------------------------------------------------------------
    // Identity
    // -------------------------------------------------------------------------

    /**
     * Stable, unique, human-readable instance id. Assigned at construction and
     * never reassigned, so it is safe to use for aria wiring and for logging.
     * @returns {string}
     */
    get elementId()
    {
        return this.#elementId;
    }

    /**
     * True once buildElements() has run. Property setters use this to decide
     * whether to touch the DOM or only record state.
     * @returns {boolean}
     */
    get isBuilt()
    {
        return this.#built;
    }

    /**
     * How many times this element has been connected to a document. A value
     * greater than one means the element was moved or re-attached.
     * @returns {number}
     */
    get connectionCount()
    {
        return this.#connectionCount;
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Custom element lifecycle. Deliberately ordered and deliberately boring:
     *
     *     buildElements()  once, ever
     *     bindEvents()     on every connection
     *     syncElements()   on every connection
     *     onConnected()    on every connection
     *
     * Subclasses override the hooks, not this method.
     */
    connectedCallback()
    {
        this.#connectionCount = this.#connectionCount + 1;

        if (this.#built === false)
        {
            this.#built = true;

            if (this.id === "")
            {
                this.id = this.#elementId;
            }

            this.buildElements();
        }

        this.bindEvents();
        this.requestUpdate();
        this.onConnected();
        this.emit("tg-connected", { elementId: this.#elementId });
    }

    /**
     * Custom element lifecycle. Releases every managed listener, then hands
     * control to the subclass. Owned DOM is retained so that re-connection is
     * cheap and stable references stay valid.
     */
    disconnectedCallback()
    {
        this.releaseManagedListeners();
        this.onDisconnected();
        this.emit("tg-disconnected", { elementId: this.#elementId });
    }

    /**
     * Custom element lifecycle. Routes to the subclass hook and then requests a
     * single update. Subclasses override onAttributeChanged(), not this method.
     *
     * @param {string} name
     * @param {string|null} oldValue
     * @param {string|null} newValue
     */
    attributeChangedCallback(name, oldValue, newValue)
    {
        if (oldValue === newValue)
        {
            return;
        }

        this.onAttributeChanged(name, oldValue, newValue);
        this.requestUpdate();
    }

    // -------------------------------------------------------------------------
    // Template-method hooks. Subclasses override these; nothing else calls them.
    // -------------------------------------------------------------------------

    /**
     * Create the DOM this element owns, exactly once, and register each
     * important node with defineElement(). Never called twice.
     * @protected
     */
    buildElements()
    {
    }

    /**
     * Register managed listeners. Called on every connection, after the previous
     * connection's listeners were released.
     * @protected
     */
    bindEvents()
    {
    }

    /**
     * Reflect current state onto the already-built DOM. Must be idempotent and
     * must not create or replace owned structural nodes.
     * @protected
     */
    syncElements()
    {
    }

    /**
     * Called after connection is complete.
     * @protected
     */
    onConnected()
    {
    }

    /**
     * Called after listeners are released on disconnection.
     * @protected
     */
    onDisconnected()
    {
    }

    /**
     * Called for each observed attribute change, before the update.
     * @protected
     * @param {string} name
     * @param {string|null} oldValue
     * @param {string|null} newValue
     */
    onAttributeChanged(name, oldValue, newValue)
    {
    }

    // -------------------------------------------------------------------------
    // Owned DOM
    // -------------------------------------------------------------------------

    /**
     * Records a node this element created as a durable, named, owned reference.
     *
     * @param {string} name Stable key, for example "input" or "viewport".
     * @param {Element} node
     * @returns {Element} The same node, so callers can keep building.
     */
    defineElement(name, node)
    {
        if (typeof name !== "string" || name === "")
        {
            throw new TypeError("defineElement() requires a non-empty name.");
        }

        if (node === null || typeof node !== "object")
        {
            throw new TypeError("defineElement('" + name + "') requires an element.");
        }

        if (name in this.elements)
        {
            throw new Error("Owned element '" + name + "' is already defined on " + this.#elementId + ".");
        }

        this.elements[name] = node;
        return node;
    }

    /**
     * Returns a previously defined owned element.
     *
     * Throws rather than returning undefined: a missing owned node is always a
     * programming error, and failing at the point of the mistake is worth more
     * than a permissive lookup that fails three frames later.
     *
     * @param {string} name
     * @returns {Element}
     */
    getElement(name)
    {
        const node = this.elements[name];

        if (node === undefined)
        {
            throw new Error("Owned element '" + name + "' is not defined on " + this.#elementId + ".");
        }

        return node;
    }

    /**
     * @param {string} name
     * @returns {boolean}
     */
    hasElement(name)
    {
        return this.elements[name] !== undefined;
    }

    /**
     * Names of every owned element, in definition order.
     * @returns {string[]}
     */
    ownedElementNames()
    {
        return Object.keys(this.elements);
    }

    // -------------------------------------------------------------------------
    // Managed events
    // -------------------------------------------------------------------------

    /**
     * Adds an event listener that this element promises to remove.
     *
     * Handlers must be named methods with stable identity, normally bound once
     * in the constructor. Anonymous closures are a coding-standard violation
     * here because they cannot be removed and cannot be found in a stack trace.
     *
     * @param {EventTarget} target
     * @param {string} type
     * @param {Function} handler
     * @param {boolean|AddEventListenerOptions} [options]
     * @returns {object} A token accepted by removeManagedListener().
     */
    addManagedListener(target, type, handler, options)
    {
        if (target === null || typeof target.addEventListener !== "function")
        {
            throw new TypeError("addManagedListener() requires an event target.");
        }

        if (typeof handler !== "function")
        {
            throw new TypeError("addManagedListener() requires a function handler.");
        }

        const token = { target: target, type: type, handler: handler, options: options };
        target.addEventListener(type, handler, options);
        this.#listeners.push(token);
        return token;
    }

    /**
     * Removes a single managed listener.
     * @param {object} token Value returned by addManagedListener().
     * @returns {boolean} True if the token was registered and is now removed.
     */
    removeManagedListener(token)
    {
        const index = this.#listeners.indexOf(token);

        if (index < 0)
        {
            return false;
        }

        this.#listeners.splice(index, 1);
        token.target.removeEventListener(token.type, token.handler, token.options);
        return true;
    }

    /**
     * Removes every managed listener. Called automatically on disconnection.
     */
    releaseManagedListeners()
    {
        const tokens = this.#listeners;
        this.#listeners = [];

        for (let index = 0; index < tokens.length; index = index + 1)
        {
            const token = tokens[index];
            token.target.removeEventListener(token.type, token.handler, token.options);
        }
    }

    /**
     * Number of currently registered managed listeners. Tests assert that this
     * returns to zero after disconnection.
     * @returns {number}
     */
    get managedListenerCount()
    {
        return this.#listeners.length;
    }

    // -------------------------------------------------------------------------
    // Update seam
    // -------------------------------------------------------------------------

    /**
     * Synchronises the owned DOM with current state by calling syncElements().
     *
     * The update is synchronous on purpose. An asynchronous scheduler would make
     * Gen 1 a rendering framework, would hide the cause of a repaint from the
     * stack trace, and would force every test to await a microtask. Updates are
     * cheap because syncElements() mutates stable nodes instead of building new
     * ones.
     *
     * Calls before the first connection are ignored, because there is nothing
     * built to synchronise yet; connectedCallback() performs the first update.
     */
    requestUpdate()
    {
        if (this.#built === false || this.#updatesSuspended > 0)
        {
            return;
        }

        if (this.#updateDepth > 0)
        {
            return;
        }

        this.#updateDepth = this.#updateDepth + 1;

        try
        {
            this.syncElements();
        }
        finally
        {
            this.#updateDepth = this.#updateDepth - 1;
        }
    }

    /**
     * Applies a plain object of property values, then updates once.
     *
     * This is ordinary property assignment with the updates batched. It is not a
     * schema, not a validator and not a metadata system; an unknown key is a
     * programming error and is reported as one.
     *
     * @param {Object<string, *>} [options]
     * @returns {this}
     */
    configure(options)
    {
        if (options === null || options === undefined)
        {
            return this;
        }

        if (typeof options !== "object")
        {
            throw new TypeError("configure() requires a plain object.");
        }

        const keys = Object.keys(options);
        this.#updatesSuspended = this.#updatesSuspended + 1;

        try
        {
            for (let index = 0; index < keys.length; index = index + 1)
            {
                const key = keys[index];

                if (key in this === false)
                {
                    throw new TypeError(this.constructor.name + " has no property '" + key + "'.");
                }

                this[key] = options[key];
            }
        }
        finally
        {
            this.#updatesSuspended = this.#updatesSuspended - 1;
        }

        this.requestUpdate();
        return this;
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /**
     * Dispatches a bubbling CustomEvent. DOM events are the only public
     * notification mechanism in this codebase; there is no second event system.
     *
     * @param {string} type
     * @param {*} [detail]
     * @param {{cancelable?: boolean, bubbles?: boolean}} [options]
     * @returns {boolean} False if a cancelable event was prevented.
     */
    emit(type, detail, options)
    {
        const settings = options || {};
        const bubbles = settings.bubbles === undefined ? true : settings.bubbles;
        const cancelable = settings.cancelable === undefined ? false : settings.cancelable;

        const event = new CustomEvent(type,
        {
            detail: detail === undefined ? null : detail,
            bubbles: bubbles,
            cancelable: cancelable,
            composed: false
        });

        return this.dispatchEvent(event);
    }

    // -------------------------------------------------------------------------
    // The action seam
    // -------------------------------------------------------------------------

    /**
     * Performs this element's primary act and reports the result.
     *
     * This is the public, uniform entry point. Every primary user gesture in
     * Gen 2 routes through here, and so does every programmatic invocation, so
     * there is exactly one path into "the thing this control does".
     *
     * Gen 1 owns the protocol: result normalisation and the tg-action event.
     * Gen 2 owns the meaning, in abstractAction().
     *
     * @param {*} [payload] Optional context from the caller or the gesture.
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     * @fires tg-action
     */
    performAction(payload)
    {
        const raw = this.abstractAction(payload);
        const result = this.#normaliseActionResult(raw);

        this.emit("tg-action", result);
        return result;
    }

    #normaliseActionResult(raw)
    {
        const source = this.#elementId;

        if (raw === null || raw === undefined)
        {
            return { action: "none", handled: false, source: source, detail: null };
        }

        if (typeof raw !== "object")
        {
            return { action: String(raw), handled: true, source: source, detail: null };
        }

        return {
            action: raw.action === undefined ? "none" : String(raw.action),
            handled: raw.handled === undefined ? true : raw.handled === true,
            source: source,
            detail: raw.detail === undefined ? null : raw.detail
        };
    }

    /**
     * THE ABSTRACT ACTION.
     *
     * Gen 1 can state that an element acts. It cannot state what acting means,
     * because that is exactly the knowledge a concrete control adds. Every
     * concrete subclass must implement this method; the Gen-1 constructor
     * refuses to build an element that has not.
     *
     * An implementation performs the control's single primary act - the one
     * operation that, if the control could do only one thing, would be that
     * thing - and returns a descriptor:
     *
     *     { action: "commit", handled: true, detail: { value: "..." } }
     *
     * Implementations must not dispatch tg-action themselves; performAction()
     * owns that.
     *
     * @abstract
     * @param {*} [payload]
     * @returns {{action: string, handled?: boolean, detail?: *}|null}
     */
    abstractAction(payload)
    {
        throw new TypeError(this.constructor.name + " does not implement abstractAction().");
    }
}
