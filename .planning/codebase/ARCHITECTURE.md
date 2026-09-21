<!-- refreshed: 2026-09-21 -->
# Architecture

**Analysis Date:** 2026-09-21

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                    index.html  (single page)                     │
│   <head> CSS  +  HTML shell  +  <script type="module">           │
├──────────────────────────────────────────────────────────────────┤
│  Layer 1: Backend adapter        (lines ~180–213)                │
│  `Backend` object  ·  `initFirebase()`  ·  demo-mode fallback   │
├──────────────────────────────────────────────────────────────────┤
│  Layer 2: Hex geometry           (lines ~215–236)                │
│  `GRID`  ·  `centerFull`  ·  `cD`  ·  `pixelToHex`  ·  `neighbours` │
├──────────────────────────────────────────────────────────────────┤
│  Layer 3: SVG rendering + fog    (lines ~238–310)                │
│  `renderFog`  ·  `renderOverlay`  ·  `showInfo`  ·  `reachFrom` │
├──────────────────────────────────────────────────────────────────┤
│  Layer 4: Input / search / GM controls / boot  (lines ~312–387)  │
│  Pointer Events pan+zoom  ·  search  ·  GM auth  ·  `fit()`     │
└──────────────────────────────────────────────────────────────────┘
         │ Firestore snapshots              │ one-time GM upload
         ▼                                  ▼
┌──────────────────┐              ┌──────────────────────┐
│  Firestore       │              │  Firestore           │
│  `revealed/{id}` │              │  `meta/poi`          │
│  (live stream)   │              │  (GM-only read)      │
└──────────────────┘              └──────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `Backend` object | All Firebase operations; demo-mode fallback | `index.html` ~line 187 |
| `initFirebase()` | Lazy dynamic import of Firebase SDK from CDN | `index.html` ~line 203 |
| `GRID` + geometry functions | Pixel↔hex coordinate mapping | `index.html` ~line 216 |
| `renderFog()` | Rebuild SVG mask holes from `revealed` Set | `index.html` ~line 261 |
| `renderOverlay()` | Draw selection outline + fast-travel reach | `index.html` ~line 272 |
| `showInfo()` | Populate and show hex info panel | `index.html` ~line 277 |
| `reachFrom()` | BFS over `revealed` to find connected network | `index.html` ~line 270 |
| Pointer Event handlers | Pan + pinch-zoom via raw Pointer Events | `index.html` ~line 313 |
| Search handler | Hex ID and POI name lookup | `index.html` ~line 340 |
| GM auth + controls | Login modal, GM mode toggle, POI seeding | `index.html` ~line 353 |
| Boot sequence | `fit()` → `onRevealed` → `onGM` → `initFirebase()` | `index.html` ~line 382 |
| `firebase-config.js` | Firebase project config + `GM_UID` export | `firebase-config.js` |

## Pattern Overview

**Overall:** Single-page vanilla ES-module app, no framework, no build step.

**Key Characteristics:**
- Everything runs in one `<script type="module">` block inside `index.html`
- No bundler, no transpiler — served as static files directly to the browser
- Firebase SDK loaded via dynamic `import()` from the Firebase CDN at runtime
- All rendering is imperative DOM/SVG manipulation, no virtual DOM or reactivity library
- External module dependency is only `firebase-config.js` (same origin, ES module)

## Layers

**Layer 1 — Backend adapter:**
- Purpose: Isolate all Firebase/network calls behind a single object. Guarantee the rest of the app can run with zero network.
- Location: `index.html` ~lines 180–213
- Contains: `Backend` object, `attachRevealed()`, `attachGM()`, `initFirebase()`
- Depends on: `firebase-config.js` (imported at module load), Firebase CDN (loaded lazily)
- Used by: Layers 3 and 4 exclusively — no layer below Backend may call Firebase directly

**Layer 2 — Hex geometry:**
- Purpose: Convert between pixel coordinates on the drawn map and hex grid positions; compute neighbours.
- Location: `index.html` ~lines 215–236
- Contains: `GRID` (calibrated constants), `centerFull`, `cD`, `hexId`, `parseId`, `ptsD`, `pixelToHex`, `neighbours`
- Depends on: Nothing (pure math)
- Used by: Layers 3 and 4

**Layer 3 — SVG rendering + fog-of-war:**
- Purpose: Maintain the visual map state — fog mask, hex overlays, info panel.
- Location: `index.html` ~lines 238–310
- Contains: SVG element setup, `renderFog`, `renderOverlay`, `outline`, `showInfo`, `clearOverlay`, `reachFrom`, `toggleReveal`, `flash`
- Depends on: Layer 2 for geometry, Layer 1 for `Backend.reveal`/`Backend.hide`
- Used by: Layer 4 (triggers re-renders on state changes)

**Layer 4 — Input, search, GM controls, boot:**
- Purpose: Translate all user interactions into state changes and re-renders; initialise the app.
- Location: `index.html` ~lines 312–387
- Contains: Pointer Event pan/zoom, wheel zoom, `handleTap`, zoom buttons, `centerOn`, search input, GM login modal, GM mode toggle, `onGMChange`, boot sequence
- Depends on: All three layers above
- Used by: Nothing (top of call stack)

## State Model

Three sources of truth drive everything visible:

| Variable | Type | Source | Scope |
|----------|------|--------|-------|
| `revealed` | `Set<string>` | Firestore `revealed/` collection, live `onSnapshot` stream | Shared across all clients |
| `gmKey` | `Object<string, POI>` or `null` | Firestore `meta/poi`, fetched on GM sign-in | GM session only |
| `selected` | `string` or `null` | Local tap/search interaction | Local UI only |

Viewport transform (`scale`, `tx`, `ty`) is additional local state that controls the CSS transform on `#world` but has no effect on the data state.

Everything the user sees is a pure function of these three variables plus the viewport transform.

## Data Flow

### Revealed Hex Sync (Firestore → UI)

1. Boot: `Backend.onRevealed(cb)` registers a callback (`index.html` line 384)
2. `initFirebase()` completes → `attachRevealed()` calls `SDK.onSnapshot` on the `revealed` collection
3. Firestore pushes a snapshot (initial + every change) → callback fires with a new `Set` of hex IDs
4. `revealed` variable is replaced with the new Set
5. `renderFog()` runs: clears `maskHoles <g>`, appends one `<polygon>` per revealed hex as a black "hole" in the fog mask
6. If the info panel is open for a selected hex, `showInfo(selected)` re-runs to refresh state/reach text

### GM Reveal Action (UI → Firestore → back)

1. GM taps a hex → `handleTap` → `showInfo` → "Reveal hex" button appears
2. Button click → `toggleReveal(id)`: optimistically updates `revealed` Set, calls `renderFog()` + `renderOverlay()`, calls `Backend.reveal(id)` or `Backend.hide(id)`
3. If the Firestore write fails: rollback the optimistic update, re-render, `flash()` error message
4. If the write succeeds: Firestore `onSnapshot` fires and sets `revealed` to the authoritative server state (idempotent)

### Boot Sequence

```
fit()                          // set initial scale/translate so map fills viewport
Backend.onRevealed(cb)         // register snapshot callback (queued until Firebase ready)
Backend.onGM(cb)               // register auth-state callback
if (!Backend.configured) flash // show demo-mode notice
initFirebase()                 // async, non-blocking; fires attachRevealed + attachGM on success
                               // on failure: logs error, downgrades to demo mode, flashes notice
```

Firebase failure is a graceful downgrade, never a thrown exception reaching the user.

## Backend-Adapter / Demo-Mode Invariant

`Backend.configured` is `true` only when `firebaseConfig.apiKey` does not contain `"YOUR_"` (checked at module load in `index.html` line 184).

- If `configured` is `false` OR the CDN import fails: `Backend.onRevealed` immediately calls its callback with an empty Set; `Backend.onGM` calls its callback with `false`. The map renders read-only under full fog.
- If `configured` is `true` but CDN is blocked/offline: `initFirebase()` catches the error, sets `configured=false`, and calls `flash()` with a message. Same read-only result.
- **All future backend operations must go through `Backend`.** No code outside Layer 1 may call Firebase SDK methods directly. This is the single seam that makes offline/demo mode work transparently.

## Hex Coordinate System

Hex IDs are 4-character zero-padded strings in `CCRR` format: column (01–64) concatenated with row (00–80). Examples: `"0139"`, `"3952"`.

```
hexId(col, row) → "CCRR"   e.g. hexId(39, 52) → "3952"
parseId("3952") → [39, 52]
```

`GRID` holds calibrated pixel constants for the 9933×14043 source image:
- `GRID.a`, `GRID.b` — column pitch and origin offset (x-axis)
- `GRID.m`, `GRID.e`, `GRID.d` — row pitch, odd-column y-offset, origin offset (y-axis)
- `GRID.W`, `GRID.H` — hex bounding box in full-res pixels
- `GRID.fullW`, `GRID.fullH` — source image dimensions
- `GRID.colMin/Max`, `GRID.rowMin/Max` — valid grid bounds

The map is drawn at `DW=3200` × `DH=4524` pixels. Scale factor `K = DW / GRID.fullW`. All screen-space geometry uses `cD(col, row)` which multiplies full-res coordinates by `K`.

`pixelToHex(dx, dy)` converts a drawn-map pixel to a `[col, row]` pair by: computing an analytic column guess, then searching a 3×3 neighbourhood of `(col, row)` candidates for the closest hex centre. This brute-force search is needed because hex grids produce analytic rounding errors near edges.

`neighbours(id)` converts `CCRR` offset coordinates to cube coordinates, applies the six cube-direction vectors, converts back, and filters to grid bounds. This correctly handles the odd-column y-offset of this hex layout.

**Do not refactor or "clean up" `GRID` constants.** They are calibrated against `assets/map.webp` pixel measurements. Changing them breaks the hit detection.

## SVG Rendering

The fog layer uses a single SVG `<rect id="fog">` (full map size, dark fill) masked by an SVG `<mask id="fogmask">`:
- The mask contains a white background `<rect>` (makes everything opaque/hidden) plus a `<g id="maskHoles">`.
- `renderFog()` populates `maskHoles` with one black `<polygon>` per revealed hex. Black in a mask = transparent = hole in the fog.
- Fog opacity: `0.965` (player view) or `0.42` (GM dimmed view). Toggled by `gmbtn` click.

A separate `<g id="overlay">` sits above the fog rect. `renderOverlay()` clears and rebuilds it on every selection change:
- Fast-travel reach hexes: gold-tinted filled polygons (`rgba(192,138,52,0.22)`) with gold stroke, computed by `reachFrom(selected)` BFS
- Selected hex: red outline polygon only

`reachFrom(id)` is a BFS across the `revealed` Set using `neighbours()`. It returns the connected component of revealed hexes reachable from `id`. Size of that component minus 1 is the "fast-travel network" count shown in the info panel.

## Error Handling

**Strategy:** Silent graceful degradation with user-visible flash messages for recoverable errors.

**Patterns:**
- Firebase init failure: caught in `initFirebase()` try/catch; app continues in demo mode
- Firestore write failure: optimistic UI rollback + `flash()` message; `toggleReveal` catch handler
- GM login failure: error text displayed inline in modal (`#loginerr`)
- POI import failure: `flash()` message; JSON parse error caught explicitly
- No uncaught promise rejections in user paths

## Architectural Constraints

- **No build step:** The app must work when served as static files. No imports from `node_modules`.
- **Single file:** All JS logic lives in `index.html`. The empty `js/` directory is a placeholder.
- **Firebase CDN only:** Firebase modules are fetched from `https://www.gstatic.com/firebasejs/10.12.5/` at runtime. Pinned to version `10.12.5`.
- **No gesture library:** Pan and pinch-zoom are implemented directly on the Pointer Events API. Tap disambiguation uses a cumulative movement threshold of 6px (`moved < 6`).
- **Security model:** Firestore security rules are the actual access control. The client-side `isGM` flag only controls what the UI offers — it is not a security boundary.

---

*Architecture analysis: 2026-09-21*
