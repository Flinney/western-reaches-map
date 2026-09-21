# Coding Conventions

**Analysis Date:** 2026-09-21

## No Build Tooling

There is no bundler, no compiler, no linter, no formatter config, no TypeScript, and no package manager. The app is two files: `index.html` and `firebase-config.js`. All application logic is a single `<script type="module">` block inside `index.html`. Do not introduce a build step, tsconfig, or linter config.

## Variable Declarations

Use `var` throughout. There is no `let` or `const` anywhere in the script. Preserve this when touching any code in `index.html`.

## Indentation and Line Density

2-space indent. Style is deliberately compact — multiple independent statements are joined on the same line with `;`. This is intentional, not an accident:

```js
var scale=0.3, tx=0, ty=0, minS=0.1, maxS=3.4;
function apply(){ world.style.transform="translate("+tx+"px,"+ty+"px) scale("+scale+")"; }
function fit(){ var w=vp.clientWidth, h=vp.clientHeight; if(!w||!h){ setTimeout(fit,60); return; }
  scale=Math.min(w/DW,h/DH)*0.98; minS=scale*0.85; tx=(w-DW*scale)/2; ty=(h-DH*scale)/2; apply(); }
```

Do not "clean up" multi-statement lines by splitting them unless a line exceeds a clear readability threshold.

## Identifier Names

Terse, single-letter or two-letter names are the convention for locals and short-lived values. Examples in active use: `c`, `r`, `id`, `cr`, `p`, `hw`, `qw`, `hh`, `K`, `DW`, `DH`, `WD`, `HD`, `vp`, `FB`, `op`, `f`, `v`. Module-level DOM refs and state vars use short but readable names (`revealed`, `selected`, `gmKey`, `gmMode`, `isGM`, `overlay`, `maskHoles`). Constants for the SVG namespace use ALLCAPS: `SVGNS`.

## Function Declaration Style

Functions are declared with the `function name(){...}` syntax, not arrow-function assignments. Callbacks inside method calls use `function(arg){...}` anonymous form:

```js
function renderFog(){ ... }
Backend.onRevealed(function(s){ revealed=s; renderFog(); ... });
```

## File Structure — Banner Comments as Table of Contents

There is no JSDoc and no top-of-file documentation. The script is organized into four sections, each preceded by a banner comment that acts as the file's table of contents:

```js
/* ---------------- backend (Firebase, loaded lazily) ---------------- */
/* ---------------- calibrated hex grid ---------------- */
/* ---------------- svg + view ---------------- */
/* ---------------- pan / zoom / tap ---------------- */
/* ---------------- search ---------------- */
/* ---------------- GM auth + controls ---------------- */
/* ---------------- boot ---------------- */
```

New code sections must follow this banner pattern. Do not add JSDoc or module-level prose; use a banner comment to name the concern.

## DOM Lookups and Handler Attachment

DOM elements are looked up once at module top (or at the start of their section) and stored in `var` refs. Subsequent code uses the stored ref, never a repeated `getElementById` call in a hot path.

Event handlers on buttons and form controls are attached via `elem.onclick = function(){...}`. Use `addEventListener` only where passive/capture flags are required — this is done for `pointer*` events and `wheel`:

```js
// onclick pattern — used for buttons, close handlers, search results
document.getElementById("infoclose").onclick = function(){ ... };
document.getElementById("zin").onclick = function(){ ... };

// addEventListener — used where flags matter
vp.addEventListener("pointerdown", function(e){ ... });
vp.addEventListener("wheel", function(e){ ... }, {passive:false});
```

## Backend Adapter Rule

All Firestore and Firebase Auth calls go through the `Backend` object defined in `index.html`. No code outside `Backend` (and its two private helpers `attachRevealed` and `attachGM`) touches the Firebase SDK directly. This is a hard architectural boundary.

The `Backend` object handles the offline/demo-mode case: every method returns a rejected Promise or invokes the callback with a safe default when Firebase is not loaded. Any new backend operation must be added as a method on `Backend` and must preserve the "renders with no network" invariant — the map must remain functional read-only even if `initFirebase` fails.

## Error Handling and User Feedback

**Never throw for user-visible flows.** The error handling philosophy is:

1. **Degrade to demo mode** on Firebase load/init failure — the map still renders read-only under full fog. See `initFirebase` catch block.
2. **Optimistic local state** is applied immediately on GM actions; on backend rejection, the state is rolled back and `flash()` is called. See `toggleReveal`.
3. **`flash(msg)`** is the only mechanism for surfacing errors to the user. It shows a transient status pill (`#status`) for 2800 ms. Messages are short human sentences, not error codes.
4. **`console.warn` / `console.error`** are used for developer signal (sync errors, Firebase failures) and never shown to the user.

```js
// Correct error-handling pattern (from toggleReveal)
op.catch(function(e){
  if(willReveal) revealed.delete(id); else revealed.add(id);
  renderFog(); renderOverlay();
  flash("Couldn't save the change — check your connection");
  console.warn(e);
});
```

Do not introduce modal dialogs, `alert()`, or thrown exceptions in user-facing flows.

## CSS System

All CSS lives in the `<style>` block inside `index.html`. There are no external stylesheets, no CSS modules, and no utility-class framework.

**Design tokens** are defined as custom properties on `:root`:

```css
:root{
  --table:#221b12; --paper:#efe6cf; --paper-edge:#d8c7a0;
  --ink:#33261a; --ink-soft:#6f5c44; --line:#c3ad84;
  --gold:#c08a34; --gold-soft:#e6c583; --red:#a23a22; --fog:#1c1710;
  --shadow:0 6px 22px rgba(0,0,0,.45); color-scheme:dark;
}
```

New colors or spacing values must be added as custom properties here, not hardcoded inline. Existing inline hex literals in CSS rules (`#1c1710`, `#23180a`, etc.) are acceptable where they are specific to a single element; recurring values belong in `:root`.

**Selectors** are id-based and BEM-adjacent, using descendant selectors to scope component internals:

```css
#info .row b { ... }
#modal .actions .go { ... }
#info .act .reveal { ... }
```

Class names on elements are short and semantic (`.btn`, `.on`, `.show`, `.grow`, `.co`, `.nm`, `.meta`, `.ft`, `.act`, `.k`, `.sw`). The `.show` / `hidden` attribute pattern controls visibility: `hidden` attribute for structural hide, `.show` class + CSS `opacity`/`transform` for animated show/hide.

## CDN and External Dependencies

Google Fonts (Cinzel, Spectral) and the Firebase SDK (loaded from `gstatic.com`) are the only external network dependencies. The app must render without either — fonts fall back to `Georgia, serif` and `serif`; Firebase failure triggers demo mode. Do not add new external script or stylesheet dependencies.

## Gitignore Policy

`data/poi.json` is gitignored — it is the spoiler key of what each hex contains. This data lives in Firestore behind GM-only security rules; a local copy is used only for the one-time seed import. Never commit this file. OS/editor cruft (`.DS_Store`, `Thumbs.db`, `*.swp`, `.vscode/`, `node_modules/`) and `.env` are also excluded.
