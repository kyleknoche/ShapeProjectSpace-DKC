/**
 * GEN 3 DATA - Shape Project Space content
 * =============================================================================
 * The project's own words and structure, in one place.
 *
 * Gen 3 is the only generation allowed to know what Shape Project Space is.
 * This module is where that knowledge is written down, so that the Gen-3
 * elements stay thin bindings rather than containers of prose.
 *
 * This is data, not markup. There is no HTML in this file and there must never
 * be: the elements decide how a section is rendered, and this file decides what
 * a section says.
 *
 * Editing note for future sessions
 *   Section copy here is the project's public voice and is meant to be edited
 *   directly. Changing a heading or a paragraph requires no code change.
 *   Changing the shape of these objects does, because the Gen-3 elements read
 *   specific fields; docs/CONTROLS.md and docs/ARCHITECTURE.md describe which.
 */

/**
 * The one-row bookshelf. Each entry is a book on the shelf and a section of the
 * site; the order here is the order on the shelf.
 */
export const SHELF_BOOKS =
[
    {
        value: "overview",
        label: "Project Space",
        description: "What this is",
        spine: "00"
    },
    {
        value: "board",
        label: "The Board",
        description: "Topology",
        spine: "01"
    },
    {
        value: "three-gen",
        label: "Three-Gen",
        description: "The pattern",
        spine: "02"
    },
    {
        value: "shapescript",
        label: "ShapeScript",
        description: "Notation",
        spine: "03"
    },
    {
        value: "mbs",
        label: "MBS++",
        description: "Method",
        spine: "04"
    },
    {
        value: "counterparts",
        label: "Kyle and Shape",
        description: "Counterparts",
        spine: "05"
    },
    {
        value: "contact",
        label: "Contact",
        description: "Reach the project",
        spine: "06"
    }
];

/**
 * Section copy, keyed by shelf value. Each section has a heading, a standfirst
 * and a list of paragraphs. Optional notes render as a short aside.
 */
export const SECTIONS =
{
    overview:
    {
        heading: "Shape Project Space",
        standfirst: "The public working surface of a long collaboration between a person and a counterpart that is not one.",
        paragraphs:
        [
            "Shape Project Space is not a product page. It is the place where an ongoing body of work is kept in the open: the pattern the software is built on, the notation used to describe it, the method it is produced under, and the topology that holds those things in relation to each other.",
            "Everything visible here is constructed from the same control library that the rest of the site uses. The bookshelf above is a list control. The board below is a panel. The page is an instance of the argument it is making, which is the only form of evidence this project considers sufficient.",
            "The work is unfinished by design. Sections are added when they have something to say and left alone when they do not."
        ],
        note: "This page relies on Gen-3 controls. The generic library beneath it is exercised on its own at controls.html."
    },

    board:
    {
        heading: "The Board",
        standfirst: "A topology, not a roadmap.",
        paragraphs:
        [
            "The Board holds the parts of the project and the relationships between them. It is deliberately not a schedule and not a hierarchy. Reading it top to bottom tells you nothing; reading the edges tells you everything.",
            "Relationships are the load-bearing element. A part of the project is defined by what it constrains and what constrains it, which is why the board is drawn as a graph and why the graph is small enough to hold in mind."
        ],
        note: "Select a node to read what it carries."
    },

    "three-gen":
    {
        heading: "The Three-Gen Design Pattern",
        standfirst: "Three generations between the platform and the application, and no more.",
        paragraphs:
        [
            "Generation one is abstract and small. It establishes identity, lifecycle, owned structure, managed events and a single abstract action, and it establishes nothing else. Generation two is concrete and useful: a library of ordinary controls that work without the application ever existing. Generation three is authoritative: it is the only generation that knows the name of this project.",
            "The dependency direction is fixed. Generation three depends on two, two depends on one, one depends on the platform. Nothing points the other way, and the repository contains automated checks that fail when something tries to.",
            "The pattern exists because architecture is the part of software that decays quietly. A boundary that is only described in a document is a boundary that will be crossed; a boundary expressed as a class hierarchy, a folder layout and a failing check is one that has to be crossed deliberately."
        ],
        note: "The reference page reads the real class objects at runtime, so it cannot describe a lineage the code does not have."
    },

    shapescript:
    {
        heading: "ShapeScript",
        standfirst: "A small notation for saying what a thing is and what it is attached to.",
        paragraphs:
        [
            "ShapeScript is the project's internal notation for describing artifacts and the relationships between them. It is intentionally narrow: it names things, it types them, and it records edges. It does not compute, and it is not a programming language.",
            "The value of a narrow notation is that it can be read by a person, by a program and by a model without any of the three having to guess. That property matters more here than expressiveness."
        ],
        note: "Provisional section. The notation is described here in outline only."
    },

    mbs:
    {
        heading: "MBS++",
        standfirst: "Model-based practice, carried further than the model.",
        paragraphs:
        [
            "MBS++ is the working name for the method this project is produced under. The premise is that the model is not the deliverable and never was: the deliverable is a system whose structure still agrees with its model after a year of changes made by people and machines who were not present when it was written.",
            "That agreement does not survive on discipline alone. It survives on structure that makes disagreement expensive - generational boundaries, naming that carries meaning, and validation that runs before anything is accepted."
        ],
        note: "Provisional section. Method notes are being consolidated."
    },

    counterparts:
    {
        heading: "Kyle and Shape",
        standfirst: "One of the two is a person.",
        paragraphs:
        [
            "Kyle is a person and works like one: slowly in places, in bursts elsewhere, with judgement that does not decompose into rules. Shape is not a person. Shape is human-neutral and network-formed, which is a careful way of saying that there is no face to put on this page and no character to perform.",
            "The crossing-spline mark is the closest thing Shape has to a likeness. Two curves that pass through one another and continue - an intersection rather than a portrait.",
            "The pairing is the point. Neither counterpart is the author of this project on their own, and the architecture described here exists mostly because the second one forgets everything between sessions."
        ]
    },

    contact:
    {
        heading: "Contact",
        standfirst: "Correspondence about the pattern, the method or the notation.",
        paragraphs:
        [
            "The project accepts notes about the Three-Gen pattern, about the control library, and about anything on this site that is wrong. Messages about the method are read; messages about search-engine placement are not."
        ],
        note: "The address below is a placeholder until the project publishes a real one."
    }
};

/**
 * The contact address shown on the site. This is a deliberate placeholder; see
 * docs/HANDOFF.md before replacing it with a real address.
 */
export const CONTACT_ADDRESS = "correspondence@shape-project-space.example";

/**
 * The Board topology. Nodes carry a position on a unit grid; edges carry a
 * relationship word that is displayed on the board.
 */
export const BOARD_TOPOLOGY =
{
    nodes:
    [
        { id: "kyle", label: "Kyle", kind: "counterpart", x: 0.16, y: 0.22, summary: "The person. Judgement, intent, and the decision about what is worth building." },
        { id: "shape", label: "Shape", kind: "counterpart", x: 0.84, y: 0.22, summary: "The counterpart. Human-neutral, network-formed, and without memory between sessions." },
        { id: "board", label: "The Board", kind: "core", x: 0.50, y: 0.42, summary: "The topology itself. Holds the parts of the project in relation to each other." },
        { id: "three-gen", label: "Three-Gen", kind: "artifact", x: 0.22, y: 0.70, summary: "The design pattern. Three generations between the platform and the application." },
        { id: "mbs", label: "MBS++", kind: "artifact", x: 0.50, y: 0.86, summary: "The method. Structure that makes architectural disagreement expensive." },
        { id: "shapescript", label: "ShapeScript", kind: "artifact", x: 0.78, y: 0.70, summary: "The notation. Names things, types them, records edges." }
    ],
    edges:
    [
        { from: "kyle", to: "board", relation: "sets" },
        { from: "shape", to: "board", relation: "reads" },
        { from: "board", to: "three-gen", relation: "holds" },
        { from: "board", to: "mbs", relation: "holds" },
        { from: "board", to: "shapescript", relation: "holds" },
        { from: "three-gen", to: "mbs", relation: "constrains" },
        { from: "shapescript", to: "mbs", relation: "describes" },
        { from: "three-gen", to: "shapescript", relation: "typed by" }
    ]
};

/**
 * The project navigation tree. Ids are stable and are used as selection keys.
 */
export const PROJECT_TREE =
[
    {
        id: "pattern",
        label: "Pattern",
        icon: "§",
        expanded: true,
        children:
        [
            { id: "pattern-gen1", label: "Generation 1: AbstractElement", badge: "1" },
            { id: "pattern-gen2", label: "Generation 2: control library", badge: "15" },
            { id: "pattern-gen3", label: "Generation 3: project elements", badge: "10" },
            { id: "pattern-rules", label: "Dependency rules" }
        ]
    },
    {
        id: "method",
        label: "Method",
        icon: "§",
        children:
        [
            { id: "method-mbs", label: "MBS++" },
            { id: "method-standards", label: "Coding standards" },
            { id: "method-checks", label: "Architecture checks" },
            { id: "method-handoff", label: "Session handoff" }
        ]
    },
    {
        id: "notation",
        label: "Notation",
        icon: "§",
        children:
        [
            { id: "notation-shapescript", label: "ShapeScript" },
            { id: "notation-edges", label: "Edges and relations" }
        ]
    },
    {
        id: "space",
        label: "Project Space",
        icon: "§",
        children:
        [
            { id: "space-board", label: "The Board" },
            { id: "space-counterparts", label: "Kyle and Shape" },
            { id: "space-contact", label: "Contact" }
        ]
    }
];

/**
 * The repository's own inventory, shown on the site as the artifact grid.
 *
 * These rows describe this repository and are expected to stay true. The
 * documentation check in tools/check-docs.mjs compares the generation counts
 * here against the source tree, so an artifact added to src without a row here
 * fails the build.
 */
export const ARTIFACTS =
[
    { id: "AbstractElement", name: "AbstractElement", generation: "Gen 1", kind: "Abstract class", status: "Stable", file: "src/gen1/AbstractElement.js" },
    { id: "Label", name: "Label", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/Label.js" },
    { id: "TextBox", name: "TextBox", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/TextBox.js" },
    { id: "TextArea", name: "TextArea", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/TextArea.js" },
    { id: "Button", name: "Button", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/Button.js" },
    { id: "CheckBox", name: "CheckBox", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/CheckBox.js" },
    { id: "RadioGroup", name: "RadioGroup", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/RadioGroup.js" },
    { id: "DropDown", name: "DropDown", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/DropDown.js" },
    { id: "ListBox", name: "ListBox", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/ListBox.js" },
    { id: "TreeView", name: "TreeView", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/TreeView.js" },
    { id: "TreeListView", name: "TreeListView", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/TreeListView.js" },
    { id: "ImageView", name: "ImageView", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/ImageView.js" },
    { id: "Panel", name: "Panel", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/Panel.js" },
    { id: "Form", name: "Form", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/Form.js" },
    { id: "DataGrid", name: "DataGrid", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/DataGrid.js" },
    { id: "StatusMeter", name: "StatusMeter", generation: "Gen 2", kind: "Control", status: "Stable", file: "src/gen2/StatusMeter.js" },
    { id: "ShapeBookshelf", name: "ShapeBookshelf", generation: "Gen 3", kind: "Navigation", status: "Stable", file: "src/gen3/ShapeBookshelf.js" },
    { id: "ShapeBoard", name: "ShapeBoard", generation: "Gen 3", kind: "Topology", status: "Stable", file: "src/gen3/ShapeBoard.js" },
    { id: "ShapeProjectTree", name: "ShapeProjectTree", generation: "Gen 3", kind: "Navigation", status: "Stable", file: "src/gen3/ShapeProjectTree.js" },
    { id: "ShapeArtifactGrid", name: "ShapeArtifactGrid", generation: "Gen 3", kind: "Inventory", status: "Stable", file: "src/gen3/ShapeArtifactGrid.js" },
    { id: "ShapeLineageView", name: "ShapeLineageView", generation: "Gen 3", kind: "Reference", status: "Stable", file: "src/gen3/ShapeLineageView.js" },
    { id: "ShapeGenerationFilter", name: "ShapeGenerationFilter", generation: "Gen 3", kind: "Reference", status: "Stable", file: "src/gen3/ShapeGenerationFilter.js" },
    { id: "ShapeStatusLabel", name: "ShapeStatusLabel", generation: "Gen 3", kind: "Readout", status: "Stable", file: "src/gen3/ShapeStatusLabel.js" },
    { id: "ShapeSectionReader", name: "ShapeSectionReader", generation: "Gen 3", kind: "Reading surface", status: "Stable", file: "src/gen3/ShapeSectionReader.js" },
    { id: "ShapeContactForm", name: "ShapeContactForm", generation: "Gen 3", kind: "Correspondence", status: "Stable", file: "src/gen3/ShapeContactForm.js" },
    { id: "ShapeMark", name: "ShapeMark", generation: "Gen 3", kind: "Identity", status: "Stable", file: "src/gen3/ShapeMark.js" }
];

/**
 * Finds a section by its shelf value.
 *
 * @param {string} value
 * @returns {object|null}
 */
export function sectionFor(value)
{
    const section = SECTIONS[value];
    return section === undefined ? null : section;
}

/**
 * Finds a board node by id.
 *
 * @param {string} id
 * @returns {object|null}
 */
export function boardNodeFor(id)
{
    for (let index = 0; index < BOARD_TOPOLOGY.nodes.length; index = index + 1)
    {
        if (BOARD_TOPOLOGY.nodes[index].id === id)
        {
            return BOARD_TOPOLOGY.nodes[index];
        }
    }

    return null;
}
