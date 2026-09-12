import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom, loadModule, connect, disconnect, recordEvents } from "./support/environment.js";

/**
 * GEN 2 LIBRARY INVARIANTS
 * =============================================================================
 * Properties every control in the library must have, asserted for all fifteen
 * rather than for a chosen few. A control added later is covered the moment it
 * appears in the barrel, which is the point: the test suite grows with the
 * library without anybody remembering to extend it.
 */

installDom();

const { AbstractElement } = await loadModule("src/gen1/AbstractElement.js");
const { GEN2_CONTROLS } = await loadModule("src/gen2/index.js");
const { registerGen2Controls } = await loadModule("src/app/registerGen2.js");

registerGen2Controls();

test("the library is the size the architecture claims", function ()
{
    assert.ok(GEN2_CONTROLS.length >= 10, "the library should hold at least ten controls");
    assert.ok(GEN2_CONTROLS.length <= 16, "a library beyond sixteen controls needs a decision record");
});

test("every control inherits Gen 1 directly", function ()
{
    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const controlClass = GEN2_CONTROLS[index];

        assert.equal(Object.getPrototypeOf(controlClass), AbstractElement, controlClass.name + " must extend AbstractElement directly");
        assert.ok(controlClass.prototype instanceof AbstractElement, controlClass.name + " is not a Three-Gen element");
    }
});

test("every control declares a namespaced tag and is registered", function ()
{
    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const controlClass = GEN2_CONTROLS[index];

        assert.equal(typeof controlClass.elementName, "string", controlClass.name + " needs a static elementName");
        assert.match(controlClass.elementName, /^tg-[a-z-]+$/, controlClass.name + " needs a tg- tag name");
        assert.equal(customElements.get(controlClass.elementName), controlClass, controlClass.elementName + " is not registered to its class");
    }
});

test("every control implements the abstract action with its own meaning", function ()
{
    const verbs = new Map();

    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const controlClass = GEN2_CONTROLS[index];

        assert.notEqual(
            controlClass.prototype.abstractAction,
            AbstractElement.prototype.abstractAction,
            controlClass.name + " must implement abstractAction()");

        const element = connect(document.createElement(controlClass.elementName));
        const result = element.performAction();

        assert.equal(typeof result.action, "string", controlClass.name + " must report an action name");
        assert.notEqual(result.action, "none", controlClass.name + " must name its act");
        assert.equal(typeof result.handled, "boolean");
        assert.equal(result.source, element.elementId);

        verbs.set(controlClass.name, result.action);
        disconnect(element);
    }

    assert.ok(verbs.size === GEN2_CONTROLS.length);
});

test("every control builds real DOM with named owned references", function ()
{
    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const controlClass = GEN2_CONTROLS[index];
        const element = connect(document.createElement(controlClass.elementName));

        assert.ok(element.childNodes.length > 0, controlClass.name + " must construct a real UI");
        assert.ok(element.ownedElementNames().length > 0, controlClass.name + " must keep named references to what it built");

        for (const name of element.ownedElementNames())
        {
            const node = element.getElement(name);
            assert.ok(node !== null && typeof node === "object", controlClass.name + " owned element " + name + " is not a node");
        }

        assert.ok(element.classList.contains("tg-control"), controlClass.name + " must carry the shared control class");
        disconnect(element);
    }
});

test("every control works with no configuration at all", function ()
{
    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const controlClass = GEN2_CONTROLS[index];
        const element = document.createElement(controlClass.elementName);

        assert.doesNotThrow(function ()
        {
            connect(element);
            element.performAction();
            disconnect(element);
        }, controlClass.name + " must tolerate absent optional configuration");
    }
});

test("every control releases its listeners on disconnect and rebinds on reconnect", function ()
{
    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const controlClass = GEN2_CONTROLS[index];
        const element = connect(document.createElement(controlClass.elementName));
        const boundCount = element.managedListenerCount;

        assert.ok(boundCount > 0, controlClass.name + " should listen to something it owns");

        disconnect(element);
        assert.equal(element.managedListenerCount, 0, controlClass.name + " leaked listeners on disconnect");

        connect(element);
        assert.equal(element.managedListenerCount, boundCount, controlClass.name + " did not rebind on reconnect");

        disconnect(element);
    }
});

test("no control rebuilds its owned DOM when it is reconnected", function ()
{
    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const controlClass = GEN2_CONTROLS[index];
        const element = connect(document.createElement(controlClass.elementName));

        const names = element.ownedElementNames();
        const before = new Map();

        for (const name of names)
        {
            before.set(name, element.getElement(name));
        }

        const childCount = element.childNodes.length;

        disconnect(element);
        connect(element);

        assert.equal(element.childNodes.length, childCount, controlClass.name + " duplicated its DOM on reconnect");

        for (const name of names)
        {
            assert.equal(element.getElement(name), before.get(name), controlClass.name + " replaced its owned node " + name);
        }

        disconnect(element);
    }
});

test("every control announces its action on the DOM event system", function ()
{
    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const controlClass = GEN2_CONTROLS[index];
        const host = document.createElement("div");
        document.body.appendChild(host);

        const element = document.createElement(controlClass.elementName);
        host.appendChild(element);

        const recorder = recordEvents(host, "tg-action");
        element.performAction();

        assert.equal(recorder.events.length, 1, controlClass.name + " did not emit tg-action");
        assert.equal(recorder.events[0].detail.action, element.performAction().action);

        recorder.stop();
        host.remove();
    }
});

test("no control carries application vocabulary in its rendered output", function ()
{
    const forbidden = /\b(shape|kyle|mbs|bookshelf|shapescript)\b/i;

    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const controlClass = GEN2_CONTROLS[index];
        const element = connect(document.createElement(controlClass.elementName));

        const text = element.textContent === null ? "" : element.textContent;
        assert.equal(forbidden.test(text), false, controlClass.name + " rendered application vocabulary: " + text);
        assert.equal(forbidden.test(element.className), false, controlClass.name + " carries an application class name");

        disconnect(element);
    }
});

test("controls can be configured entirely through attributes", function ()
{
    const host = document.createElement("div");
    document.body.appendChild(host);

    const cases =
    [
        { tag: "tg-label", attribute: "text", value: "From markup", property: "text" },
        { tag: "tg-button", attribute: "text", value: "Go", property: "text" },
        { tag: "tg-text-box", attribute: "label", value: "Name", property: "label" },
        { tag: "tg-text-area", attribute: "rows", value: "7", property: "rows" },
        { tag: "tg-check-box", attribute: "label", value: "Agree", property: "label" },
        { tag: "tg-panel", attribute: "heading", value: "Region", property: "heading" },
        { tag: "tg-status-meter", attribute: "value", value: "42", property: "value" }
    ];

    for (let index = 0; index < cases.length; index = index + 1)
    {
        const entry = cases[index];
        const element = document.createElement(entry.tag);
        element.setAttribute(entry.attribute, entry.value);
        host.appendChild(element);

        const actual = element[entry.property];
        assert.equal(String(actual), entry.value, entry.tag + " did not read its " + entry.attribute + " attribute");
    }

    host.remove();
});
