# Coding standards

Hard rules. Most are enforced by `npm run check`; the rest are enforced by
review. They exist to make one kind of code easy to write and another kind hard.

---

## 1. No generated markup

Production JavaScript must never produce DOM from a string.

Forbidden: `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`,
`DOMParser`, `createContextualFragment`, and any string or template literal
containing element markup.

```js
// No.
container.innerHTML = "<span class='label'>" + text + "</span>";

// Yes.
const label = document.createElement("span");
label.className = "label";
label.textContent = text;
container.append(label);
```

The DOM is an object graph. Treat it like one: you get type safety, you get
references you can keep, you get no escaping bugs, and you get a diff that shows
what actually changed.

SVG is the same rule with a different namespace — use `createSvgElement()` from
`src/gen2/support/dom.js`, which wraps `createElementNS`.

*Enforced.*

## 2. Build once, then update in place

A control constructs the DOM it owns exactly once, in `buildElements()`, on its
first connection. After that it modifies those nodes.

```js
buildElements()
{
    const input = createElement("input", "tg-field__input");
    this.defineElement("input", input);
    this.append(input);
}

syncElements()
{
    const input = this.getElement("input");
    input.disabled = this.#disabled;
}
```

- Register every important node with `defineElement(name, node)`.
- Reach it later with `this.getElement(name)` or `this.elements.name`.
- Never re-query your own component for a node you created.
- Never destroy and rebuild a component because its configuration changed.
- For data-driven lists use `ChildReconciler`, which reuses nodes by key. That is
  what keeps selection, focus, scroll position and outside references alive
  across an update.

`syncElements()` must be idempotent and must not create structural nodes.

## 3. Named event handlers

```js
constructor()
{
    super();
    this.handleInputChanged = this.handleInputChanged.bind(this);
}

bindEvents()
{
    this.addManagedListener(this.getElement("input"), "input", this.handleInputChanged);
}

handleInputChanged(event)
{
    ...
}
```

Bind once in the constructor so the reference is stable. Register through
`addManagedListener()` so the listener is released automatically on disconnect.
Anonymous callbacks are forbidden: they cannot be removed, and they appear in a
stack trace as nothing at all.

*Enforced.*

## 4. One event system

Public notifications are DOM `CustomEvent`s, dispatched through `emit()`.

- Library events are prefixed `tg-`.
- Application events are prefixed `shape-`.
- Every event a class emits is listed in its class comment and in
  `docs/CONTROLS.md`.
- `performAction()` owns `tg-action`. An `abstractAction()` implementation
  returns a descriptor and never dispatches that event itself.

There is no observer registry, no callback bus and no second mechanism. Where a
callback genuinely belongs to data — a column's `format` or `compare` — it is a
named function supplied by the caller, never an inline lambda.

## 5. Callback ownership

Every callback has one obvious owner. The reconciler callbacks (`keyOf`,
`create`, `update`) are bound methods of the control that constructed the
reconciler. Page scripts route events with named module-level functions. If you
cannot say in one sentence which object owns a callback, restructure it.

## 6. No hidden global state

No module-level mutable state that anything else can reach, and no assignment to
`window`, `globalThis` or `self`.

Shared application state is one explicit object — `ShapeSpaceState` — constructed
by a page and handed to whoever needs it. It is an `EventTarget`, so a Three-Gen
element subscribes to it with `addManagedListener()` and is unsubscribed by the
ordinary lifecycle.

*Enforced.*

## 7. Dependency direction

```
Gen 3  →  Gen 2  →  Gen 1  →  HTMLElement
```

- Gen 1 imports nothing but the platform.
- Gen 2 imports Gen 1 and its own `support/` folder. **A Gen-2 control may not
  import another Gen-2 control.**
- Gen 3 imports Gen 2, and Gen 1 where it needs the base type.
- `src/app` imports anything under `src`.
- The gallery page script may not import Gen 3 at all.

*Enforced.*

## 8. No application vocabulary below Gen 3

The words *shape*, *ShapeScript*, *Kyle*, *MBS*, *bookshelf*, *board* and
*project space* must not appear in `src/gen1`, `src/gen2` or
`assets/css/controls.css` — including comments and class names. The check is
case-insensitive, so the ordinary English word "shape" is caught too. Write
"structure", "form" or "layout" instead.

*Enforced.*

## 9. Naming

| Thing | Rule |
| --- | --- |
| File | Exactly the class name. `TreeView` lives in `TreeView.js`. |
| Gen-2 tag | `tg-` prefix, hyphenated: `tg-tree-list-view`. |
| Gen-3 class | `Shape` prefix: `ShapeProjectTree`. |
| Gen-3 tag | `shape-` prefix: `shape-project-tree`. |
| CSS | `tg-control`, `tg-control__part`, `tg-control--state`. |
| Handler | `handleSomethingHappened`. |
| Private field | `#name`. Anything not `#` is public API. |

*Enforced.*

## 10. Style

Allman braces, four spaces, no tabs.

```js
if (condition === true)
{
    doSomething();
}
```

- Compare explicitly: `if (value === true)`, not `if (value)`.
- `const` and `let`. Never `var`.
- No dense chaining. Name the intermediate:

```js
// No.
this.querySelector(".row").classList.add("active").focus();

// Yes.
const element = this.getElement("row");
element.classList.add("active");
element.focus();
```

- Plain `for` loops over array iteration helpers in library code. They are
  easier to step through, and this project prefers debuggability to brevity.
- No `console.log` in `src/`. *Enforced.*

## 11. Documented public API

Every Gen-2 and Gen-3 class carries a comment block stating:

- what it is and its `Lineage:`;
- attributes, properties, methods, events;
- what its **Abstract action** means;
- the points at which it expects to be specialised.

A developer must be able to use a control without reading its private internals.

*Partly enforced: the lineage line and the abstract-action section are checked.*

## 12. Accessibility is part of correctness

Use native controls where one exists (`input`, `select`, `textarea`, `button`).
Composite widgets carry the right roles, keep focus on a single container and
name the current item with `aria-activedescendant`, so that a data update can
never move focus out of the control. Keyboard support is not optional: arrow
keys, `Home`, `End`, `Enter` and `Space` work everywhere they should.
