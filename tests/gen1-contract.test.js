import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom, loadModule, connect, disconnect, recordEvents } from "./support/environment.js";

/**
 * GEN 1 CONTRACT
 * =============================================================================
 * Tests the promises AbstractElement makes to every generation above it.
 *
 * These are architecture tests, not unit tests. Each one corresponds to a claim
 * the documentation makes, and each one would fail if a later session quietly
 * changed what the foundation guarantees.
 */

installDom();

const { AbstractElement } = await loadModule("src/gen1/AbstractElement.js");

/**
 * A minimal conforming subclass, defined in the test rather than imported, so
 * these tests do not depend on the control library at all.
 */
class ProbeElement extends AbstractElement
{
    static elementName = "probe-element";

    label = "";
    buildCount = 0;
    syncCount = 0;
    connectCount = 0;
    disconnectCount = 0;

    constructor()
    {
        super();
        this.handleProbeClick = this.handleProbeClick.bind(this);
        this.clickCount = 0;
    }

    buildElements()
    {
        this.buildCount = this.buildCount + 1;
        const body = document.createElement("div");
        body.className = "probe__body";
        this.defineElement("body", body);
        this.append(body);
    }

    bindEvents()
    {
        this.addManagedListener(this.getElement("body"), "click", this.handleProbeClick);
    }

    syncElements()
    {
        this.syncCount = this.syncCount + 1;
        this.getElement("body").textContent = this.label;
    }

    onConnected()
    {
        this.connectCount = this.connectCount + 1;
    }

    onDisconnected()
    {
        this.disconnectCount = this.disconnectCount + 1;
    }

    handleProbeClick(event)
    {
        this.clickCount = this.clickCount + 1;
    }

    abstractAction(payload)
    {
        return { action: "probe", handled: true, detail: { payload: payload === undefined ? null : payload } };
    }
}

/**
 * A subclass that forgets the abstract action. It must be impossible to build.
 */
class ForgetfulElement extends AbstractElement
{
    static elementName = "forgetful-element";
}

ProbeElement.define();
ForgetfulElement.define();

test("the abstract foundation cannot be instantiated directly", function ()
{
    assert.throws(function ()
    {
        return new AbstractElement();
    }, TypeError);
});

test("a subclass that does not implement the abstract action cannot be constructed", function ()
{
    assert.throws(function ()
    {
        return new ForgetfulElement();
    }, /must implement abstractAction/);

    const upgraded = document.createElement("forgetful-element");
    assert.equal(upgraded instanceof ForgetfulElement, false, "a failed construction must not yield a working element");
});

test("every instance has a stable unique identity", function ()
{
    const first = document.createElement("probe-element");
    const second = document.createElement("probe-element");

    assert.notEqual(first.elementId, second.elementId);
    assert.match(first.elementId, /^probe-element-\d+$/);

    const idBefore = first.elementId;
    connect(first);
    assert.equal(first.elementId, idBefore);
    assert.equal(first.id, idBefore);
    disconnect(first);
    assert.equal(first.elementId, idBefore);
});

test("owned DOM is built exactly once, however often the element reconnects", function ()
{
    const element = document.createElement("probe-element");

    connect(element);
    const bodyAfterFirstConnect = element.getElement("body");

    disconnect(element);
    connect(element);
    disconnect(element);
    connect(element);

    assert.equal(element.buildCount, 1);
    assert.equal(element.connectionCount, 3);
    assert.equal(element.getElement("body"), bodyAfterFirstConnect, "the owned node must be the same object");
    assert.equal(element.childNodes.length, 1, "reconnecting must not duplicate owned DOM");

    disconnect(element);
});

test("managed listeners are released on disconnect and restored on reconnect", function ()
{
    const element = document.createElement("probe-element");

    connect(element);
    assert.equal(element.managedListenerCount, 1);

    element.getElement("body").click();
    assert.equal(element.clickCount, 1);

    disconnect(element);
    assert.equal(element.managedListenerCount, 0);

    element.getElement("body").click();
    assert.equal(element.clickCount, 1, "a detached element must not respond to events");

    connect(element);
    assert.equal(element.managedListenerCount, 1);

    element.getElement("body").click();
    assert.equal(element.clickCount, 2, "a reconnected element must respond again");

    disconnect(element);
});

test("a single managed listener can be removed by token", function ()
{
    const element = document.createElement("probe-element");
    connect(element);

    const token = element.addManagedListener(element, "custom-probe", element.handleProbeClick);
    assert.equal(element.managedListenerCount, 2);

    assert.equal(element.removeManagedListener(token), true);
    assert.equal(element.managedListenerCount, 1);
    assert.equal(element.removeManagedListener(token), false, "removing twice is not an error but reports false");

    disconnect(element);
});

test("owned element lookup fails loudly for a name that was never defined", function ()
{
    const element = document.createElement("probe-element");
    connect(element);

    assert.equal(element.hasElement("body"), true);
    assert.equal(element.hasElement("missing"), false);
    assert.throws(function ()
    {
        element.getElement("missing");
    }, /not defined/);

    disconnect(element);
});

test("defining the same owned name twice is refused", function ()
{
    const element = document.createElement("probe-element");
    connect(element);

    assert.throws(function ()
    {
        element.defineElement("body", document.createElement("div"));
    }, /already defined/);

    disconnect(element);
});

test("performAction emits tg-action and normalises the result", function ()
{
    const element = document.createElement("probe-element");
    connect(element);

    const recorder = recordEvents(element, "tg-action");
    const result = element.performAction({ from: "test" });

    assert.equal(recorder.events.length, 1);
    assert.equal(result.action, "probe");
    assert.equal(result.handled, true);
    assert.equal(result.source, element.elementId);
    assert.deepEqual(recorder.events[0].detail, result);

    recorder.stop();
    disconnect(element);
});

test("the action event bubbles so a page can listen in one place", function ()
{
    const host = document.createElement("div");
    document.body.appendChild(host);

    const element = document.createElement("probe-element");
    host.appendChild(element);

    const recorder = recordEvents(host, "tg-action");
    element.performAction();

    assert.equal(recorder.events.length, 1);

    recorder.stop();
    host.remove();
});

test("configure applies properties and updates once", function ()
{
    const element = document.createElement("probe-element");
    connect(element);

    const syncsBefore = element.syncCount;
    element.configure({ label: "configured" });

    assert.equal(element.label, "configured");
    assert.equal(element.getElement("body").textContent, "configured");
    assert.equal(element.syncCount, syncsBefore + 1, "configure must batch into one update");

    disconnect(element);
});

test("configure refuses a property the element does not have", function ()
{
    const element = document.createElement("probe-element");
    connect(element);

    assert.throws(function ()
    {
        element.configure({ notAProperty: 1 });
    }, /has no property/);

    disconnect(element);
});

test("updates before the first connection are ignored rather than crashing", function ()
{
    const element = document.createElement("probe-element");

    element.requestUpdate();
    assert.equal(element.syncCount, 0);
    assert.equal(element.isBuilt, false);

    connect(element);
    assert.equal(element.isBuilt, true);
    assert.ok(element.syncCount >= 1);

    disconnect(element);
});

test("connection and disconnection are announced", function ()
{
    const host = document.createElement("div");
    document.body.appendChild(host);

    const element = document.createElement("probe-element");
    const connectRecorder = recordEvents(host, "tg-connected");
    const disconnectRecorder = recordEvents(element, "tg-disconnected");

    host.appendChild(element);
    assert.equal(connectRecorder.events.length, 1, "tg-connected bubbles while the element is still in the tree");

    element.remove();
    assert.equal(disconnectRecorder.events.length, 1, "tg-disconnected reaches listeners on the element itself");

    connectRecorder.stop();
    disconnectRecorder.stop();
    host.remove();
});

test("define is idempotent but refuses to steal a tag name", function ()
{
    assert.equal(ProbeElement.define(), ProbeElement);

    class ImposterElement extends AbstractElement
    {
        abstractAction()
        {
            return null;
        }
    }

    assert.throws(function ()
    {
        ImposterElement.define("probe-element");
    }, /already defined/);
});

test("Gen 1 owns nothing an application would recognise", async function ()
{
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("../src/gen1/AbstractElement.js", import.meta.url), "utf8");
    const code = stripComments(source);

    const forbidden = ["fetch(", "localStorage", "sessionStorage", "history.", "window.location", "XMLHttpRequest", "import("];

    for (let index = 0; index < forbidden.length; index = index + 1)
    {
        assert.equal(code.indexOf(forbidden[index]), -1, "Gen 1 must not contain " + forbidden[index]);
    }

    const lineCount = source.split("\n").length;
    assert.ok(lineCount < 700, "Gen 1 has grown to " + lineCount + " lines; it is meant to stay small and boring");
});

/**
 * Removes block and line comments so a source scan inspects code, not prose.
 * @param {string} source
 * @returns {string}
 */
function stripComments(source)
{
    const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, " ");
    return withoutBlocks.replace(/(^|[^:])\/\/.*$/gm, "$1");
}
