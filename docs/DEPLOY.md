# Deploying

The site is static. There is no build step, no bundler and no server-side code.
What is in the repository is what the browser runs.

---

## What gets deployed

```
index.html            the public site
controls.html         the Gen-2 gallery
three-gen.html        the pattern reference
src/                  ES modules, served as-is
assets/               css/ and img/
```

Everything else — `tests/`, `tools/`, `docs/`, `package.json`, `node_modules/` —
is development material and does not need to be published. Publishing it is
harmless; the repository is meant to be read.

## Local

```sh
npm run serve         # http://localhost:8080/
PORT=3000 npm run serve
```

`tools/serve.mjs` is a dependency-free static server with the right media types
and no caching. **Opening the HTML files directly from disk will not work**: ES
modules are blocked over `file://` in every major browser. That is the single
most likely first-run problem.

## Any static host

Upload the repository root. No configuration is required beyond the defaults.

- **GitHub Pages** — push, then enable Pages for the branch root. It is already
  arranged correctly: `index.html` at the top, relative paths everywhere.
- **Netlify / Cloudflare Pages / Vercel** — no build command, publish directory
  `.`.
- **Apache / nginx / IIS** — serve the directory. Ensure `.js` is sent as
  `text/javascript`; a module served as `text/plain` is refused by the browser,
  and that is the second most likely first-run problem.

Serve over HTTPS. Nothing here requires it, but a page that argues for rigour
should not be delivered over plaintext.

## Paths

Every reference is relative, so the site works from a subdirectory
(`example.com/project-space/`) without changes. If you move a page out of the
root, `tools/check-architecture.mjs` will tell you: it resolves every `src` and
`href` in every page and fails on one that does not exist.

## Before publishing

```sh
npm run check
```

All three parts must pass. Then, in a browser:

1. `index.html` — the bookshelf navigates, the board responds to clicks and
   `Enter`, the mark loads, the inventory sorts, the contact form validates.
2. `controls.html` — every specimen renders, the event monitor fills as you
   interact, and the demonstration buttons work.
3. `three-gen.html` — the verdict reads "No violations", and the lineage view
   fills.

Then check the browser console. It should be empty; `console.log` in `src/` is a
checked violation, so anything there is a real error.

## Content that is provisional

Two things are deliberately placeholders and should be replaced before this is
presented as a finished public site:

- **`CONTACT_ADDRESS`** in `src/gen3/data/projectSpace.js` is a documented
  placeholder, not a real address.
- The **ShapeScript** and **MBS++** sections are marked provisional in their own
  copy.

Both live in `src/gen3/data/projectSpace.js` and need no code change to edit.

## Browser support

Modern evergreen browsers. The site uses ES modules, custom elements, private
class fields, CSS custom properties and `:focus-visible` — all baseline for
several years. There is no transpilation and no polyfill, by decision 14.

`field-sizing: content` is used for the auto-growing text area and degrades to a
fixed-height text area where it is unsupported.
