# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page hex-map viewer for the Shadowdark "Western Reaches" campaign. Players see a fog-of-war base map; a signed-in Game Master reveals hexes and the reveal state is shared live to all viewers via Firestore.

## Running / developing

There is no build step, package manager, or test suite. The app is one HTML file plus one JS config file, loaded directly by the browser.

- Serve locally with any static server rooted at the repo, e.g. `python3 -m http.server 8000` then open `http://localhost:8000/`. Opening `index.html` via `file://` will fail because `index.html` uses ES modules (`<script type="module">`) and dynamic `import()`.
- `firebase-config.js` is committed with real (non-secret) Firebase web-app config; `GM_UID` is intentionally left as the placeholder `"YOUR_GM_UID"`. While it is a placeholder, **any** signed-in user is treated as GM (see `attachGM` in `index.html`) — this is a deliberate bootstrap escape hatch for the first POI import, not a bug.
- `data/poi.json` is gitignored — it's the spoiler key of what each hex contains. In production it lives in Firestore at `meta/poi` and is fetched only after GM sign-in. A local copy is used one-time via the GM sign-in modal's file picker to seed Firestore (`Backend.seedPOI`).

## Architecture

Everything lives inline in `index.html` inside a single `<script type="module">`. Four concerns are stacked in that script, in this order:

1. **Backend adapter** (`Backend` object). Wraps Firestore + Auth so the rest of the code never touches the SDK directly. Firebase is imported *dynamically* only when `firebaseConfig.apiKey` looks real — a blocked CDN, missing config, or offline user falls through to demo mode with the map still rendering read-only under full fog. Any code that adds a backend call should extend `Backend` and preserve this "renders with no network" invariant.
2. **Hex geometry** (`GRID`, `centerFull`, `cD`, `pixelToHex`, `neighbours`). The map image is `9933×14043` full-res but drawn at `3200×4524` (`DW`/`DH`); `K = DW/GRID.fullW` is the scale factor. `GRID.a/b/m/e/d` are **calibrated constants** matching pixel coordinates to the printed hex grid — do not "clean up" or refactor these numbers without recalibrating against `assets/map.webp`. `neighbours()` uses cube coordinates for odd-column offset hexes. Hex IDs are 4-char zero-padded `CCRR` strings (column, row).
3. **SVG rendering** (`renderFog`, `renderOverlay`, `showInfo`). The fog is one big rect with an SVG mask; revealed hexes are polygon "holes" in the mask. Overlays (selection outline + fast-travel reach highlight) live in a separate `<g>` that is cleared and rebuilt on each selection. `reachFrom()` is a BFS over `revealed` — this is what "fast-travel network" means in the UI.
4. **Input, search, GM controls, boot**. Pointer events implement pan + pinch-zoom manually (no external gesture lib); wheel and buttons feed the same `zoomAt`. GM login uses a modal; toggling GM mode just dims the fog (`opacity 0.42` vs `0.965`) — it doesn't change which hexes are revealed.

State model: three sources of truth. `revealed` (Set of hex IDs, live-synced from Firestore `revealed/` collection). `gmKey` (POI dict, present only when signed in as GM). `selected` (currently focused hex ID, purely local UI). Everything the user sees is a function of those three plus `scale`/`tx`/`ty` for the viewport transform.

## Firebase data shape

- `revealed/{hexId}` — one doc per revealed hex, value `{ t: <ms> }`. `onSnapshot` streams this collection to every client; the doc *existing* is the fact.
- `meta/poi` — single doc, `{ hexes: { "CCRR": { name, terrain, region, type }, ... } }`. Read only by authenticated users. Seeding this doc is a one-time GM action via the sign-in modal's file picker.

Security rules are enforced server-side in Firebase — do not add client-side "GM guards" as a substitute. The `isGM` flag only controls what the UI *offers*.
