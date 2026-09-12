# Architecture review

A deliberately hostile review of this repository, conducted before packaging,
against the fifteen questions in the brief. Findings that were fixed are marked
**fixed**; findings that were accepted are marked **accepted** with the reason.

Nothing here is softened. A review that finds nothing is a review that was not
performed.

---

## Measurements the review is based on

| Layer | Files | Total lines | Code lines |
| --- | --- | --- | --- |
| Gen 1 | 1 | 651 | 288 |
| Gen 2 | 15 controls + barrel | 8,646 | 5,218 |
| Gen 2 support | 4 modules | 968 | — |
| Gen 3 | 10 elements + state + data | 1,963 | 1,182 |
| `src/app` | 5 modules | 1,154 | 815 |

Gen 3 is 23% of Gen 2 by code. Gen 1 is 288 code lines, 56% of its file being
comments. Tests: 118, all passing. Architecture check: passing. Documentation
check: passing.

---

## 1. Did I invent complexity merely because I could?

**Mostly no, with one arguable member.**

`configure()` on Gen 1 is the weakest justification in the foundation. It is
ordinary property assignment with updates batched, and everything it does could
be done by the caller. It earns its place by making batched configuration the
obvious path and by throwing on an unknown key — which caught two real typos
during development — but a reviewer could reasonably call it a convenience that a
minimal foundation should not have.

The four support modules were each added to remove real duplication, not
speculatively. `ChildReconciler` is used by eight classes, `HierarchyModel` by
two, `navigation` by four, `dom` by all of them.

**Accepted.** `configure()` stays, recorded here as the most questionable
inhabitant of Gen 1.

## 2. Is Gen 1 really minimal?

**Yes, within the definition it states.** 288 code lines across five concerns,
with no networking, no storage, no history, no routing, no store and no
application knowledge. A test asserts the absence of all of those and fails if
the file passes 700 lines.

The honest caveat: "minimal" is being judged against the contract the file
declares, not against an abstract ideal. A stricter foundation could drop
`configure()`, `emit()` and `requestUpdate()` and expose only the lifecycle and
the action seam, at the cost of every control re-implementing three things.

## 3. Is any Gen-1 behaviour actually Gen-2 behaviour in disguise?

**One candidate, examined and cleared.** `requestUpdate()` / `syncElements()` is
a rendering seam, and rendering is Gen 2's job. But Gen 1 supplies only the seam
and the re-entrancy guard; it renders nothing, knows no markup and has no
scheduler. Remove it and every control invents its own update entry point with a
different name, which is precisely the drift the pattern exists to prevent.

**Accepted.** Recorded as decision 3, which is where a future session will look.

## 4. Are the Gen-2 controls truly useful?

**Yes.** Each is a working control with defaults, keyboard support, states and
events. The test that builds a complete screen — panel, form, five field types,
grid, meter, submission, sorting — in a process where no application class has
ever been loaded is the strongest evidence, because it would fail if any control
secretly depended on the application.

The weakest control by usefulness is `Label`. It is deliberately the smallest
thing in the library, and it is carrying a second job as the worked example.

## 5. Are any controls fake placeholders?

**No.** Every control has real behaviour and a real public API. The three that
would be easiest to fake are not faked: `TreeListView` is a genuine treegrid with
per-cell reconciliation and a configurable tree column; `DataGrid` sorts on a
copy with pluggable comparators; `Form` discovers fields by contract, aggregates
every validation failure and has a cancelable submit.

`StatusMeter` is the closest to ceremony, and only in its abstract action — see
finding 8.

## 6. Does Gen 3 mostly bind rather than duplicate?

**Yes, with one clear exception.**

Eight of the ten application elements are thin: they set project defaults, supply
project data and re-announce an inherited action in project vocabulary.
`ShapeBookshelf` is 140 lines and adds no behaviour at all beyond that.

**Finding 1 — `ShapeBoard` contains rendering, not binding.** At 449 lines it is
more than three times the median Gen-3 class, and most of that is SVG graph
drawing: node and edge construction, geometry, hit testing, keyboard activation.
It inherits its frame from `Panel` and builds everything else itself.

Two defensible readings:

- *It is correct.* The brief places graph logic explicitly in Gen 3 and forbids
  it in Gen 1. There is no generic graph control to bind to, so this is new
  application capability rather than duplicated generic capability. Nothing in
  `ShapeBoard` re-implements anything `Panel` already does.
- *It is a smell.* The general-purpose part — reconciled nodes and edges, a
  selection, a keyboard model — would be a perfectly good Gen-2 `GraphView`, and
  `ShapeBoard` would then be a fifty-line binding like its siblings.

**Accepted, and escalated.** The reading taken is the first, because the second
would add a sixteenth control to serve exactly one consumer, and a "generic"
control with one consumer is how generic layers acquire application assumptions.
It is listed in `docs/ROADMAP.md` as an explicit decision to revisit, so a later
session meets a question rather than an accident.

## 7. Did domain assumptions leak downward?

**No, and it is checked rather than asserted.** `tools/check-architecture.mjs`
scans all of Gen 1, Gen 2 and `controls.css` for *shape*, *ShapeScript*, *Kyle*,
*MBS*, *bookshelf*, *board* and *project space*, case-insensitively, comments
included. A test additionally asserts that no control renders those words.

**Fixed during review:** the check originally also forbade "Three-Gen", and
flagged Gen 1's own class comment. The rule was over-broad — Gen 1 and Gen 2
genuinely belong to the pattern — so the term was removed from the list and the
change recorded as decision 15. This is the one circumstance in which a rule
should be changed rather than obeyed, and it was changed on its own.

**Fixed during review:** two genuine leaks of the ordinary English word "shape"
in `TreeListView`'s comments, reworded to "structure".

## 8. Did I accidentally use generated markup?

**No.** Zero occurrences of `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
`document.write`, `DOMParser` or `createContextualFragment` in `src/`, and the
check also flags string literals containing element markup. SVG goes through
`createElementNS`. The check runs over every source file on every `npm run check`.

## 9. Did I use anonymous callbacks unnecessarily?

**No.** Zero arrow functions in `src/`. Every listener is a named method bound
once in a constructor and registered through `addManagedListener()`. The few
callbacks passed to `forEach` and `sort` are named function expressions, so a
stack trace names them.

**Accepted limitation:** the check is line-based. A handler defined across
several lines and passed anonymously would slip past it. Nothing in the
repository does that, but the guarantee is weaker than it looks.

## 10. Did I recreate DOM that should have retained identity?

**No, and this is the most thoroughly tested claim in the repository.** Tests
assert node identity survives: reconnection (all fifteen controls), item
replacement, reordering, sorting, tree expansion, column removal and section
changes. `ChildReconciler` moves nodes rather than recreating them, and
`attachParts` means updating a row never queries the DOM.

**Fixed during review — a real defect.** The text controls originally pushed the
committed value into the input on every synchronisation, guarded by
`document.activeElement !== input`. That guard was wrong: any unrelated update
while an uncommitted draft existed would silently discard what the user had
typed. It looked correct only because typing usually implies focus. A test caught
it. Both controls now track a dirty flag, which states the actual condition
rather than a proxy for it. Recorded as decision 12.

## 11. Are the events easy to understand?

**Mostly.**

**Finding 2 — `tg-change` is overloaded.** It means "the committed value changed"
on `TextBox`, `TextArea` and `CheckBox`, and "the selection changed" on
`ListBox`, `TreeView`, `DataGrid`, `RadioGroup` and `DropDown`. Both are "the
thing this control holds has changed", so the overload is coherent, but a
listener attached high in the tree must inspect the target to know which it has.
The alternative — `tg-selection-change` — would have been more precise and less
uniform.

**Accepted.** Documented per control in `docs/CONTROLS.md`. Changing it now would
be churn across fifteen controls for a small gain.

**Finding 3 — `tg-disconnected` does not bubble usefully.** It is dispatched from
`disconnectedCallback()`, by which time the element is already detached, so no
ancestor can hear it. Only a listener on the element itself sees it. This is
inherent to the DOM, not a defect, but the event's usefulness is narrower than
its sibling's. Noted in `docs/CONTROLS.md`; a test asserts the actual behaviour
so nobody later "fixes" it into something that looks like it works.

## 12. Could a fresh agent correctly continue this codebase?

**Probably, and the repository is arranged to find out.** `AGENTS.md` names four
documents in reading order, states the rules that break first, and gives
step-by-step recipes for the two common tasks, each step of which is enforced by
a check.

**Finding 4 — the checks can be defeated by an agent optimising for a green
command.** `npm run check` is the safety net, and an agent whose objective is
"make the command pass" could weaken a rule instead of fixing the code.
`AGENTS.md` and the header of `check-architecture.mjs` both forbid exactly that
and require a separate change with a decision record. Nothing enforces the
enforcement.

**Accepted as unavoidable.** Any check can be deleted by whoever can edit it. The
mitigation is that the prohibition is stated in the two places such an agent is
most likely to be reading at that moment.

## 13. Do documentation and source agree?

**Yes, and it is verified rather than believed.** `tools/check-docs.mjs`
enforces: every required document exists; every Gen-2 control has a section in
`docs/CONTROLS.md` naming its tag *and* its abstract action verb as the source
actually returns it; every class in `src/` is listed in `docs/ARCHITECTURE.md`;
the project's artifact inventory matches the source tree by name, generation and
file path; the orientation documents contain the phrases a fresh session needs;
and the counts claimed in prose — 15 controls, 10 elements, 118 tests — match
reality.

**Fixed during review:** the count claims were originally unverified prose. The
test-count check was added because a test count in two documents was exactly the
kind of number that silently becomes false.

**Fixed during review — the checks were themselves tested.** Deliberate
violations were injected and the results confirmed: generated markup, an inverted
Gen-2 → Gen-3 import, an anonymous listener, four vocabulary leaks, a global
assignment and a `var` were all caught, as were a missing barrel entry and a
wrong count. One check failed this exercise: the section test used a substring
search, so `## TreeListViewRenamed` was accepted as documentation for
`TreeListView`. It now matches the heading line exactly. A guardrail that has
never been seen to fail is not known to work.

**Accepted limitation:** the check verifies that a control's section exists and
names the right verb. It does not verify that every documented property still
exists. That gap is in `docs/ROADMAP.md`.

## 14. Does the control gallery honestly prove Gen-2 independence?

**Yes, in three independent ways.**

1. `src/app/controls-page.js` imports `registerGen2.js` and nothing else, and a
   check fails if it ever imports Gen 3.
2. `tests/gen2-independence.test.js` runs in its own process, asserts that no
   `shape-` tag is defined, and then builds a complete working screen.
3. A check verifies that no Gen-2 source file imports anything except Gen 1 and
   its own `support/` folder.

**Finding 5 — the gallery page shares the site's favicon.** `controls.html`
references `assets/img/shape-mark.svg`. That is a project asset on a page whose
argument is independence. It is defensible — the gallery is a page of this
website, not a separate distribution — but a strict reading would use a neutral
icon. The independence claim is about code dependency, and no code dependency
exists.

**Accepted.**

## 15. Does the website make the architecture credible?

**Largely yes.** The strongest move is `three-gen.html`, which derives every
structural claim at load time instead of transcribing it: lineages from prototype
chains, generations from inheritance distance, action verbs by constructing each
control and asking it, and a pass/fail verdict computed in the visitor's browser.
The page cannot describe an architecture the code does not have.

**Finding 6 — the site has not been verified in a real browser.** The tests run
in jsdom, which does no layout.

**Partly closed during review.** Three page tests were added that load each real
page's markup and run its real page script: every id the scripts reach for
resolves, every element upgrades and builds, navigation moves the reader and the
address bar, the gallery's monitor records what the specimens emit, and the
reference page's rendered lineages are compared against the class objects. That
covers the wiring failures a browser would have caught immediately.

**Still open: everything visual.** Responsive behaviour, the SVG board's
proportions, the dark palette, the sticky columns and the focus rings are
unverified by anything but reading. jsdom computes no layout, so no test in this
repository can see them. This remains the largest untested surface, and anyone
deploying should walk the three-page checklist in `docs/DEPLOY.md` first.

**Finding 7 — the bookshelf trades navigation semantics for control reuse.**
`ShapeBookshelf` extends `ListBox`, so the site's primary navigation is a
`role="listbox"` rather than a `nav` of links. It is keyboard accessible and
correctly labelled, but the items are not anchors: no middle-click, no
open-in-new-tab, no link affordances, and a screen reader hears a listbox where a
user might expect navigation. The architecture pulled the design here, which is
the failure mode a pattern-driven repository should be most suspicious of.

**Open.** Fixing it well probably means rendering anchors inside the list rows,
which `ListBox` does not currently support.

---

## Additional findings

**Finding 8 — `StatusMeter`'s abstract action is the weakest in the library.**
A meter reports; it does not obviously act. *Acknowledge* is a real operation
with a real gesture and a real effect, and the control was given a dismissible
message region so that the act has something to act on — but the honest reading
is that the seam was satisfied by designing the control to fit it, rather than
the seam being discovered in the control. This is the one place where the pattern
shaped a control instead of describing it. Documented in the class comment, in
`docs/CONTROLS.md` and as decision 4, rather than hidden.

**Finding 9 — validation plumbing is duplicated across six field controls.**
Each of `TextBox`, `TextArea`, `CheckBox`, `RadioGroup`, `DropDown` and `ListBox`
carries its own `#invalid`, `#validationMessage` and `setValidationMessage()`.
This is a direct consequence of the no-sibling-inheritance rule.

**Accepted.** The duplicated part is small — two fields and a seven-line method —
and each control's `validate()` is genuinely different. Extracting it would
create a base-class-shaped helper for very little, and the escape hatch is
already demonstrated three times where it pays.

**Fixed during review — keyboard index arithmetic was duplicated four times.**
`ListBox`, `TreeView`, `TreeListView` and `DataGrid` each carried an identical
thirty-line cursor computation. Extracted to `src/gen2/support/navigation.js` as
pure functions. This is what the sibling rule is supposed to produce, and having
three examples of it (`ChildReconciler`, `HierarchyModel`, `navigation`) makes
the intended response to the constraint unmistakable for a later session.

**Finding 10 — `probeActionVerbs()` has side effects on throwaway elements.**
The reference page constructs each control and calls `performAction()` to learn
its verb. Those elements are never connected, so most implementations return
early, but a couple mutate their own private state and dispatch an event on a
detached node before being discarded. No shared state is touched and nothing
listens.

**Accepted.** The alternative is a hand-maintained table of verbs, which is
exactly the drift the page exists to avoid. The trade is a documented side effect
on discarded objects against a page that cannot lie.

**Finding 11 — `Form.fields()` walks every descendant on every call.**
`querySelectorAll("*")` filtered by the field contract, re-run per call, with
`getValues()` and `validate()` each calling it. It is the only broad DOM query in
the library and it is O(descendants). For forms of realistic size this is
irrelevant; for a form inside a large grid it would not be.

**Accepted.** Caching would need invalidation on every DOM mutation, which is a
larger correctness risk than the cost it removes.

---

## Summary

| | Count |
| --- | --- |
| Real defects found and fixed | 1 (the discarded text draft) |
| Duplications found and removed | 1 (keyboard index arithmetic) |
| Over-broad rules corrected | 1 (the pattern name as forbidden vocabulary) |
| Vocabulary leaks corrected | 2 |
| Verification gaps closed | 2 (documented counts are now checked; the section check no longer accepts a near-miss heading) |
| Findings accepted with reasons | 7 |
| Findings left open | 3 (visual verification, bookshelf semantics, `ShapeBoard`'s size) |

The three open findings are the ones a reviewer should press on. The most
substantial is finding 6: after the page tests, everything in this repository is
tested except how it looks.
