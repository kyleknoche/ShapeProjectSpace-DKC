# Handoff

The current operational state of this repository, in one page.

Read this first. Keep it short when you update it — a handoff document that tries
to be complete becomes a document nobody trusts.

**Last updated:** 2026-09-12
**Last session:** initial construction and the first architecture review.

---

## State

Complete and green. Everything described in the documentation exists and works.

```sh
npm install       # jsdom only
npm run check     # architecture + documentation + 118 tests
npm run serve     # http://localhost:8080/
```

| Check | Result |
| --- | --- |
| `tools/check-architecture.mjs` | Pass. 40 source files, 0 violations. |
| `tools/check-docs.mjs` | Pass. 1 Gen-1 class, 15 Gen-2 controls, 11 Gen-3 classes. |
| `node --test` | Pass. 118 of 118. |

## What exists

- **Gen 1** — `AbstractElement`. 288 code lines, five concerns, no application
  knowledge.
- **Gen 2** — 15 controls: `Label`, `TextBox`, `TextArea`, `Button`, `CheckBox`,
  `RadioGroup`, `DropDown`, `ListBox`, `TreeView`, `TreeListView`, `ImageView`,
  `Panel`, `Form`, `DataGrid`, `StatusMeter`. Plus four support modules:
  `dom`, `ChildReconciler`, `HierarchyModel`, `navigation`.
- **Gen 3** — 10 elements, `ShapeSpaceState`, and two data modules.
- **Pages** — `index.html`, `controls.html`, `three-gen.html`.

## What to be careful of

**Do not make `TreeListView` extend `TreeView`.** It looks like an oversight. It
is decision 1, and it is the load-bearing constraint of the whole arrangement.
Read it before touching either file.

**Do not weaken a check to make a change pass.** If a rule is genuinely wrong,
change it alone and record why. Decision 15 is the worked example of doing that
properly.

**The text controls track a draft separately from the committed value.** If you
touch `syncElements()` in `TextBox` or `TextArea`, read decision 12 first; the
obvious simplification there is a bug that was already made once.

**The reference page computes, it does not transcribe.** Nothing on
`three-gen.html` is written down twice. If you find yourself adding a table of
class names to it, stop.

## Known open items

Three findings from `docs/ARCHITECTURE-REVIEW.md` are open, and they are the
honest weak points:

1. **Nothing visual has been verified.** Three page tests load each real page and
   run its real script, so the wiring is covered. But jsdom computes no layout,
   so the responsive behaviour, the board's proportions, the dark palette and the
   focus rings are unverified by anything but reading. Walk the checklist in
   `docs/DEPLOY.md` before publishing.
2. **The bookshelf is a listbox, not a set of links.** Keyboard accessible and
   labelled, but no middle-click and no open-in-new-tab. The architecture pulled
   the design, which is worth being uncomfortable about.
3. **`ShapeBoard` is 449 lines and contains rendering rather than binding.**
   Defensible — there is no generic graph control to bind to — but it is the one
   Gen-3 class that does not look like its siblings. The decision to revisit it
   is in `docs/ROADMAP.md`.

## Provisional content

Two things are deliberate placeholders and should be replaced before this is
presented as a finished public site. Both are in
`src/gen3/data/projectSpace.js` and need no code change:

- `CONTACT_ADDRESS` is a placeholder, not a real address.
- The **ShapeScript** and **MBS++** sections are outlines, and say so in their own
  copy.

## Suggested next work

In order, from `docs/ROADMAP.md`:

1. Replace the provisional copy and the contact address.
2. Add upgraded-property capture to Gen 1 — about fifteen lines, genuinely
   universal, left out to keep the first version minimal.
3. Scroll the active row into view in the four cursor controls.
4. Decide what `ShapeBoard` should be, deliberately rather than by drift.

## Before you end your session

Update this file: what changed, what is in flight, what the next session should
know. Add any architectural decision to `docs/DECISIONS.md` **with its reason**.
Run `npm run check` and leave it green.
