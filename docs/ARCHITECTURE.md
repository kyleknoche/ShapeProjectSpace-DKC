# Architecture

What exists, where it lives, and what may depend on what.

`tools/check-docs.mjs` verifies that every class in `src/` is named in this
document. If you add one and forget to list it here, the build says so.

---

## The dependency graph

```
                     ┌──────────────────────────────┐
   src/app/          │  registerGen2  registerGen3  │   pages, wiring, routing
                     │  index-page  controls-page   │
                     │  three-gen-page              │
                     └───────┬──────────────┬───────┘
                             │              │
                             ▼              ▼
   src/gen3/     ShapeBookshelf … ShapeMark, data/, ShapeSpaceState
                             │
                             ▼
   src/gen2/     Label … StatusMeter          support/dom
                             │                support/ChildReconciler
                             │                support/HierarchyModel
                             ▼                support/navigation
   src/gen1/           AbstractElement
                             │
                             ▼
                        HTMLElement
```

Arrows are the only permitted direction. Additionally:

- A **Gen-2 control may not import another Gen-2 control.** It may import Gen 1
  and its own `support/` folder, nothing else.
- `support/` is a leaf: it imports nothing from the library it supports.
- `src/app/controls-page.js` may not import Gen 3 at all. That restriction is
  what makes the control gallery evidence rather than decoration.

---

## Gen 1 — `src/gen1/`

### `AbstractElement`

The one abstract class. Owns identity, the custom element lifecycle, ownership of
created DOM, managed event registration, and the action seam. Refuses direct
instantiation, and refuses to construct any subclass that has not implemented
`abstractAction()`.

Full description in [THREE-GEN.md](THREE-GEN.md).

---

## Gen 2 — `src/gen2/`

Fifteen concrete controls. Full API in [CONTROLS.md](CONTROLS.md).

| Class | Tag | Abstract action |
| --- | --- | --- |
| `Label` | `tg-label` | activate |
| `TextBox` | `tg-text-box` | commit |
| `TextArea` | `tg-text-area` | commit |
| `Button` | `tg-button` | invoke |
| `CheckBox` | `tg-check-box` | toggle |
| `RadioGroup` | `tg-radio-group` | select |
| `DropDown` | `tg-drop-down` | select |
| `ListBox` | `tg-list-box` | activate |
| `TreeView` | `tg-tree-view` | activate |
| `TreeListView` | `tg-tree-list-view` | activate |
| `ImageView` | `tg-image` | resolve |
| `Panel` | `tg-panel` | toggle |
| `Form` | `tg-form` | submit |
| `DataGrid` | `tg-data-grid` | activate |
| `StatusMeter` | `tg-status-meter` | acknowledge |

### `src/gen2/support/`

Four plain modules. None of them is a control, none creates one, and none knows
about any application. Together they are the intended answer to the sibling rule:
when controls that cannot inherit from each other need the same behaviour, it is
extracted here as a plain object or a pure function.

**`dom.js`** — small explicit helpers: `createElement`, `createSvgElement`,
`setText`, `setClass`, `setBooleanAttribute`, `setOptionalAttribute`,
`removeAllChildren`, `attributeToBoolean`, `toBoolean`, `toNumber`, `clamp`,
`toText`, and the `attachParts` / `partsOf` pair.

`attachParts(node, parts)` exists for a specific reason. A list control creates
many similar rows, and a row is not a control, so it has no `elements` map of its
own. Without a parts record, updating a row means querying it with a selector
every time — the habit the standards forbid. With one, a row carries durable
references to its own pieces.

**`ChildReconciler.js`** — keyed reconciliation of a container's children. Reuses
nodes whose keys survive, moves them into order with `insertBefore`, removes the
rest. This is what gives the library its stable DOM identity: selection, focus,
scroll position and outside references all survive a data update. Used by
`RadioGroup`, `DropDown`, `ListBox`, `TreeView`, `TreeListView`, `DataGrid`,
`ShapeBoard` and `ShapeSectionReader`.

**`HierarchyModel.js`** — indexing, parentage, expansion state and flattening for
a tree. No DOM, no events. It exists because `TreeView` and `TreeListView` are
siblings and cannot inherit from each other, so the logic they genuinely share
has to live beside them rather than above one of them.

**`navigation.js`** — keyboard cursor arithmetic: `nextIndexForKey()`,
`stepForKey()`, `isNavigationKey()`, `clampIndex()`. Pure functions, used by the
four controls that move a cursor through a flat list of rows — `ListBox`,
`TreeView`, `TreeListView` and `DataGrid` — each of which previously carried an
identical copy.

---

## Gen 3 — `src/gen3/`

Ten application elements, plus data and one state object.

| Class | Tag | Extends | Adds |
| --- | --- | --- | --- |
| `ShapeBookshelf` | `shape-bookshelf` | `ListBox` | The shelf of sections; `shape-navigate`. |
| `ShapeBoard` | `shape-board` | `Panel` | The topology, drawn as SVG; `shape-board-select`. |
| `ShapeSectionReader` | `shape-section-reader` | `Panel` | One section of prose; `shape-section-change`. |
| `ShapeProjectTree` | `shape-project-tree` | `TreeView` | Project areas and paths; `shape-area-change`. |
| `ShapeArtifactGrid` | `shape-artifact-grid` | `DataGrid` | The inventory, filtered by generation; `shape-artifact-open`. |
| `ShapeLineageView` | `shape-lineage-view` | `TreeListView` | Live class lineages; `shape-lineage-select`. |
| `ShapeGenerationFilter` | `shape-generation-filter` | `RadioGroup` | Generation choice; `shape-generation-filter`. |
| `ShapeStatusLabel` | `shape-status-label` | `Label` | A readout bound to shared state. |
| `ShapeContactForm` | `shape-contact-form` | `Form` | Correspondence; `shape-contact-composed`. |
| `ShapeMark` | `shape-mark` | `ImageView` | The crossing-spline mark. |

### `ShapeSpaceState`

Not an element. The one piece of shared application state, an `EventTarget`
holding `section`, `boardNodeId`, `projectAreaId` and `lastAction`.

**Ownership is explicit.** A page constructs exactly one and hands it to whoever
needs it. There is no module-level instance and no global. It announces changes
with `shape-state-change`, carrying `{ key, value, previousValue, origin,
snapshot }`, so a Three-Gen element subscribes with `addManagedListener()` and is
unsubscribed by the ordinary lifecycle. `ShapeStatusLabel` is the worked example.

### `src/gen3/data/`

**`projectSpace.js`** — the project's own words and structure: `SHELF_BOOKS`,
`SECTIONS`, `BOARD_TOPOLOGY`, `PROJECT_TREE`, `ARTIFACTS`, `CONTACT_ADDRESS`.
Data only; there is no markup in it and there must never be. Section copy is
meant to be edited directly.

`ARTIFACTS` is the repository's inventory of itself, and `tools/check-docs.mjs`
compares it against the source tree — name, generation and file path — so it
cannot drift.

**`lineage.js`** — reads the real class objects: `classLineage()`,
`baseClassOf()`, `distanceFromFoundation()`, `generationLabelOf()`,
`findLineageViolations()`, `buildLineageTree()`, `describeClass()`,
`probeActionVerbs()`.

This is why `three-gen.html` cannot lie. Generation is computed from inheritance
distance rather than from a folder name, and `probeActionVerbs()` constructs each
control and asks it what its action is called instead of reading a table someone
maintained by hand.

Inspecting the architecture is an application concern of this particular site,
which is why it is Gen 3. Gen 1 must never grow an inspection facility, and Gen 2
must never learn that generations exist.

---

## `src/app/`

| Module | Responsibility |
| --- | --- |
| `registerGen2.js` | Defines the fifteen library tags. Idempotent. |
| `registerGen3.js` | Defines the ten application tags. Idempotent. |
| `index-page.js` | Wires the public site; owns the `ShapeSpaceState` and the address bar. |
| `controls-page.js` | Drives the gallery. Imports Gen 2 only. |
| `three-gen-page.js` | Drives the reference page; computes the verdict. |

Registration lives here rather than in the library because deciding which tag
names a document uses is an application decision. Importing a control class never
mutates the global registry, which is what lets the tests construct controls in
isolation.

A page script connects objects. It owns shared state, routes events between
elements and owns the URL. It does not contain control behaviour and does not
build widget DOM. If a page script starts looking like a control, a Gen-3 class
is missing.

---

## Stylesheets

Layered like the source, and checked the same way.

| File | Layer |
| --- | --- |
| `assets/css/tokens.css` | Variables, reset, base typography. Light and dark. |
| `assets/css/controls.css` | Gen 2 only. May not contain `.shape-` selectors or application vocabulary. *Enforced.* |
| `assets/css/site.css` | Gen 3: layout, project identity, the gallery and reference pages. |

---

## Tests and tools

| Path | What it covers |
| --- | --- |
| `tests/gen1-contract.test.js` | The foundation's promises: abstractness, identity, build-once, listener release, reconnect, the action protocol. |
| `tests/gen2-library.test.js` | Invariants asserted for all fifteen controls at once. |
| `tests/gen2-behaviour.test.js` | What each control actually does, including DOM identity across updates. |
| `tests/gen2-independence.test.js` | A whole screen built from Gen 2 in a process where no application class exists. |
| `tests/gen3-architecture.test.js` | Lineages, binding rather than duplicating, and every application element's behaviour. |
| `tests/support-objects.test.js` | `ChildReconciler` and `HierarchyModel` directly. |
| `tests/page-index.test.js` | The real `index.html` markup with the real page script: every id resolves, elements upgrade, navigation moves the site. |
| `tests/page-controls.test.js` | The real gallery: every control has a specimen, the monitor records, the commands run, and no application element is ever defined. |
| `tests/page-three-gen.test.js` | The reference page's rendered lineages, tags, verbs and verdict, compared against the class objects themselves. |
| `tools/check-architecture.mjs` | Layering, markup, handlers, naming, vocabulary, barrels, globals, page references, stylesheet layering. |
| `tools/check-docs.mjs` | Documentation and source agreement, including the artifact inventory and the documented counts. |
| `tools/serve.mjs` | Dependency-free static server. |
