# LabScale

Browser-based data analysis and graphing workbench (labscale.org). Static files only: no framework, no bundler, no dependencies. Read `README.md` and `FEATURES.md` for the feature list.

## Files

- `index.html`: landing page with a canvas animation (0/1 streams turn into charts at a 2px "gate" line). `?scene=N` freezes a scene for testing.
- `app.html`: the workbench. `imprint.html`: imprint and privacy, English only, rendered from `js/legal.js`.
- `css/app.css`, `js/*.js`: the app. `build.py` inlines everything into `labscale-standalone.html`; run it after every change.
- `favicon.svg` is the source of the PNG icons (`favicon-32`, `apple-touch-icon`, `icon-192`, `icon-512`).

## Architecture rules

- Classic `<script>` tags, one shared global scope, **order matters**. The load order is the `<script>` list in `app.html`; new files go at the end (see `js/organize.js`, which overrides earlier functions on purpose).
- **Never reuse a global name.** Collisions have already caused bugs (`D2`, `optCol`, `wrapLines`). Grep before naming a top-level function or const.
- Overriding an earlier function: reassign it in a later file (`const o=fn; fn=function(){o();...}`). Top-level `const` cannot be reassigned.
- State lives in the global `P`. Call `snap()` before a change (undo), `dirty()` after (autosave). Set `histHint='Label'` first for a readable undo-history entry. Save/load goes through `ser()`/`deser()`; new persistent keys must be added to `EXTRA_DEF` in `app.js`.
- Windows are `sheet`, `graph`, `layout` and `note`, looked up with `winObj(t,id)`. A layout has `pages[]`; `L.items` is an accessor to the current page and is not serialised.
- Charts draw through a ctx abstraction (canvas, `PDFCtx`, `SVGCtx`) so PNG, PDF, SVG and EPS match. Chart types are in `gallery*.js` (`GX.<type>`).
- Menus: `popMenu(items,x,y)` where an item is `[label, hint, fn, submenu, icon]`; `['—']` is a separator.
- UI: top menu bar (`nav.js`), context bar per window (`#sbar` for sheets, `#gbar` for graphs), left tool strip `#tstrip`, right-click and ⋯ menus. There is no ribbon.
- Third-party scripts (SheetJS, Pyodide) load from CDNs only after `extConsent()`.

## Testing

Serve the folder (`python3 -m http.server 8765`) and open `app.html?sample=1`. No test suite: check in a browser, and use `node -e "new Function(require('fs').readFileSync('js/x.js','utf8'))"` for a quick syntax check.

## Constraints from the owner

- Everything is English. No German text anywhere.
- Footer shows only "Imprint" and "Privacy". Imprint contact block: bold **LabScale**, "c/o Andreas Dittes", Bautzener Str. 35, 10829 Berlin, labscale@dittes.info. Do not change it.
- The landing page accent colour must match the app blue (`#2563eb` light, `#5b9bff` dark).
- Do not mention or compare with other analysis products or vendors anywhere in the project (code, text, docs).
