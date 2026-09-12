/**
 * GEN 2 SUPPORT - ChildReconciler
 * =============================================================================
 * Keeps a data-driven list of child nodes in sync with an array of items while
 * preserving the identity of every node whose key survives the update.
 *
 * This exists because of a specific coding standard in this repository: a
 * control updates stable objects, it does not regenerate its DOM. The naive
 * implementation of a list control clears its container and rebuilds every row
 * on every change, which destroys focus, scroll position, transitions, selection
 * state held on the node, and any reference another object was holding.
 *
 * The reconciler is intentionally simple. It is keyed, it reuses nodes, it moves
 * nodes into order with insertBefore, and it removes nodes whose keys are gone.
 * It does not diff attributes, does not own state and does not render anything
 * itself; the caller supplies create and update behaviour.
 *
 * Usage:
 *
 *     this.rowReconciler = new ChildReconciler(this.getElement("list"),
 *     {
 *         keyOf: this.rowKeyOf,
 *         create: this.createRowNode,
 *         update: this.updateRowNode
 *     });
 *
 *     this.rowReconciler.reconcile(items);
 *
 * The three callbacks must be named, stably bound methods of the owning control,
 * never inline closures. Ownership of the callbacks is therefore always obvious:
 * they belong to the control that constructed the reconciler.
 */
export class ChildReconciler
{
    /**
     * @param {Element} container Node whose children are managed.
     * @param {{keyOf: Function, create: Function, update: Function}} factory
     */
    constructor(container, factory)
    {
        if (container === null || typeof container !== "object")
        {
            throw new TypeError("ChildReconciler requires a container element.");
        }

        if (factory === null || typeof factory !== "object")
        {
            throw new TypeError("ChildReconciler requires a factory.");
        }

        if (typeof factory.keyOf !== "function" || typeof factory.create !== "function" || typeof factory.update !== "function")
        {
            throw new TypeError("ChildReconciler factory requires keyOf, create and update functions.");
        }

        this.container = container;
        this.factory = factory;
        this.nodesByKey = new Map();
        this.orderedKeys = [];
    }

    /**
     * Brings the container's children into agreement with the items array.
     *
     * @param {Array<*>} items
     * @returns {Element[]} The ordered child nodes after reconciliation.
     */
    reconcile(items)
    {
        const list = Array.isArray(items) ? items : [];
        const seenKeys = new Set();
        const orderedNodes = [];
        const orderedKeys = [];

        for (let index = 0; index < list.length; index = index + 1)
        {
            const item = list[index];
            const key = String(this.factory.keyOf(item, index));

            if (seenKeys.has(key) === true)
            {
                throw new Error("ChildReconciler received a duplicate key: " + key);
            }

            seenKeys.add(key);

            let node = this.nodesByKey.get(key);

            if (node === undefined)
            {
                node = this.factory.create(item, key, index);
                this.nodesByKey.set(key, node);
            }

            this.factory.update(node, item, index, key);
            orderedNodes.push(node);
            orderedKeys.push(key);
        }

        this.#removeStaleNodes(seenKeys);
        this.#applyOrder(orderedNodes);
        this.orderedKeys = orderedKeys;

        return orderedNodes;
    }

    #removeStaleNodes(seenKeys)
    {
        const staleKeys = [];

        this.nodesByKey.forEach(function collectStaleKey(node, key)
        {
            if (seenKeys.has(key) === false)
            {
                staleKeys.push(key);
            }
        });

        for (let index = 0; index < staleKeys.length; index = index + 1)
        {
            const key = staleKeys[index];
            const node = this.nodesByKey.get(key);

            if (node.parentNode !== null)
            {
                node.parentNode.removeChild(node);
            }

            this.nodesByKey.delete(key);
        }
    }

    #applyOrder(orderedNodes)
    {
        let cursor = this.container.firstChild;

        for (let index = 0; index < orderedNodes.length; index = index + 1)
        {
            const node = orderedNodes[index];

            if (cursor === node)
            {
                cursor = node.nextSibling;
                continue;
            }

            this.container.insertBefore(node, cursor);
        }
    }

    /**
     * @param {string} key
     * @returns {Element|undefined}
     */
    nodeForKey(key)
    {
        return this.nodesByKey.get(String(key));
    }

    /**
     * @returns {string[]} Keys in current display order.
     */
    keys()
    {
        return this.orderedKeys.slice();
    }

    /**
     * @returns {number}
     */
    get size()
    {
        return this.nodesByKey.size;
    }

    /**
     * Removes every managed node and forgets every key.
     */
    clear()
    {
        this.nodesByKey.forEach(function detachNode(node)
        {
            if (node.parentNode !== null)
            {
                node.parentNode.removeChild(node);
            }
        });

        this.nodesByKey.clear();
        this.orderedKeys = [];
    }
}
