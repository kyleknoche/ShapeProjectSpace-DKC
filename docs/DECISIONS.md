# Decisions

Architectural decisions and the reasons for them.

The reason is the part that matters. A later session can argue with a reason; it
can only guess at a bare result, and guessing is how architecture gets undone.

If you change one of these, edit the entry rather than deleting it, and note the
change in `docs/HANDOFF.md`.

---

## 1. Exactly three generations, and Gen-2 controls do not inherit each other

**Context.** `TreeView` and `TreeListView` share real logic. The obvious move is
`TreeListView extends TreeView`.

**Decision.** Refused. Every concrete control extends `AbstractElement` directly.
A Gen-2 control may not even *import* another Gen-2 control. Logic that two
controls genuinely share lives in a plain object in `src/gen2/support/`.

**Why.** A control inheriting a control puts its Gen-3 specialisation four steps
below the foundation, and the pattern quietly becomes Four-Gen. Depth is the
thing being controlled here; once "just one more level" is acceptable once, there
is no principled place to stop. The flat generation is also what makes the
library's shape learnable: fifteen files that all look the same.

**Consequences.** `HierarchyModel` exists and is used by both tree controls.
`Form` builds plain `<button>` elements instead of importing `Button`, so using a
form never drags in a registration you did not ask for. Enforced by
`tools/check-architecture.mjs`.

---

## 2. Light DOM, not Shadow DOM

**Context.** Custom elements can encapsulate their internals in a shadow root.

**Decision.** Every control renders into the light DOM and is styled by one
authored stylesheet.

**Why.** Encapsulation is not the problem this repository is solving. Legibility
is. A reader can inspect any control in devtools and see its real structure, one
stylesheet describes the whole library, and Gen 3 can restyle a control without
piercing anything. Shadow DOM would also complicate form participation, label
association and `aria-activedescendant`, all for isolation nobody here needs.

**Consequences.** Class names are namespaced by convention (`tg-`, `shape-`)
rather than by the platform, and that convention is checked.

---

## 3. The update seam is synchronous

**Context.** Most component systems batch updates into a microtask or an
animation frame.

**Decision.** `requestUpdate()` calls `syncElements()` immediately, guarded
against re-entry.

**Why.** An asynchronous scheduler would make Gen 1 a rendering framework, which
is exactly what it must not become. It would also hide the cause of a repaint
from the stack trace and force every test to await a microtask. Updates are cheap
here because `syncElements()` mutates stable nodes instead of building new ones —
the cost that batching exists to amortise has already been removed by design.

**Consequences.** `configure()` suspends updates so a batch of property
assignments produces one synchronisation. Setting ten properties one at a time
runs ten cheap syncs, which is acceptable and measurable.

---

## 4. The abstract action: `performAction()` public, `abstractAction()` abstract

**Context.** Gen 1 must establish an operation that Gen 2 supplies meaning for,
and it must not be decorative.

**Decision.** Two methods. `performAction(payload)` is public and final in
practice: it calls `abstractAction()`, normalises the result to
`{ action, handled, source, detail }`, and emits `tg-action`.
`abstractAction(payload)` is abstract, must be implemented, and must not dispatch
that event itself. The Gen-1 constructor refuses to build a subclass that has not
implemented it.

**Why.** Splitting the protocol from the meaning makes the seam load-bearing
rather than ceremonial. Every user gesture in Gen 2 routes through
`performAction()`, and so does every programmatic call, so there is exactly one
path into "the thing this control does" — which is what makes a click and an API
call produce the same events, and what lets Gen 3 extend an act by calling
`super.abstractAction()`.

`handled: false` is part of the contract: it means the control understood and
declined, as opposed to failing.

**The honest difficulty.** Not every foundational control has an obvious act.
`StatusMeter` mostly reports. The options were to force a ceremonial method, to
exempt some controls, or to find a real act. We found a real one — *acknowledge*:
take notice of the current status and, when dismissible, clear it. It has a real
effect and a real gesture behind it. `Label`'s *activate* is the same kind of
answer: a label really does focus what it is for.

We considered renaming the seam to `act()` or `primaryAction()` and kept
`abstractAction()`, because the name states plainly that the method is the
abstract point of the pattern.

---

## 5. The image control is called `ImageView`

**Decision.** The class is `ImageView` in `ImageView.js`; the tag is still
`tg-image`.

**Why.** `Image` is a global constructor in every browser. A module writing
`import { Image } from "…"` shadows it silently, and the failure surfaces
somewhere else entirely. The file-name-equals-class-name rule then forces the
file name too.

---

## 6. Keyed reconciliation instead of re-rendering

**Context.** Every list, tree and grid needs to reflect changing data.

**Decision.** `ChildReconciler` reuses child nodes by key, moves them into order,
and removes only what is gone. Rows carry a `tgParts` record (via `attachParts`)
so updating one never queries the DOM.

**Why.** The naive implementation clears the container and rebuilds, which
destroys focus, scroll position, selection state held on the node, in-flight
transitions and any reference another object was holding. "Update stable objects"
is a coding standard here, and a shared reconciler is what makes obeying it
easier than disobeying it.

**Consequences.** Duplicate keys throw rather than rendering something wrong.
Tests assert node identity across reorders, filters, column changes and
expansions.

---

## 7. Registration lives in `src/app`, not in the library

**Decision.** Importing a control class has no side effect. `registerGen2Controls()`
and `registerGen3Elements()` define the tags.

**Why.** Which tag names a document uses is an application decision. It also lets
the tests construct classes without touching the global registry, and it is what
makes `controls.html` able to register Gen 2 alone — the evidence that the
generic layer stands by itself.

---

## 8. The field contract is duck-typed, not registered

**Decision.** `Form` treats any descendant exposing `isFieldControl`, `name`,
`formValue`, `validate()` and `setValidationMessage()` as a field.

**Why.** A registry would mean `Form` importing every field control, which
decision 1 forbids. Duck typing keeps `Form` dependency-free and lets a control
from outside this library take part. Ownership is still unambiguous: a field
belongs to the nearest ancestor that reports `isFormControl`.

---

## 9. Wrap native controls rather than rebuilding them

**Decision.** `TextBox`, `TextArea`, `CheckBox`, `RadioGroup`, `DropDown` and
`Button` wrap real `input`, `textarea`, `select` and `button` elements.

**Why.** Autofill, input methods, mobile keyboards, native pickers, typed
navigation, the indeterminate checkbox visual and assistive technology support
are all free and all hard to reproduce. The composite controls — `ListBox`,
`TreeView`, `TreeListView`, `DataGrid` — have no native equivalent, so they
implement roles and keyboard support themselves.

---

## 10. Shared state is an object a page hands out

**Decision.** `ShapeSpaceState` extends `EventTarget`. A page constructs one and
passes it explicitly. There is no module-level instance and no global.

**Why.** "No hidden global state" is only real if there is an obvious alternative.
Using DOM events rather than a bespoke observer keeps the repository to one
notification mechanism, which means a subscriber can use
`addManagedListener()` and be unsubscribed by the ordinary lifecycle. Assignment
to `window`, `globalThis` and `self` is checked.

---

## 11. Composite controls keep focus on one container

**Decision.** `ListBox`, `TreeView`, `TreeListView` and `DataGrid` are focusable
as a whole and name the current row with `aria-activedescendant`. Rows are never
individually focused.

**Why.** With a roving `tabindex`, a data update that removes the focused row
drops focus to the body and the user loses their place. With an active
descendant, reconciliation can do anything it likes and focus stays put. It also
means the reconciler and the focus model cannot interfere with each other.

---

## 12. A committed value and a draft are different things

**Context.** An early version of the text controls pushed the committed value
into the input during every synchronisation, guarded by a check on
`document.activeElement`.

**Decision.** Each text control tracks whether the input is dirty. A
synchronisation writes the value into the input only when the user has not typed
since the last commit.

**Why.** The `activeElement` guard was wrong, and a test caught it: any unrelated
update while an uncommitted draft existed would silently discard what the user
had typed. It only looked correct because typing usually implies focus. The
dirty flag states the actual condition instead of a proxy for it, and it does not
depend on focus at all — which also makes it testable.

---

## 13. The reference page computes; it does not transcribe

**Decision.** `three-gen.html` derives every structural claim at load time:
lineages from prototype chains, generations from inheritance distance, action
verbs by constructing each control and asking it, and the verdict by checking
every application element.

**Why.** A hand-written diagram drifts the first time somebody changes a base
class, and the page then asserts something false in public underneath an argument
about architectural integrity. The rule "the page must not lie" is only reliable
if the page has nothing written down to be wrong about.

---

## 14. No runtime dependencies, one dev dependency

**Decision.** The site ships nothing but its own source. `jsdom` is a dev
dependency used by the tests. There is no build step, bundler or transpiler.

**Why.** The repository is an argument about architecture surviving unattended
change. A toolchain is another thing that can rot. It also means what you read in
`src/` is exactly what the browser runs, which matters when the source is the
evidence.

---

## 15. The pattern's name is not application vocabulary

**Context.** The vocabulary check initially forbade "Three-Gen" in Gen 1 and
Gen 2, and flagged the foundation's own class comment.

**Decision.** Removed "Three-Gen" from the forbidden-term list. "Shape", "Kyle",
"MBS", "ShapeScript", "bookshelf", "board" and "project space" remain.

**Why.** The rule exists to stop *one application's* vocabulary reaching the
generic layers. Gen 1 and Gen 2 genuinely belong to the Three-Gen pattern and
should be able to say so. The rule was over-broad, not the code — which is the
one circumstance in which a rule should be changed rather than obeyed, and it was
changed on its own with this entry as the record.

---

## 16. Allman braces, explicit comparisons, plain loops

**Decision.** Allman brace style, four spaces, `=== true` rather than truthiness,
plain `for` loops in library code, no dense chaining.

**Why.** House style, chosen for debuggability. Braces on their own lines make
breakpoints land where you expect. Explicit comparisons say which of several
falsy values was meant. Plain loops step cleanly. This project prefers
debuggability to brevity, and a consistent style is also a strong instruction to
a later session about what its code should look like.

---

## 17. The first exposure and the working surface are separate pages

**Context.** The original interaction mockup is the intended entrance to Shape
Project Space: a photographic bookshelf above Kyle and Shape facing each other
across a game board. The Three-Gen working surface is denser and proves the
architecture, but it explains the project before a visitor has encountered it.

**Decision.** `index.html` is the first-exposure experience. The complete
Three-Gen application remains intact at `workspace.html`, with the control
gallery and computed pattern reference beside it.

**Why.** The entrance and the evidence do different jobs. Keeping them separate
preserves the original visual identity without flattening the working
architecture or pretending that a documentation surface is the same thing as a
first encounter.
