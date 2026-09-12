# The Three-Gen Design Pattern

Three generations between the platform and the application, and no more.

```
HTMLElement
     ↓
AbstractElement                       GEN 1   abstract foundation
     ↓
Label, TextBox, TreeView, DataGrid …  GEN 2   concrete generic controls
     ↓
ShapeBookshelf, ShapeBoard, …         GEN 3   project-authoritative specialisations
```

Dependency direction is fixed:

```
GEN 3  →  GEN 2  →  GEN 1  →  HTMLElement
```

Never inverted. `npm run check` fails on an inversion, and the reference page
computes each class's generation from its inheritance distance rather than from
its folder, so a class cannot claim a generation it has not earned.

---

## Gen 1 — the abstract foundation

One class, `src/gen1/AbstractElement.js`. It owns five things:

| Concern | What it provides |
| --- | --- |
| Identity | `elementId`, assigned at construction, never reassigned. |
| Lifecycle | `buildElements()` once; `bindEvents()`, `syncElements()`, `onConnected()` on every connection; listener release on every disconnection. |
| Owned DOM | `defineElement()`, `getElement()`, `hasElement()`, `ownedElementNames()`, and the `elements` record. |
| Managed events | `addManagedListener()`, `removeManagedListener()`, `releaseManagedListeners()`, `managedListenerCount`. |
| The action seam | `performAction()` and the abstract `abstractAction()`. |

Plus three small conveniences that are genuinely universal: `emit()`,
`configure()` and `requestUpdate()`.

### What Gen 1 must never own

Routing. Stores. Repositories. Application state. Graph logic. Content loading.
Business models. Dependency injection. Service locators. Navigation. Analytics.
Metadata systems. Architecture-inspection UI. Project configuration of any kind.

The test before adding anything here is one question:

> Is this intrinsic to the existence and lifecycle contract of essentially every
> Three-Gen element?

If the answer is no, it belongs in Gen 2 or Gen 3. Gen 1 is meant to be small
and boring; a test asserts that it stays under 700 lines and contains no
networking, storage or history access.

### Why it is abstract

A base class that can be instantiated becomes a place to put things. So the
constructor refuses two things:

```js
if (new.target === AbstractElement)
{
    throw new TypeError("AbstractElement is abstract and cannot be instantiated directly.");
}

if (this.abstractAction === AbstractElement.prototype.abstractAction)
{
    throw new TypeError(new.target.name + " must implement abstractAction(); Gen 1 cannot know what acting means.");
}
```

The second is the stronger guarantee: **an element that does not know what acting
means cannot be constructed at all.** The failure happens at the point of the
mistake, not three frames later.

---

## Gen 2 — the concrete control library

Fifteen controls, each one step below the foundation. Every one:

- extends `AbstractElement` directly;
- is concrete and works with no subclass;
- builds a real UI with sensible defaults;
- tolerates absent configuration;
- exposes documented properties, methods and events;
- keeps stable references to the DOM it owns;
- releases its listeners on disconnect;
- implements `abstractAction()` with a meaning of its own;
- knows nothing about any particular application.

The inventory and the full API of each are in [CONTROLS.md](CONTROLS.md).

### Why it is concrete

An abstract middle layer cannot be tested for usefulness. A concrete one can be
opened in a browser and found wanting. `controls.html` registers Gen 2, imports
nothing from `src/gen3`, and exercises all fifteen controls with a live event
monitor. A test file asserts the same thing in its own process, where no
application class has ever been loaded.

### The sibling rule

**A Gen-2 control may not import another Gen-2 control.** Controls compose in a
page, not inside each other. Two consequences worth knowing:

- `Form` builds its own plain `<button>` elements instead of importing `Button`,
  so using a form never drags in a registration you did not ask for.
- `TreeView` and `TreeListView` are siblings, not parent and child. The hierarchy
  logic they genuinely share lives in `HierarchyModel`, a plain object with no
  DOM and no events, in `src/gen2/support/`.

The rule keeps the generation flat. A control that inherited another control
would put its Gen-3 specialisations four steps below the foundation, and the
pattern would quietly become Four-Gen.

---

## Gen 3 — project authority

Ten elements, each extending the Gen-2 control closest to what it needs.

| Application element | Extends | What it adds |
| --- | --- | --- |
| `ShapeBookshelf` | `ListBox` | The shelf of sections; activation means navigation. |
| `ShapeBoard` | `Panel` | The project topology, drawn as an SVG graph. |
| `ShapeSectionReader` | `Panel` | The reading surface for one section. |
| `ShapeProjectTree` | `TreeView` | The project's areas and the path to one. |
| `ShapeArtifactGrid` | `DataGrid` | The repository's inventory of itself. |
| `ShapeLineageView` | `TreeListView` | These lineages, read from the live classes. |
| `ShapeGenerationFilter` | `RadioGroup` | Narrows a view to one generation. |
| `ShapeStatusLabel` | `Label` | A readout bound to shared state. |
| `ShapeContactForm` | `Form` | Correspondence, and honesty about having no server. |
| `ShapeMark` | `ImageView` | The crossing-spline mark. |

Gen 3 may know about Shape Project Space, Kyle, MBS++, ShapeScript, the Board,
the bookshelf metaphor, routes, content and project visual semantics. Gen 1 and
Gen 2 may not, and a check enforces that the vocabulary does not leak downwards.

### Bind, do not rebuild

`ShapeBookshelf` is the model case: about a hundred lines, of which the
behavioural part is "the items are the project's sections, the spine is a badge,
and activation also announces `shape-navigate`". Selection, keyboard navigation,
the active descendant and row reconciliation are all inherited and untouched.

A test asserts that every Gen-3 override calls its `super`, and that the whole
application layer stays smaller than the generic layer it binds. If Gen 3 starts
growing list rendering or validation, that test is the alarm.

### Extending the seam

Two Gen-3 elements add a second meaning to `abstractAction()` without discarding
the one they inherited:

```js
abstractAction(payload)
{
    const wantsNode = payload !== null && payload !== undefined && payload.nodeId !== undefined;

    if (wantsNode === false)
    {
        return super.abstractAction(payload);   // still a Panel: "toggle"
    }

    // ... the board's own act: "select-node"
}
```

The others call `super.abstractAction()` first and then announce the result in
the project's vocabulary. Either shape is specialisation. Replacing the base
implementation outright would not be.

---

## Why independent sessions benefit

An assistant joining this repository tomorrow has the files and nothing else.
Everything it cannot infer, it will re-derive — and a re-derived architecture is
a different architecture wearing the same names.

The generational boundaries make the inference mechanical:

- **A folder is a permission set.** `src/gen2/` may import Gen 1 and its own
  `support/`. That is the whole rule, and it is checked.
- **A base class is a generation.** Not a comment, not a convention, a fact about
  the prototype chain that the reference page reads at runtime.
- **A prefix is a layer.** `tg-` is generic, `shape-` is the application.
- **Fifteen siblings are a template.** Asked to add a control, the cheapest
  correct action is to copy the file next door.
- **A crossed boundary fails a command.** Not a review comment weeks later.

The claim is not that a model will understand the intent. It is that the
structure makes the intended move cheaper than the unintended one. That argument
is set out in full in [AI-COLLABORATION.md](AI-COLLABORATION.md).

---

## How the repository encodes its own intent

| Mechanism | Where |
| --- | --- |
| Generational boundaries | `src/gen1`, `src/gen2`, `src/gen3` |
| Naming that carries the layer | `tg-` / `Shape` prefixes, file name equals class name |
| Standards | `CODING-STANDARDS.md` |
| Automated architecture checks | `tools/check-architecture.mjs` |
| Documentation-agreement checks | `tools/check-docs.mjs` |
| Pattern tests, not only unit tests | `tests/` |
| Worked examples | fifteen controls, all written the same way |
| Decision records | `docs/DECISIONS.md` |
| Operational state | `docs/HANDOFF.md` |
| Required reading | `AGENTS.md` |
| A page that cannot lie | `three-gen.html` |
