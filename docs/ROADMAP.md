# Roadmap

Work that is known to be worth doing, in rough order of value. Nothing here is
required for the repository to be correct; it is all improvement.

Anything that is a known *weakness* rather than a missing feature is in
[ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md) instead.

---

## Near term

**Replace the provisional content.** The ShapeScript and MBS++ sections are
outlines, and `CONTACT_ADDRESS` is a placeholder. Both are in
`src/gen3/data/projectSpace.js` and need no code change.

**Upgraded-property capture in Gen 1.** If a property is assigned to an element
before its definition is registered, the assignment lands on the instance and
shadows the class accessor, so the value is lost. The standard fix is to capture
and delete own properties on first connection. It is about fifteen lines and it
is genuinely universal, so Gen 1 is the right home. It was left out of the first
version to keep the foundation minimal; it should go in the next time Gen 1 is
opened.

**A focused keyboard test pass.** The composite controls have keyboard handling
and it is exercised, but the tests drive most interactions through the API. Tests
that dispatch real `KeyboardEvent`s across `ListBox`, `TreeView`, `TreeListView`
and `DataGrid` would protect behaviour that is easy to break silently.

**Scroll the active row into view.** `ListBox`, `TreeView`, `TreeListView` and
`DataGrid` move an active descendant with the arrow keys but never scroll it into
view, so long lists lose the user below the fold. One shared helper in
`src/gen2/support/dom.js`, called from the four move handlers.

---

## Medium term

**Decide what `ShapeBoard` should be.** It is the one Gen-3 class that contains
rendering rather than binding, because there is no generic graph control beneath
it. Either accept that graph drawing is project-specific work with nowhere lower
to live, or extract a Gen-2 `GraphView` and reduce `ShapeBoard` to a binding.
Finding 1 in the architecture review sets out both sides. Do not do this quietly:
it changes the shape of the library.

**A generic `Toolbar` or `TabStrip`.** The library has no control for a row of
commands or a set of views, and both are foundational. `TabStrip` is the stronger
candidate; its abstract action is honestly *activate*. This would take the library
to sixteen controls, so record the decision.

**Virtualise the long lists.** `ListBox`, `TreeView`, `TreeListView` and
`DataGrid` render every visible row. That is correct and fast enough for hundreds
of rows and wrong for tens of thousands. The reconciler is already keyed, so
windowing is an addition rather than a rewrite — but it interacts with the
active-descendant focus model, which is the part to think about first.

**Column resizing and reordering in `DataGrid` and `TreeListView`.** Both are
ordinary expectations of a grid and neither is present. Cells are already
reconciled by column key, so reordering is mostly a data change.

---

## Longer term

**A second application on the same library.** The strongest possible evidence for
Gen-2 independence is a second Gen 3 that shares nothing with this one. The
control gallery and the independence tests argue it; another application would
demonstrate it.

**Publish the library separately.** `src/gen1` and `src/gen2` are already a
standalone package: no dependencies, no build, no application knowledge. Splitting
them out would make the boundary a distribution boundary, which is the strongest
kind. It would also make the two-repository handoff problem real, which is worth
knowing about.

**Type declarations.** Hand-written `.d.ts` files, or JSDoc-driven generation.
The library is thoroughly annotated already; nothing would need to change in the
source.

**A check that reads the class comments.** The architecture check verifies that a
lineage line and an abstract-action section exist. It could verify that the
documented properties, methods and events are the ones the class actually
exposes, which would close the last gap between the documentation and the code.

---

## Explicitly not planned

**A build step.** Decision 14. The source being exactly what runs is part of the
argument.

**Shadow DOM.** Decision 2.

**A reactive rendering layer.** Decision 3. If Gen 1 acquires a scheduler, a
virtual DOM or a template system, the pattern has been replaced by a framework
and this document is out of date.

**Controls inheriting controls.** Decision 1. If this looks attractive, read the
decision first; it is the load-bearing constraint of the whole arrangement.
