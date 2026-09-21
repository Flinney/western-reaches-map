# Testing Patterns

**Analysis Date:** 2026-09-21

## Automated Test Suite

There is no automated test suite. There is no test runner, no test framework, no test files, and no CI pipeline. `CLAUDE.md` explicitly states: "There is no build step, package manager, or test suite."

Do not add a test runner configuration without broader project discussion. Any tests added would need to run without a package manager (e.g., a single browser-importable test script, or a minimal Node script using `node:test`).

## Manual Testing Surface

All verification is manual, using a browser against a static server.

### Running Locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

Opening `index.html` via `file://` will fail — the script uses ES modules (`<script type="module">`) and dynamic `import()`, which require HTTP. Any static file server rooted at the repo works.

### Test Scenarios

**1. Demo mode (unconfigured Firebase)**
- Remove or blank the `apiKey` in `firebase-config.js`, or set it to a `YOUR_...` placeholder.
- Expected: map loads under full fog, `#status` pill shows "Demo mode — add Firebase settings in firebase-config.js to go live", GM Login button is inert (shows flash instead of modal), no network requests to Firebase.

**2. Demo mode (Firebase CDN blocked)**
- With real config present, block `gstatic.com` in browser DevTools or hosts file.
- Expected: `initFirebase` catch fires, flash shows "Couldn't reach the live server — showing the map read-only", map still renders under fog.

**3. GM login flow**
- With real `firebaseConfig` and a real `GM_UID` in `firebase-config.js`, click "GM Login".
- Enter valid credentials → modal closes, button changes to "GM Mode", `#gmpill` shows on sign-in.
- Enter wrong credentials → `#loginerr` shows "Wrong email or password." inline in the modal.
- After sign-in with no POI seeded → `#seedrow` appears inside modal with the file picker.

**4. Fog reveal and hide**
- Sign in as GM, click "GM Mode" to enter GM mode (fog dims, `#gmpill` visible).
- Tap a fogged hex → `#info` panel opens, "Reveal hex" button present.
- Click "Reveal hex" → hex clears from fog immediately (optimistic), button changes to "Hide hex", state saves to Firestore.
- Click "Hide hex" → hex re-fogged immediately, state deleted from Firestore.
- Simulate a save failure (e.g., take the tab offline via DevTools after login) → optimistic state rolls back, flash shows "Couldn't save the change — check your connection".

**5. POI seed import via the modal file picker**
- After GM sign-in with no POI doc in Firestore, the seed row is visible in the modal.
- Select a valid `data/poi.json` file → flash shows "Imported N points of interest", seed row hides.
- Select an invalid (non-JSON) file → flash shows "That file isn't valid JSON".
- If Firestore write fails → flash shows "Import failed: [message]".

**6. Search**
- Type a 3-4 digit string → hex ID suggestion appears in `#results`.
- Type a POI name (GM only, requires `gmKey` loaded) → matching POI entries appear.
- Click a result → map centers on the hex, `#info` panel opens, `#results` hides.
- Click outside `#search` → `#results` hides.

**7. Pan, zoom, and tap**
- Drag to pan — `#viewport` cursor becomes `grabbing`, map translates.
- Scroll wheel or pinch → map zooms around the cursor/pinch center.
- Tap a hex (pointer travel < 6px) → `showInfo` fires for correct hex ID.
- Tap outside map bounds → no info panel.
- Zoom buttons (`+`, `−`, `Fit`) → zoom from viewport center; `Fit` resets to full-map view.

**8. Fast-travel reach highlight**
- Select a revealed hex that has revealed neighbours → gold-filled overlay polygons appear on all connected revealed hexes (BFS from `reachFrom`).
- Select a revealed hex with no revealed neighbours → info panel shows "No explored neighbours yet".
- Select an unrevealed hex → no reach overlay.

**9. Firestore live sync**
- Open the map in two browser tabs.
- Reveal a hex in one tab → the other tab updates fog in real time via `onSnapshot`.

## Highest-Risk Code Without Tests

The hex geometry functions (`GRID` constants, `centerFull`, `cD`, `pixelToHex`, `neighbours`, `hexId`, `parseId`) in `index.html` (lines 216–236) are the highest-risk code in the project and have zero automated coverage.

`pixelToHex` converts a clicked pixel coordinate to a hex column/row by inverting the affine mapping defined by `GRID.a`, `GRID.b`, `GRID.m`, `GRID.e`, `GRID.d`. These constants were calibrated against `assets/map.webp` — they are not derivable from first principles. A rounding or off-by-one error produces a misidentified hex with no obvious visual signal unless you know the expected answer.

`neighbours` converts from offset coordinates to cube coordinates and back; an error silently produces wrong adjacency, breaking the `reachFrom` BFS and fast-travel display.

If the project ever adds a test harness, these functions are the first priority. A headless Node test (no DOM needed — these are pure math functions) that asserts known `pixelToHex` round-trips and `neighbours` outputs for a handful of edge-case hexes (column 1, column 64, row 0, row 80, odd/even column parity) would catch the majority of geometry regressions.
