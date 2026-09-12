/**
 * GEN 2 SUPPORT - dom.js
 * =============================================================================
 * Small explicit DOM helpers shared by the Gen-2 control library.
 *
 * These are not a framework and not a factory layer. Each function does one
 * obvious thing that would otherwise be repeated in fifteen controls. Nothing
 * here creates a control, hides an inheritance relationship, or knows anything
 * about an application.
 *
 * Rules that apply to every file in this folder:
 *
 *   - no innerHTML, outerHTML, insertAdjacentHTML or markup strings;
 *   - no application vocabulary;
 *   - no imports from gen3;
 *   - no imports from a Gen-2 control (support code is a leaf).
 */

/**
 * Creates an element and optionally assigns a class and text.
 *
 * @param {string} tagName
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
export function createElement(tagName, className, text)
{
    const node = document.createElement(tagName);

    if (className !== undefined && className !== null && className !== "")
    {
        node.className = className;
    }

    if (text !== undefined && text !== null)
    {
        node.textContent = String(text);
    }

    return node;
}

/**
 * Creates an SVG element in the correct namespace.
 *
 * @param {string} tagName
 * @param {string} [className]
 * @returns {SVGElement}
 */
export function createSvgElement(tagName, className)
{
    const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);

    if (className !== undefined && className !== null && className !== "")
    {
        node.setAttribute("class", className);
    }

    return node;
}

/**
 * Assigns text content only when it differs, so that unnecessary DOM writes and
 * caret resets are avoided during a synchronise pass.
 *
 * @param {Element} node
 * @param {string} text
 */
export function setText(node, text)
{
    const value = text === undefined || text === null ? "" : String(text);

    if (node.textContent !== value)
    {
        node.textContent = value;
    }
}

/**
 * Adds or removes a class according to a boolean.
 *
 * @param {Element} node
 * @param {string} className
 * @param {boolean} enabled
 */
export function setClass(node, className, enabled)
{
    if (enabled === true)
    {
        node.classList.add(className);
        return;
    }

    node.classList.remove(className);
}

/**
 * Sets or removes an attribute according to a boolean.
 *
 * @param {Element} node
 * @param {string} name
 * @param {boolean} enabled
 * @param {string} [value] Value to use when enabled. Defaults to an empty string.
 */
export function setBooleanAttribute(node, name, enabled, value)
{
    if (enabled === true)
    {
        node.setAttribute(name, value === undefined ? "" : value);
        return;
    }

    node.removeAttribute(name);
}

/**
 * Sets an attribute, or removes it when the value is empty.
 *
 * @param {Element} node
 * @param {string} name
 * @param {string|null|undefined} value
 */
export function setOptionalAttribute(node, name, value)
{
    if (value === undefined || value === null || value === "")
    {
        node.removeAttribute(name);
        return;
    }

    node.setAttribute(name, String(value));
}

/**
 * Removes every child of a node.
 *
 * Structural chrome must never be cleared this way. This exists for genuinely
 * data-driven regions that have no reconciler, such as a set of option elements
 * inside a native select.
 *
 * @param {Element} node
 */
export function removeAllChildren(node)
{
    while (node.firstChild !== null)
    {
        node.removeChild(node.firstChild);
    }
}

/**
 * Interprets an attribute value as a boolean using HTML rules: a present
 * attribute is true unless it literally says "false".
 *
 * @param {string|null} attributeValue
 * @returns {boolean}
 */
export function attributeToBoolean(attributeValue)
{
    if (attributeValue === null || attributeValue === undefined)
    {
        return false;
    }

    return String(attributeValue).toLowerCase() !== "false";
}

/**
 * Coerces any value to a boolean.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function toBoolean(value)
{
    return value === true || value === "true" || value === 1 || value === "";
}

/**
 * Coerces a value to a finite number, falling back when it is not numeric.
 *
 * @param {*} value
 * @param {number} fallback
 * @returns {number}
 */
export function toNumber(value, fallback)
{
    const parsed = Number(value);

    if (Number.isFinite(parsed) === false)
    {
        return fallback;
    }

    return parsed;
}

/**
 * Restricts a value to a range.
 *
 * @param {number} value
 * @param {number} minimum
 * @param {number} maximum
 * @returns {number}
 */
export function clamp(value, minimum, maximum)
{
    if (value < minimum)
    {
        return minimum;
    }

    if (value > maximum)
    {
        return maximum;
    }

    return value;
}

/**
 * Attaches a record of named inner nodes to a node the control created.
 *
 * List controls create many similar rows, and a row is not a control, so it has
 * no elements map of its own. Without this, updating a row means querying it
 * with a selector every time, which is exactly the habit the coding standards
 * forbid. With it, a row carries durable references to its own parts.
 *
 * @param {Element} node
 * @param {Object<string, Element>} parts
 * @returns {Element} The same node.
 */
export function attachParts(node, parts)
{
    node.tgParts = parts;
    return node;
}

/**
 * Reads the parts record attached by attachParts().
 *
 * @param {Element} node
 * @returns {Object<string, Element>}
 */
export function partsOf(node)
{
    if (node.tgParts === undefined)
    {
        throw new Error("Node has no attached parts record; call attachParts() when creating it.");
    }

    return node.tgParts;
}

/**
 * Normalises any value to a display string.
 *
 * @param {*} value
 * @returns {string}
 */
export function toText(value)
{
    if (value === undefined || value === null)
    {
        return "";
    }

    return String(value);
}
