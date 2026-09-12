import { AbstractElement } from "../../gen1/AbstractElement.js";

/**
 * GEN 3 DATA - lineage
 * =============================================================================
 * Reads the real class objects and reports what they actually inherit from.
 *
 * The reference page describes the Three-Gen pattern using this repository's own
 * classes. A hand-written diagram would drift the first time somebody changed a
 * base class, and the page would go on asserting something false. So nothing on
 * that page is written down twice: the lineages are walked from the live
 * prototype chain at load time, and the generation of a class is computed from
 * its distance to AbstractElement rather than from its folder.
 *
 * This module is Gen 3 because inspecting the architecture is an application
 * concern of this particular site. Gen 1 must never grow an architecture
 * inspection facility, and Gen 2 must never know that generations exist.
 */

/**
 * Generation labels, indexed by distance from AbstractElement.
 */
const GENERATION_LABELS = ["Gen 1", "Gen 2", "Gen 3", "Gen 4"];

/**
 * The chain of class names from the platform down to a class.
 *
 * @param {Function} constructorFunction
 * @returns {string[]} For example [ "HTMLElement", "AbstractElement", "TreeView", "ShapeProjectTree" ].
 */
export function classLineage(constructorFunction)
{
    const names = [];
    let current = constructorFunction;

    while (typeof current === "function" && current.name !== "")
    {
        names.unshift(current.name);

        if (current.name === "HTMLElement")
        {
            break;
        }

        current = Object.getPrototypeOf(current);
    }

    return names;
}

/**
 * The immediate base class of a class.
 *
 * @param {Function} constructorFunction
 * @returns {Function|null}
 */
export function baseClassOf(constructorFunction)
{
    const base = Object.getPrototypeOf(constructorFunction);
    return typeof base === "function" && base.name !== "" ? base : null;
}

/**
 * How many inheritance steps separate a class from AbstractElement.
 *
 * @param {Function} constructorFunction
 * @returns {number} 0 for AbstractElement itself, -1 when unrelated.
 */
export function distanceFromFoundation(constructorFunction)
{
    let current = constructorFunction;
    let distance = 0;

    while (typeof current === "function")
    {
        if (current === AbstractElement)
        {
            return distance;
        }

        current = Object.getPrototypeOf(current);
        distance = distance + 1;
    }

    return -1;
}

/**
 * The generation a class actually belongs to, computed rather than declared.
 *
 * @param {Function} constructorFunction
 * @returns {string} "Gen 1" | "Gen 2" | "Gen 3" | "Platform" | "Outside"
 */
export function generationLabelOf(constructorFunction)
{
    if (constructorFunction === AbstractElement)
    {
        return GENERATION_LABELS[0];
    }

    const distance = distanceFromFoundation(constructorFunction);

    if (distance < 0)
    {
        return "Outside";
    }

    const label = GENERATION_LABELS[distance];
    return label === undefined ? "Gen " + String(distance + 1) : label;
}

/**
 * Checks that every application element sits exactly one step below a control
 * from the generic library.
 *
 * @param {Function[]} gen3Classes
 * @param {Function[]} gen2Classes
 * @returns {Array<{name: string, problem: string}>} Empty when the architecture holds.
 */
export function findLineageViolations(gen3Classes, gen2Classes)
{
    const violations = [];

    for (let index = 0; index < gen3Classes.length; index = index + 1)
    {
        const elementClass = gen3Classes[index];
        const base = baseClassOf(elementClass);

        if (base === null)
        {
            violations.push({ name: elementClass.name, problem: "has no base class" });
            continue;
        }

        if (gen2Classes.indexOf(base) < 0)
        {
            violations.push({ name: elementClass.name, problem: "extends " + base.name + ", which is not a Gen-2 control" });
            continue;
        }

        if (distanceFromFoundation(elementClass) !== 2)
        {
            violations.push({ name: elementClass.name, problem: "sits " + String(distanceFromFoundation(elementClass)) + " steps below AbstractElement" });
        }
    }

    return violations;
}

/**
 * Builds the hierarchy the reference page displays: the platform at the root,
 * the abstract foundation beneath it, every generic control beneath that, and
 * each application element under the control it specialises.
 *
 * @param {{gen2: Function[], gen3: Function[], actionVerbs?: Object<string, string>}} input
 * @returns {Array<object>} Nodes shaped for TreeListView.
 */
export function buildLineageTree(input)
{
    const gen2Classes = input.gen2;
    const gen3Classes = input.gen3;
    const actionVerbs = input.actionVerbs === undefined ? {} : input.actionVerbs;

    const controlNodes = [];

    for (let index = 0; index < gen2Classes.length; index = index + 1)
    {
        const controlClass = gen2Classes[index];
        const children = [];

        for (let position = 0; position < gen3Classes.length; position = position + 1)
        {
            const elementClass = gen3Classes[position];

            if (baseClassOf(elementClass) !== controlClass)
            {
                continue;
            }

            children.push(describeClass(elementClass, actionVerbs));
        }

        const node = describeClass(controlClass, actionVerbs);
        node.children = children;
        node.expanded = children.length > 0;
        controlNodes.push(node);
    }

    const foundation = describeClass(AbstractElement, actionVerbs);
    foundation.children = controlNodes;
    foundation.expanded = true;

    return [
        {
            id: "HTMLElement",
            label: "HTMLElement",
            generation: "Platform",
            tag: "",
            action: "",
            role: "The browser's element base class",
            expanded: true,
            children: [foundation]
        }
    ];
}

/**
 * Describes one class as a row.
 *
 * @param {Function} constructorFunction
 * @param {Object<string, string>} actionVerbs
 * @returns {object}
 */
export function describeClass(constructorFunction, actionVerbs)
{
    const name = constructorFunction.name;
    const tagName = constructorFunction.elementName === undefined || constructorFunction.elementName === null ? "" : constructorFunction.elementName;
    const verb = actionVerbs[name] === undefined ? "" : actionVerbs[name];

    return {
        id: name,
        label: name,
        generation: generationLabelOf(constructorFunction),
        tag: tagName,
        action: verb,
        role: CLASS_ROLES[name] === undefined ? "" : CLASS_ROLES[name],
        lineage: classLineage(constructorFunction).join(" > ")
    };
}

/**
 * Instantiates each control and asks it what its abstract action is called.
 *
 * The verbs displayed on the reference page are therefore the verbs the code
 * actually returns, not a table somebody maintained by hand. The probe elements
 * are never connected to the document and are discarded immediately.
 *
 * @param {Function[]} controlClasses Classes whose tags are already defined.
 * @returns {Object<string, string>} Class name to action verb.
 */
export function probeActionVerbs(controlClasses)
{
    const verbs = {};

    for (let index = 0; index < controlClasses.length; index = index + 1)
    {
        const controlClass = controlClasses[index];
        const tagName = controlClass.elementName;

        if (typeof tagName !== "string" || tagName === "")
        {
            continue;
        }

        const probe = document.createElement(tagName);

        if (probe instanceof controlClass === false)
        {
            continue;
        }

        const result = probe.performAction({ source: "probe" });
        verbs[controlClass.name] = result.action;
    }

    return verbs;
}

/**
 * One line about each class, written by the project. Roles are prose and belong
 * to Gen 3; everything else on a lineage row is computed.
 */
const CLASS_ROLES =
{
    AbstractElement: "Identity, lifecycle, owned DOM, managed events, the action seam",
    Label: "Text with an optional association to another control",
    TextBox: "Single-line text entry",
    TextArea: "Multi-line text entry",
    Button: "A command",
    CheckBox: "A two-state or three-state choice",
    RadioGroup: "One choice from a set",
    DropDown: "One choice from a list, using the native picker",
    ListBox: "A selectable list with keyboard navigation",
    TreeView: "A hierarchy with expandable branches",
    TreeListView: "A hierarchy displayed across columns",
    ImageView: "A figure with a load state",
    Panel: "A titled region with an optional collapse",
    Form: "Field composition, validation and submission",
    DataGrid: "Records in sortable columns",
    StatusMeter: "Progress and a dismissible status line",
    ShapeBookshelf: "The one-row shelf that navigates the site",
    ShapeBoard: "The project topology, drawn as a graph",
    ShapeProjectTree: "Navigation over the project's own areas",
    ShapeArtifactGrid: "The repository's inventory of itself",
    ShapeLineageView: "These lineages, read from the live classes",
    ShapeGenerationFilter: "Narrows the lineage view to one generation",
    ShapeStatusLabel: "A readout bound to the project's shared state",
    ShapeSectionReader: "The reading surface for one section of the site",
    ShapeContactForm: "Correspondence with the project",
    ShapeMark: "The crossing-spline mark"
};
