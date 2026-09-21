# Technology Stack

**Analysis Date:** 2026-09-21

## Overview

This is a deliberately zero-build-toolchain app. There is no package.json, no bundler, no transpiler, no test framework, and no Node.js dependency. This is an intentional architectural choice documented in `CLAUDE.md`. Everything runs directly in the browser from two source files.

## Languages

**Primary:**
- HTML5 — `index.html` (the entire application: markup, styles, and all logic in one `<script type="module">`)
- Vanilla JavaScript (ES2020+ syntax) — inline module script at the bottom of `index.html`; also `firebase-config.js`

No TypeScript. No JSX. No compilation step.

## Runtime

**Environment:**
- Browser only. No Node.js runtime is involved at any point.
- The app cannot be opened via `file://` due to ES module semantics (`<script type="module">`); any static HTTP server works (e.g. `python3 -m http.server 8000`).

**Package Manager:**
- None. No lockfile. No `node_modules/`.

## Frameworks

None — deliberately. No UI framework, no routing library, no state management library, no gesture library. Every feature (pan, pinch-zoom, fog rendering, search, modal) is implemented in plain JS within `index.html`.

## Key Browser APIs Used

**SVG (inline, programmatically created):**
- Fog-of-war layer is a `<rect>` masked by an SVG `<mask>` element. Revealed hexes are `<polygon>` "holes" punched into the mask.
- Overlay layer (selection outline, fast-travel highlight) is a separate `<g>` rebuilt on each selection.
- All SVG elements are created via `document.createElementNS("http://www.w3.org/2000/svg", ...)` inside `index.html` around line 244.

**Pointer Events API:**
- Pan and pinch-zoom are implemented entirely with `pointerdown` / `pointermove` / `pointerup` / `pointercancel` and `setPointerCapture`. No external gesture library.
- `touch-action: none` on `#viewport` suppresses browser scroll interference.
- Tap detection is a heuristic: `moved < 6` pixels on `pointerup` for a single pointer.

**Dynamic `import()`:**
- Firebase SDK modules are loaded lazily via `import()` inside `initFirebase()` (`index.html` line 206). The dynamic import only fires when `firebaseConfig.apiKey` does not contain the `"YOUR_"` placeholder. This is what enables demo mode when Firebase is unconfigured.

**FileReader API:**
- Used in the GM seed-POI flow (`index.html` line 369) to read a local `data/poi.json` file chosen via `<input type="file">` and upload it to Firestore.

**CSS custom properties + `env()` safe-area insets:**
- The UI uses `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for notch/home-bar clearance on mobile (`index.html` lines 28, 57, 88).

## Fonts

**Google Fonts CDN (loaded in `<head>`):**
- `Cinzel` weights 500/600/700 — used for headings, coordinate labels, branding
- `Spectral` regular/medium/semibold (normal + italic) — used for body text, search, modals
- Preconnect hints to `https://fonts.googleapis.com` and `https://fonts.gstatic.com` for performance.

## Assets

- `assets/map.webp` — basemap image, drawn at 3200×4524 px (`DW`/`DH` in `index.html`). Full-resolution is 9933×14043; the scale factor `K = DW/GRID.fullW` links pixel coordinates to the calibrated hex grid.
- `data/poi.json` — gitignored spoiler data. Not served statically; loaded by the GM via file picker and uploaded to Firestore.

## Configuration

**Environment / secrets:**
- `.env` file exists (gitignored) — contents not inspected.
- `firebase-config.js` exports `firebaseConfig` (Firebase web app config object) and `GM_UID`. These are safe to commit (Firebase web config is public by design); `GM_UID` defaults to `"YOUR_GM_UID"` as a bootstrap placeholder.

**No build config files** — no `tsconfig.json`, no `vite.config.*`, no `webpack.config.*`, no `.eslintrc`, no `.prettierrc`.

## Deployment

No deployment configuration is present in the repository. The app assumes any static file server. Candidate platforms: any static host (Netlify, GitHub Pages, Firebase Hosting, Vercel, Caddy, nginx).

Minimum requirement: serve files over HTTP (not `file://`), with `firebase-config.js` accessible at the root alongside `index.html`.

---

*Stack analysis: 2026-09-21*
