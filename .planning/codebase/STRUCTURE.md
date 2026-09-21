<!-- refreshed: 2026-09-21 -->
# Structure

**Analysis Date:** 2026-09-21

## Repo Layout

```text
western-reaches-map/
├── index.html            # The entire application (HTML + CSS + JS module)
├── firebase-config.js    # Firebase web config + GM_UID constant (ES module)
├── assets/
│   └── map.webp          # 9933×14043 source basemap (drawn at 3200×4524)
├── data/
│   └── poi.json          # GITIGNORED spoiler key — one-time GM import to Firestore
├── js/                   # EMPTY — leftover scaffolding, not currently used
├── .env                  # 0B placeholder; gitignored
├── .gitignore
└── CLAUDE.md             # Onboarding notes for Claude Code sessions
```

Not present (deliberately): `package.json`, `node_modules/`, build config, lint config, test config, CI config. This is a static-site project.

## Where Each Concern Lives

There is only one code file. Concerns are located by section within `index.html`:

| Section | Approx. lines | What lives here |
|---------|---------------|-----------------|
| `<head>` + `<style>` | 3–110 | All CSS. Design tokens in `:root`, layout, `#modal`, responsive media query at `560px` |
| `<body>` HTML shell | 112–175 | `#app` layout, `#bar` (search + zoom + GM button), `#viewport` (map + overlays + `#info` + `#legend` + `#hint` + `#empty`), `#modal` (GM login) |
| `<script type="module">` open | 177–178 | Imports `firebaseConfig`, `GM_UID` from `./firebase-config.js` |
| **Layer 1 — Backend adapter** | ~180–213 | `Backend` object, `attachRevealed`, `attachGM`, `initFirebase` |
| **Layer 2 — Hex geometry** | ~215–236 | `GRID`, `centerFull`, `cD`, `hexId`, `parseId`, `ptsD`, `pixelToHex`, `neighbours` |
| **Layer 3 — SVG + rendering** | ~238–310 | SVG element setup, `mask`/`fog`/`overlay` refs, `renderFog`, `clearOverlay`, `outline`, `reachFrom`, `renderOverlay`, `showInfo`, `toggleReveal`, `flash` |
| **Layer 4 — Input / search / GM / boot** | ~312–387 | Pointer Event pan+pinch, `wheel`, zoom buttons, `handleTap`, `centerOn`, `#q` search, GM modal login, `onGMChange`, boot sequence (`fit()` → `Backend.onRevealed` → `Backend.onGM` → `initFirebase`) |

Each layer is separated by a banner comment (`/* ---------------- svg + view ---------------- */`). These banners are the file's table of contents — preserve them when editing.

## Key Files (in-depth)

### `index.html`
The entire app. Approximately 390 lines total. Structure inside is roughly: 110 lines of CSS, 65 lines of HTML shell, 215 lines of JS module. All rendering is imperative DOM/SVG manipulation.

### `firebase-config.js`
Two named exports: `firebaseConfig` (Firebase web app config object) and `GM_UID` (string). Documented in-file that these values are safe to commit; the real access control lives in Firestore security rules. `GM_UID = "YOUR_GM_UID"` is a deliberate bootstrap escape hatch — any authenticated user is treated as GM while the placeholder is in place.

### `assets/map.webp`
9933×14043 basemap, 3.5MB. `GRID.a`, `GRID.b`, `GRID.m`, `GRID.e`, `GRID.d` in `index.html` are calibrated pixel constants against this exact image. Swapping the image without recalibrating breaks hit detection.

### `data/poi.json`
Gitignored. Shape: `{ "hexes": { "CCRR": { name, terrain, region, type } } }`. Contains ~250 spoiler entries — the entire keyed content of the campaign map. In production this lives in Firestore at `meta/poi` and is fetched only after GM sign-in. The GM sign-in modal's file picker (`#seedfile`) is the only in-app way to upload a fresh copy.

### `js/`
Empty. Kept in git as scaffolding for a possible split-out of the inline module, but nothing lives here yet. Treat as unused.

### `.env`
0-byte placeholder. Gitignored per `.gitignore` line 8. Not currently used at runtime — Firebase config is in `firebase-config.js`, not `.env`.

## Naming Conventions

**Files:**
- kebab-case for multi-word (`firebase-config.js`, `map.webp`)
- lowercase single word for the entrypoint (`index.html`)

**HTML IDs:**
- Short lowercase, no separators for atomic elements (`#bar`, `#modal`, `#info`, `#fit`, `#zin`, `#zout`, `#q`)
- Compound IDs use kebab-case (`#gmpill`, `#gmbtn`, `#seedrow`, `#seedfile`)
- Info panel sub-elements use hyphen-prefix (`#i-coord`, `#i-badge`, `#i-state`, `#i-poi`, `#i-ft`, `#i-act`)

**CSS classes:**
- Single-word lowercase for utilities (`.btn`, `.grow`, `.on`, `.show`)
- Compound in kebab-case where needed (`.e-title`, `.e-sub`)
- BEM-adjacent nested selectors (`#info .row b`, `#modal .actions .go`)

**JavaScript variables:**
- Terse camelCase throughout (`gmMode`, `pendingRevealed`, `panStart`, `pinchStart`)
- Hex IDs are strings, always 4-char zero-padded `CCRR` — never numeric
- DOM refs cached as `var` at module top (`svg`, `world`, `vp`, `info`, `basemap`)
- Callback fns named after the change (`onGMChange`), event handlers as `handleTap`/`endPointer`

**CSS custom properties (design tokens):**
- Semantic naming in `:root` (`--paper`, `--ink`, `--gold`, `--red`, `--fog`, `--shadow`, `--line`)
- Variants get suffixes (`--paper-edge`, `--ink-soft`, `--gold-soft`)

## Data Locations

| Data | Where | Notes |
|------|-------|-------|
| Fog reveal state | Firestore `revealed/{hexId}` — one doc per revealed hex | Live-streamed to all clients via `onSnapshot` |
| POI spoiler key | Firestore `meta/poi` — single doc with `{ hexes: {...} }` | Read only when GM signs in |
| GM identity | Firebase Auth (email/password) | Client checks against `GM_UID` |
| Local POI seed source | `data/poi.json` (gitignored) | One-time upload via GM modal `#seedfile` |
| Basemap image | `assets/map.webp` | Served statically |
| Firebase config | `firebase-config.js` | Committed; not a secret |

## Where to Add New Code

- **New Firebase call:** extend the `Backend` object (Layer 1). Never call the SDK directly from Layer 2/3/4. Preserve the "no network needed to render" invariant.
- **New hex math:** add to Layer 2. Keep it pure — no DOM access. If you touch `GRID`, recalibrate against `assets/map.webp`.
- **New overlay type:** extend `renderOverlay()` in Layer 3. Clear+rebuild is the pattern; don't accumulate stale nodes.
- **New user gesture:** extend the pointer handlers in Layer 4. Preserve the `moved < 6` tap threshold semantics.
- **New CSS token:** add to `:root` in the `<style>` block, then reference via `var(--name)`. Avoid hard-coded colours.
- **New file:** you may add to `js/` if splitting the module becomes worthwhile — but currently every module boundary is inside `index.html`.

## Deployment Layout

The app is served as static files from any HTTP static server. Required paths in the served tree:
- `/index.html`
- `/firebase-config.js`
- `/assets/map.webp`

Not required in the served tree: `data/poi.json` (should never be served — it's the spoiler key, and in production it's uploaded to Firestore instead).

Opening `index.html` via `file://` fails: the entry point uses ES modules (`<script type="module">` + dynamic `import()`), which require an HTTP origin.

---

*Structure analysis: 2026-09-21*
