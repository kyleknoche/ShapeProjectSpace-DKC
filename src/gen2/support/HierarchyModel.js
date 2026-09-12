/**
 * GEN 2 SUPPORT - HierarchyModel
 * =============================================================================
 * The data side of a tree: indexing, parentage, expansion state and flattening.
 *
 * Two Gen-2 controls present hierarchies - TreeView and TreeListView - and they
 * are siblings rather than parent and child, because the Three-Gen pattern puts
 * every concrete control exactly one step below the abstract foundation. Sibling
 * controls cannot inherit each other's logic, so the logic they genuinely share
 * lives here, in a plain object that knows nothing about the DOM.
 *
 * The model holds no DOM, emits no events and renders nothing. A control asks it
 * what to display and announces the result itself, which keeps event ownership
 * with the control the caller is listening to.
 *
 * A node is plain data:
 *
 *     { id: "a", label: "A", expanded: true, children: [ ... ] }
 *
 * Any other fields are the caller's business and are passed through untouched.
 */
export class HierarchyModel
{
    #nodes = [];
    #index = new Map();
    #expandedIds = [];

    /**
     * Replaces the node data, keeping expansion state for ids that still exist.
     * @param {Array<object>} nodeList
     */
    setNodes(nodeList)
    {
        this.#nodes = Array.isArray(nodeList) ? nodeList.slice() : [];
        this.#index = new Map();
        this.#indexLevel(this.#nodes, "", 0);
        this.#pruneExpanded();
    }

    #indexLevel(nodes, parentId, depth)
    {
        if (Array.isArray(nodes) === false)
        {
            return;
        }

        for (let position = 0; position < nodes.length; position = position + 1)
        {
            const node = nodes[position];

            if (node === null || typeof node !== "object" || node.id === undefined)
            {
                continue;
            }

            const id = String(node.id);

            if (this.#index.has(id) === true)
            {
                throw new Error("HierarchyModel received a duplicate node id: " + id);
            }

            this.#index.set(id, { node: node, parentId: parentId, depth: depth });

            if (node.expanded === true && this.#expandedIds.indexOf(id) < 0)
            {
                this.#expandedIds.push(id);
            }

            this.#indexLevel(node.children, id, depth + 1);
        }
    }

    #pruneExpanded()
    {
        const surviving = [];

        for (let index = 0; index < this.#expandedIds.length; index = index + 1)
        {
            const id = this.#expandedIds[index];

            if (this.#index.has(id) === true)
            {
                surviving.push(id);
            }
        }

        this.#expandedIds = surviving;
    }

    /**
     * @returns {Array<object>} The root nodes.
     */
    get nodes()
    {
        return this.#nodes.slice();
    }

    /**
     * @param {string} id
     * @returns {boolean}
     */
    has(id)
    {
        return this.#index.has(String(id));
    }

    /**
     * @param {string} id
     * @returns {{node: object, parentId: string, depth: number}|null}
     */
    entryOf(id)
    {
        const entry = this.#index.get(String(id));
        return entry === undefined ? null : entry;
    }

    /**
     * @param {string} id
     * @returns {object|null}
     */
    nodeOf(id)
    {
        const entry = this.entryOf(id);
        return entry === null ? null : entry.node;
    }

    /**
     * @param {string} id
     * @returns {string} Empty string for a root node or an unknown id.
     */
    parentIdOf(id)
    {
        const entry = this.entryOf(id);
        return entry === null ? "" : entry.parentId;
    }

    /**
     * @param {string} id
     * @returns {number} -1 for an unknown id.
     */
    depthOf(id)
    {
        const entry = this.entryOf(id);
        return entry === null ? -1 : entry.depth;
    }

    /**
     * @param {string} id
     * @returns {boolean}
     */
    hasChildren(id)
    {
        const node = this.nodeOf(id);

        if (node === null)
        {
            return false;
        }

        return Array.isArray(node.children) === true && node.children.length > 0;
    }

    /**
     * @param {string} id
     * @returns {string[]} Ancestors from the immediate parent upwards.
     */
    ancestorIdsOf(id)
    {
        const ancestors = [];
        let parentId = this.parentIdOf(id);

        while (parentId !== "")
        {
            ancestors.push(parentId);
            parentId = this.parentIdOf(parentId);
        }

        return ancestors;
    }

    // -------------------------------------------------------------------------
    // Expansion
    // -------------------------------------------------------------------------

    get expandedIds()
    {
        return this.#expandedIds.slice();
    }

    set expandedIds(value)
    {
        this.#expandedIds = Array.isArray(value) ? value.map(String) : [];
        this.#pruneExpanded();
    }

    /**
     * @param {string} id
     * @returns {boolean}
     */
    isExpanded(id)
    {
        return this.#expandedIds.indexOf(String(id)) >= 0;
    }

    /**
     * @param {string} id
     * @returns {boolean} True when the state changed.
     */
    expand(id)
    {
        const key = String(id);

        if (this.#index.has(key) === false || this.isExpanded(key) === true)
        {
            return false;
        }

        this.#expandedIds.push(key);
        return true;
    }

    /**
     * @param {string} id
     * @returns {boolean} True when the state changed.
     */
    collapse(id)
    {
        const key = String(id);
        const position = this.#expandedIds.indexOf(key);

        if (position < 0)
        {
            return false;
        }

        this.#expandedIds.splice(position, 1);
        return true;
    }

    /**
     * Expands every branch.
     */
    expandAll()
    {
        const ids = [];
        const model = this;

        this.#index.forEach(function collectBranchId(entry, id)
        {
            if (model.hasChildren(id) === true)
            {
                ids.push(id);
            }
        });

        this.#expandedIds = ids;
    }

    /**
     * Collapses every branch.
     */
    collapseAll()
    {
        this.#expandedIds = [];
    }

    /**
     * Expands every ancestor of a node.
     * @param {string} id
     * @returns {boolean} True when the node exists.
     */
    reveal(id)
    {
        if (this.has(id) === false)
        {
            return false;
        }

        const ancestors = this.ancestorIdsOf(id);

        for (let index = 0; index < ancestors.length; index = index + 1)
        {
            this.expand(ancestors[index]);
        }

        return true;
    }

    // -------------------------------------------------------------------------
    // Flattening
    // -------------------------------------------------------------------------

    /**
     * The rows a control should currently display, in order.
     *
     * @returns {Array<{id: string, node: object, depth: number, parentId: string,
     *                  hasChildren: boolean, expanded: boolean}>}
     */
    visibleRows()
    {
        const rows = [];
        this.#collectVisibleRows(this.#nodes, "", 0, rows);
        return rows;
    }

    #collectVisibleRows(nodes, parentId, depth, rows)
    {
        if (Array.isArray(nodes) === false)
        {
            return;
        }

        for (let position = 0; position < nodes.length; position = position + 1)
        {
            const node = nodes[position];

            if (node === null || typeof node !== "object" || node.id === undefined)
            {
                continue;
            }

            const id = String(node.id);
            const children = Array.isArray(node.children) ? node.children : [];
            const hasChildren = children.length > 0;
            const expanded = hasChildren === true && this.isExpanded(id) === true;

            rows.push(
            {
                id: id,
                node: node,
                depth: depth,
                parentId: parentId,
                hasChildren: hasChildren,
                expanded: expanded
            });

            if (expanded === true)
            {
                this.#collectVisibleRows(children, id, depth + 1, rows);
            }
        }
    }

    /**
     * @returns {string[]} Ids of the currently visible rows, in order.
     */
    visibleIds()
    {
        const rows = this.visibleRows();
        const ids = [];

        for (let index = 0; index < rows.length; index = index + 1)
        {
            ids.push(rows[index].id);
        }

        return ids;
    }
}
