import { Panel } from "../gen2/Panel.js";
import { ChildReconciler } from "../gen2/support/ChildReconciler.js";
import { createSvgElement, setText, setClass, attachParts, partsOf, toText } from "../gen2/support/dom.js";
import { BOARD_TOPOLOGY } from "./data/projectSpace.js";

/**
 * GEN 3 - ShapeBoard
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> Panel -> ShapeBoard
 *
 * The Board: the project's topology, drawn as a graph inside a panel.
 *
 * The frame, the heading, the collapse behaviour and the body container all
 * come from Panel and are not re-implemented here. What this class adds is the
 * one thing Gen 2 is forbidden to know: the graph itself. Graph logic is
 * application knowledge, so it lives at Gen 3, and it lives in exactly one
 * place.
 *
 * The drawing is SVG built node by node with createElementNS. There is no
 * markup string anywhere in this file, and the node and edge elements are
 * reconciled by id, so selecting a node mutates attributes on nodes that
 * already exist rather than redrawing the board.
 *
 * Properties
 *   topology        {{nodes: Array, edges: Array}} Defaults to the project's.
 *   selectedNodeId  {string}
 *   selectedNode    {object|null} Read-only.
 *
 * Methods
 *   selectNode(id)      Selects a node and announces it.
 *   nodeFor(id)         Looks up a node.
 *   clearSelection()
 *
 * Events
 *   shape-board-select   detail { id, node, previousId }
 *   plus every event Panel emits.
 *
 * Abstract action
 *   Panel's action is "toggle" and it still is. When the payload names a node,
 *   the board performs its own act instead and reports "select-node". One seam,
 *   two meanings, chosen by what the caller asked for.
 */
export class ShapeBoard extends Panel
{
    static elementName = "shape-board";

    #topology = BOARD_TOPOLOGY;
    #selectedNodeId = "";
    #nodeReconciler = null;
    #edgeReconciler = null;

    constructor()
    {
        super();
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.handleCanvasKeyDown = this.handleCanvasKeyDown.bind(this);

        this.edgeKeyOf = this.edgeKeyOf.bind(this);
        this.createEdge = this.createEdge.bind(this);
        this.updateEdge = this.updateEdge.bind(this);

        this.nodeKeyOf = this.nodeKeyOf.bind(this);
        this.createNode = this.createNode.bind(this);
        this.updateNode = this.updateNode.bind(this);
    }

    buildElements()
    {
        super.buildElements();
        this.classList.add("shape-board");

        const canvas = createSvgElement("svg", "shape-board__canvas");
        canvas.setAttribute("viewBox", "0 0 100 60");
        canvas.setAttribute("preserveAspectRatio", "xMidYMid meet");
        canvas.setAttribute("role", "group");
        canvas.setAttribute("aria-label", "Project topology");

        const edgeLayer = createSvgElement("g", "shape-board__edges");
        const nodeLayer = createSvgElement("g", "shape-board__nodes");
        canvas.append(edgeLayer, nodeLayer);

        const readout = document.createElement("p");
        readout.className = "shape-board__readout";
        readout.setAttribute("role", "status");

        this.defineElement("canvas", canvas);
        this.defineElement("edgeLayer", edgeLayer);
        this.defineElement("nodeLayer", nodeLayer);
        this.defineElement("readout", readout);

        const body = this.getElement("body");
        body.append(canvas, readout);

        this.#edgeReconciler = new ChildReconciler(edgeLayer,
        {
            keyOf: this.edgeKeyOf,
            create: this.createEdge,
            update: this.updateEdge
        });

        this.#nodeReconciler = new ChildReconciler(nodeLayer,
        {
            keyOf: this.nodeKeyOf,
            create: this.createNode,
            update: this.updateNode
        });
    }

    bindEvents()
    {
        super.bindEvents();
        const canvas = this.getElement("canvas");
        this.addManagedListener(canvas, "click", this.handleCanvasClick);
        this.addManagedListener(canvas, "keydown", this.handleCanvasKeyDown);
    }

    syncElements()
    {
        super.syncElements();

        if (this.hasElement("canvas") === false)
        {
            return;
        }

        this.#edgeReconciler.reconcile(this.#topology.edges);
        this.#nodeReconciler.reconcile(this.#topology.nodes);

        const readout = this.getElement("readout");
        const selected = this.selectedNode;

        if (selected === null)
        {
            setText(readout, "Select a node to read what it carries.");
            setClass(readout, "shape-board__readout--selected", false);
            return;
        }

        setText(readout, selected.label + " - " + toText(selected.summary));
        setClass(readout, "shape-board__readout--selected", true);
    }

    // -------------------------------------------------------------------------
    // Edges
    // -------------------------------------------------------------------------

    edgeKeyOf(edge)
    {
        return edge.from + ">" + edge.to;
    }

    createEdge(edge, key)
    {
        const group = createSvgElement("g", "shape-board__edge");
        group.dataset.key = key;

        const line = createSvgElement("line", "shape-board__edge-line");
        const caption = createSvgElement("text", "shape-board__edge-label");
        caption.setAttribute("text-anchor", "middle");

        group.append(line, caption);
        attachParts(group, { line: line, caption: caption });
        return group;
    }

    updateEdge(group, edge)
    {
        const parts = partsOf(group);
        const from = this.nodeFor(edge.from);
        const to = this.nodeFor(edge.to);

        if (from === null || to === null)
        {
            return;
        }

        const fromPoint = this.#pointFor(from);
        const toPoint = this.#pointFor(to);

        parts.line.setAttribute("x1", String(fromPoint.x));
        parts.line.setAttribute("y1", String(fromPoint.y));
        parts.line.setAttribute("x2", String(toPoint.x));
        parts.line.setAttribute("y2", String(toPoint.y));

        parts.caption.setAttribute("x", String((fromPoint.x + toPoint.x) / 2));
        parts.caption.setAttribute("y", String((fromPoint.y + toPoint.y) / 2 - 1.2));
        parts.caption.textContent = toText(edge.relation);

        const touchesSelection = edge.from === this.#selectedNodeId || edge.to === this.#selectedNodeId;
        setClass(group, "shape-board__edge--active", touchesSelection);
    }

    #pointFor(node)
    {
        return { x: node.x * 100, y: node.y * 60 };
    }

    // -------------------------------------------------------------------------
    // Nodes
    // -------------------------------------------------------------------------

    nodeKeyOf(node)
    {
        return node.id;
    }

    createNode(node, key)
    {
        const group = createSvgElement("g", "shape-board__node");
        group.dataset.key = key;
        group.setAttribute("tabindex", "0");
        group.setAttribute("role", "button");

        const plate = createSvgElement("rect", "shape-board__node-plate");
        plate.setAttribute("rx", "1.2");

        const caption = createSvgElement("text", "shape-board__node-label");
        caption.setAttribute("text-anchor", "middle");
        caption.setAttribute("dominant-baseline", "middle");

        group.append(plate, caption);
        attachParts(group, { plate: plate, caption: caption });
        return group;
    }

    updateNode(group, node)
    {
        const parts = partsOf(group);
        const point = this.#pointFor(node);
        const width = 20;
        const height = 7;

        parts.plate.setAttribute("x", String(point.x - width / 2));
        parts.plate.setAttribute("y", String(point.y - height / 2));
        parts.plate.setAttribute("width", String(width));
        parts.plate.setAttribute("height", String(height));

        parts.caption.setAttribute("x", String(point.x));
        parts.caption.setAttribute("y", String(point.y));
        parts.caption.textContent = node.label;

        group.setAttribute("aria-label", node.label + ". " + toText(node.summary));
        group.setAttribute("aria-pressed", node.id === this.#selectedNodeId ? "true" : "false");
        group.dataset.kind = toText(node.kind);

        setClass(group, "shape-board__node--selected", node.id === this.#selectedNodeId);
    }

    // -------------------------------------------------------------------------
    // Properties
    // -------------------------------------------------------------------------

    get topology()
    {
        return this.#topology;
    }

    set topology(value)
    {
        const next = value === null || value === undefined ? { nodes: [], edges: [] } : value;
        this.#topology =
        {
            nodes: Array.isArray(next.nodes) ? next.nodes.slice() : [],
            edges: Array.isArray(next.edges) ? next.edges.slice() : []
        };

        if (this.nodeFor(this.#selectedNodeId) === null)
        {
            this.#selectedNodeId = "";
        }

        this.requestUpdate();
    }

    get selectedNodeId()
    {
        return this.#selectedNodeId;
    }

    set selectedNodeId(value)
    {
        this.#selectedNodeId = toText(value);
        this.requestUpdate();
    }

    get selectedNode()
    {
        return this.nodeFor(this.#selectedNodeId);
    }

    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------

    /**
     * @param {string} id
     * @returns {object|null}
     */
    nodeFor(id)
    {
        const wanted = toText(id);

        for (let index = 0; index < this.#topology.nodes.length; index = index + 1)
        {
            if (this.#topology.nodes[index].id === wanted)
            {
                return this.#topology.nodes[index];
            }
        }

        return null;
    }

    /**
     * Selects a node and announces it.
     * @param {string} id
     * @returns {{action: string, handled: boolean, source: string, detail: *}}
     */
    selectNode(id)
    {
        return this.performAction({ source: "api", nodeId: toText(id) });
    }

    clearSelection()
    {
        const previousId = this.#selectedNodeId;
        this.#selectedNodeId = "";
        this.requestUpdate();

        if (previousId !== "")
        {
            this.emit("shape-board-select", { id: "", node: null, previousId: previousId });
        }
    }

    /**
     * Edges that touch a node.
     * @param {string} id
     * @returns {Array<object>}
     */
    edgesFor(id)
    {
        const wanted = toText(id);
        const edges = [];

        for (let index = 0; index < this.#topology.edges.length; index = index + 1)
        {
            const edge = this.#topology.edges[index];

            if (edge.from === wanted || edge.to === wanted)
            {
                edges.push(edge);
            }
        }

        return edges;
    }

    // -------------------------------------------------------------------------
    // Gestures
    // -------------------------------------------------------------------------

    handleCanvasClick(event)
    {
        const id = this.#nodeIdFromEvent(event);

        if (id === null)
        {
            return;
        }

        this.performAction({ source: "pointer", nodeId: id });
    }

    handleCanvasKeyDown(event)
    {
        if (event.key !== "Enter" && event.key !== " ")
        {
            return;
        }

        const id = this.#nodeIdFromEvent(event);

        if (id === null)
        {
            return;
        }

        event.preventDefault();
        this.performAction({ source: "keyboard", nodeId: id });
    }

    #nodeIdFromEvent(event)
    {
        const target = event.target;

        if (target === null || typeof target.closest !== "function")
        {
            return null;
        }

        const group = target.closest(".shape-board__node");

        if (group === null || group.dataset === undefined)
        {
            return null;
        }

        const key = group.dataset.key;
        return key === undefined ? null : key;
    }

    // -------------------------------------------------------------------------
    // Abstract action
    // -------------------------------------------------------------------------

    abstractAction(payload)
    {
        const wantsNode = payload !== null && payload !== undefined && payload.nodeId !== undefined;

        if (wantsNode === false)
        {
            return super.abstractAction(payload);
        }

        const id = toText(payload.nodeId);
        const node = this.nodeFor(id);

        if (node === null)
        {
            return { action: "select-node", handled: false, detail: { id: id, node: null } };
        }

        const previousId = this.#selectedNodeId;
        this.#selectedNodeId = id;
        this.requestUpdate();

        if (previousId !== id)
        {
            this.emit("shape-board-select", { id: id, node: node, previousId: previousId });
        }

        return {
            action: "select-node",
            handled: true,
            detail: { id: id, node: node, previousId: previousId, edges: this.edgesFor(id) }
        };
    }
}
