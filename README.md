# Shape Project Space

A public website, a reusable vanilla-JavaScript control library, and a working
reference implementation of the **Three-Gen Design Pattern** — in one repository,
with no build step, no framework and no runtime dependencies.

The site is the evidence. Every element on every page is an instance of the
architecture the site describes.

```
HTMLElement
    ↓
AbstractElement          Gen 1   abstract foundation, one class
    ↓
15 generic controls      Gen 2   the reusable library
    ↓
10 application elements  Gen 3   Shape Project Space itself
```

Dependency runs one way: **Gen 3 → Gen 2 → Gen 1 → HTMLElement.** Nothing points
back, and `npm run check` fails if anything tries.

---

## Run it

```sh
npm install       # jsdom, for the tests only; the site itself has no dependencies
npm run serve     # http://localhost:8080/
npm run check     # architecture rules, documentation agreement, 118 tests
```

ES modules do not load from `file://` in most browsers, so open the site through
`npm run serve` rather than by double-clicking the HTML.

## The three pages

| Page | What it is | What it proves |
| --- | --- | --- |
| `index.html` | The public site. | Gen 3 is enough to build a real site. |
| `controls.html` | The Gen-2 gallery, with a live event monitor. | Gen 2 works with no application present. |
| `three-gen.html` | The pattern reference. | The documentation and the runtime agree. |

`controls.html` registers the generic library and imports nothing from `src/gen3`.
`three-gen.html` reads the real class objects at load time: lineages come from
prototype chains, generations from inheritance distance, and each control's
abstract action verb from asking the control. The page cannot describe an
architecture the code does not have.

## Layout

```
src/
    gen1/AbstractElement.js      identity, lifecycle, owned DOM, managed events, the action seam
    gen2/                        15 controls + support/ (four modules they share)
    gen3/                        10 application elements + data/ + ShapeSpaceState
    app/                         registration and one script per page
assets/css/                      tokens.css, controls.css (Gen 2), site.css (Gen 3)
tools/                           check-architecture.mjs, check-docs.mjs, serve.mjs, package-zip.mjs
tests/                           118 tests, run with node:test and jsdom
docs/                            the documents listed below
```

## The short version of the rules

- **No generated markup.** No `innerHTML`, no `insertAdjacentHTML`, no markup
  strings. The DOM is an object graph; build it with `createElement`.
- **Build once, update in place.** A control constructs its DOM on first
  connection, keeps named references to it, and afterwards modifies those nodes.
- **Named handlers.** Listeners are named methods bound once, registered through
  `addManagedListener()`, released automatically on disconnect.
- **One event system.** DOM `CustomEvent`, prefixed `tg-` for the library and
  `shape-` for the application. There is no second mechanism.
- **No global state.** The one shared store is constructed by a page and handed
  to whoever needs it.
- **Gen 2 controls do not import each other.** They compose in a page.

The full set is in [CODING-STANDARDS.md](CODING-STANDARDS.md), and most of it is
enforced by `npm run check`.

## Documents

| Document | Read it when |
| --- | --- |
| [AGENTS.md](AGENTS.md) | **Before changing anything.** Required reading, in order. |
| [CODING-STANDARDS.md](CODING-STANDARDS.md) | Writing any code in `src/`. |
| [docs/THREE-GEN.md](docs/THREE-GEN.md) | Understanding the pattern itself. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Finding out what exists and where. |
| [docs/CONTROLS.md](docs/CONTROLS.md) | Using or extending a Gen-2 control. |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Wondering why something is the way it is. |
| [docs/HANDOFF.md](docs/HANDOFF.md) | Starting a session. Current state, in one page. |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Looking for the next piece of work. |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Publishing the site. |
| [docs/AI-COLLABORATION.md](docs/AI-COLLABORATION.md) | Asking why the repository is shaped like this. |
| [docs/ARCHITECTURE-REVIEW.md](docs/ARCHITECTURE-REVIEW.md) | Looking for the known weaknesses. They are written down. |

## Why the pattern exists

Architecture is the part of software that decays quietly. Nothing breaks; the
boundaries just stop meaning anything, one expedient change at a time. That is
true of human teams and much more true of independent AI sessions, which arrive
with no memory and re-derive whatever the repository does not state plainly.

So the boundaries here are not described, they are **structural**: a folder is a
permission set, a base class is a generation, a naming prefix is a layer, and a
crossed boundary fails a check before anybody has to notice it in review.

That argument is made at length in [docs/AI-COLLABORATION.md](docs/AI-COLLABORATION.md),
and the places where it does not yet hold are listed honestly in
[docs/ARCHITECTURE-REVIEW.md](docs/ARCHITECTURE-REVIEW.md).
