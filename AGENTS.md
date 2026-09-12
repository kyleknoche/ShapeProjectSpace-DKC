# AGENTS.md

Instructions for any agent or developer modifying this repository.

You are reading this because you have no memory of the sessions that built this
code. That is the expected condition, and the repository is arranged so that you
do not need one. Read the four documents below and you will know as much about
the architecture as the session that wrote it.

---

## Read before you modify anything

In this order. It takes about ten minutes.

1. **`docs/HANDOFF.md`** — the current state in one page. Where things stand,
   what is unfinished, what to be careful of. Always read this first; it is the
   most likely to have changed.
2. **`docs/THREE-GEN.md`** — the pattern. Three generations, the dependency
   direction, what each generation may and may not own.
3. **`CODING-STANDARDS.md`** — the hard rules. Most of them are enforced, and the
   enforcement will find you.
4. **`docs/DECISIONS.md`** — why things are the way they are. If you are about to
   change something that looks odd, the reason is probably here.

Then, depending on what you are doing:

- adding or changing a control → `docs/CONTROLS.md`
- looking for what exists → `docs/ARCHITECTURE.md`
- looking for work → `docs/ROADMAP.md`
- wondering what is already known to be weak → `docs/ARCHITECTURE-REVIEW.md`

---

## Validate before you finish

```sh
npm run check
```

That runs three things, and all three must pass:

| Command | What it does |
| --- | --- |
| `node tools/check-architecture.mjs` | Layering, markup rules, handler rules, naming, vocabulary. |
| `node tools/check-docs.mjs` | The documentation still matches the source tree. |
| `node --test tests/**/*.test.js` | 118 tests of the pattern, not only the syntax. |

**Do not disable a check because your change fails it.** The checks encode
decisions that were made deliberately. If you believe a rule is genuinely wrong:
change it on its own, record why in `docs/DECISIONS.md`, and say so in
`docs/HANDOFF.md`. Never weaken a rule in the same change as the code that
violates it — that is exactly the move the checks exist to catch.

---

## The rules that matter most

These are the ones that get broken first when work is going quickly.

**Dependency direction.** Gen 3 → Gen 2 → Gen 1 → HTMLElement. Never the other
way. A Gen-2 control may not import another Gen-2 control either; controls
compose in a page, not inside each other.

**No generated markup.** No `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
`document.write`, `DOMParser`, or strings containing tags. Build the DOM with
`document.createElement` and `append`.

**Build once.** `buildElements()` runs on first connection and never again.
Register every important node with `defineElement(name, node)` and reach it
later with `getElement(name)`. Never re-query your own component for a node you
created, and never rebuild a component because its configuration changed.

**Named handlers.** Bind them once in the constructor
(`this.handleThing = this.handleThing.bind(this)`) and register them with
`addManagedListener()`. Anonymous callbacks are a checked violation.

**No application vocabulary below Gen 3.** The words *shape*, *Kyle*, *MBS*,
*ShapeScript*, *bookshelf*, *board* and *project space* must not appear anywhere
in `src/gen1`, `src/gen2` or `assets/css/controls.css` — including comments. The
check is case-insensitive and word-boundaried, so avoid the ordinary English word
"shape" in generic code too. Say "structure" or "form".

**The abstract action.** Every concrete class implements `abstractAction()`. The
Gen-1 constructor refuses to build one that does not. Public callers use
`performAction()`, which owns the `tg-action` event; implementations must not
dispatch it themselves.

---

## Adding a Gen-2 control

Copy the shape of an existing one. `Label.js` is the smallest complete example;
`ListBox.js` is the fullest.

1. `src/gen2/YourControl.js`, exporting `class YourControl extends AbstractElement`.
   The file name must equal the class name.
2. `static elementName = "tg-your-control";`
3. Implement `buildElements()`, `bindEvents()`, `syncElements()`, `abstractAction()`.
4. A class comment stating `Lineage:`, the attributes, properties, methods,
   events, and what its **Abstract action** means. The checks require the first
   and last of those.
5. Add it to `GEN2_CONTROLS` in `src/gen2/index.js`.
6. Add a `## YourControl` section to `docs/CONTROLS.md` naming the tag and the
   action verb.
7. Add a row to `ARTIFACTS` in `src/gen3/data/projectSpace.js`.
8. Add a specimen panel to `controls.html`.
9. Name it in `docs/ARCHITECTURE.md`.
10. `npm run check`.

Steps 5 to 9 are all enforced. If you skip one, the build tells you which.

## Adding a Gen-3 element

1. `src/gen3/ShapeYourThing.js`, extending the Gen-2 control closest to what you
   need. Never extend `AbstractElement` directly from Gen 3.
2. `static elementName = "shape-your-thing";`
3. Override hooks by **extending**, not replacing: call `super.buildElements()`,
   `super.syncElements()`, `super.bindEvents()` and, where you extend the seam,
   `super.abstractAction(payload)`. This is checked.
4. Bind, do not rebuild. If you find yourself writing list rendering, tree
   flattening or validation in Gen 3, the behaviour belongs in Gen 2.
5. Register it in `GEN3_ELEMENTS`, add it to `ARTIFACTS` and to
   `docs/ARCHITECTURE.md`.

## Editing the site's words

Section copy lives in `src/gen3/data/projectSpace.js`. Editing a heading or a
paragraph there needs no code change. Changing the *shape of those objects* does,
because the Gen-3 elements read specific fields.

---

## Before you end a session

Update `docs/HANDOFF.md`. Keep it short enough that it stays true: what changed,
what is in flight, what the next session should know. A handoff document that
tries to be complete becomes a document nobody trusts.

If you made an architectural decision, add it to `docs/DECISIONS.md` with its
reason. The reason is the part that matters; a later session can argue with a
reason, but it can only guess at a bare result.
