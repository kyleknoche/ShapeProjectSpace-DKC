import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

/**
 * TEST SUPPORT - DOM environment
 * =============================================================================
 * Installs a jsdom window as the global environment so that custom element
 * classes can be defined and exercised outside a browser.
 *
 * Order matters. The control classes evaluate "extends HTMLElement" when their
 * module is first imported, so the globals must exist before any src module is
 * loaded. Every test therefore installs the DOM first and imports the library
 * with a dynamic import afterwards, which is what loadModule() is for.
 *
 * node:test runs each test file in its own process, so one installation per
 * file is enough and no teardown is needed.
 */

let installedWindow = null;

/**
 * Installs jsdom globals over an empty document. Safe to call more than once.
 * @returns {Window} The jsdom window.
 */
export function installDom()
{
    return installWindow("<!doctype html><html><head></head><body></body></html>", "https://shape.test/");
}

/**
 * Installs jsdom globals over one of the repository's real pages, so a page
 * script can be imported and run against the markup it was written for.
 *
 * The page's own module script is not executed by jsdom; the caller imports it,
 * which is what makes the wiring testable. One page per process: the control
 * classes bind to the window that existed when their module was first imported,
 * so a second window in the same process would be a different platform.
 *
 * @param {string} pageName For example "index.html".
 * @returns {Window} The jsdom window.
 */
export function installPage(pageName)
{
    const markup = readFileSync(new URL("../../" + pageName, import.meta.url), "utf8");
    return installWindow(markup, "https://shape.test/" + pageName);
}

/**
 * @param {string} markup
 * @param {string} url
 * @returns {Window}
 */
function installWindow(markup, url)
{
    if (installedWindow !== null)
    {
        return installedWindow;
    }

    const dom = new JSDOM(markup,
    {
        url: url,
        pretendToBeVisual: true
    });

    const windowObject = dom.window;
    const exposedNames =
    [
        "window",
        "document",
        "customElements",
        "HTMLElement",
        "HTMLInputElement",
        "HTMLButtonElement",
        "HTMLSelectElement",
        "HTMLTextAreaElement",
        "Element",
        "Node",
        "EventTarget",
        "Event",
        "CustomEvent",
        "KeyboardEvent",
        "MouseEvent",
        "DOMParser",
        "getComputedStyle",
        "requestAnimationFrame",
        "cancelAnimationFrame"
    ];

    for (let index = 0; index < exposedNames.length; index = index + 1)
    {
        const name = exposedNames[index];
        globalThis[name] = name === "window" ? windowObject : windowObject[name];
    }

    installedWindow = windowObject;
    return windowObject;
}

/**
 * Imports a module from the repository after the DOM is installed.
 *
 * @param {string} specifier Path relative to the repository root, for example
 *                           "src/gen2/TextBox.js".
 * @returns {Promise<object>} The module namespace.
 */
export function loadModule(specifier)
{
    installDom();
    return import("../../" + specifier);
}

/**
 * Appends an element to the document body, which connects it.
 * @param {Element} element
 * @returns {Element} The same element.
 */
export function connect(element)
{
    document.body.appendChild(element);
    return element;
}

/**
 * Removes an element from the document, which disconnects it.
 * @param {Element} element
 * @returns {Element} The same element.
 */
export function disconnect(element)
{
    if (element.parentNode !== null)
    {
        element.parentNode.removeChild(element);
    }

    return element;
}

/**
 * Records events of one type dispatched on an element.
 *
 * @param {EventTarget} target
 * @param {string} type
 * @returns {{events: CustomEvent[], stop: Function}}
 */
export function recordEvents(target, type)
{
    const events = [];

    function collectEvent(event)
    {
        events.push(event);
    }

    target.addEventListener(type, collectEvent);

    function stop()
    {
        target.removeEventListener(type, collectEvent);
    }

    return { events: events, stop: stop };
}
