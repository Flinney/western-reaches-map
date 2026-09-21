<!-- refreshed: 2026-09-21 -->
# Concerns

**Analysis Date:** 2026-09-21

Tech debt, fragile areas, security posture, and things a future contributor should be aware of. Verified against source at date above. Severity: **High** = ship-blocker before public share, **Medium** = plan work, **Low** = document/keep-in-mind.

## Security

### S1. `GM_UID` placeholder = anyone-can-write bootstrap  **[High if shared publicly]**
- **Where:** `firebase-config.js:33` (`export const GM_UID = "YOUR_GM_UID";`), consumed at `index.html` `attachGM` (line ~202).
- **What:** While `GM_UID` contains the substring `"YOUR_"`, `attachGM` treats *any* signed-in user as GM. This is intentional so the first GM can import `data/poi.json` before knowing their own UID.
- **Why it matters:** If the site is shared before locking `GM_UID` to a real Auth UID, anyone who registers an account (assuming Auth allows sign-up) becomes GM — they can reveal/hide arbitrary hexes and overwrite `meta/poi`. This is a live footgun documented in the file itself, but easy to forget.
- **Companion concern:** `isGM` is a client-side UI flag only. The *real* access control must live in Firestore Security Rules. This repo does not contain rules — confirm strict rules exist on the Firebase project before public share.

### S2. Committed Firebase web config  **[Low — informational]**
- **Where:** `firebase-config.js:20-26`.
- **What:** Real `apiKey`, `authDomain`, `projectId`, etc. are committed to the repo.
- **Why it matters:** This is documented in-file as safe (Firebase web config is public by design; security is enforced by Firestore rules). A reviewer new to Firebase might flag this as a leak — worth calling out. Not a real risk.

### S3. No `robots.txt` / no OpenGraph / no meta description  **[Low]**
- **Where:** `index.html` `<head>` (lines 3–110).
- **What:** No indexing directives, no share preview metadata.
- **Why it matters:** Fine while the URL is unlisted. If the site is ever posted publicly, decide whether to allow indexing and add OG tags for share previews.

## Fragility

### F1. Hard-coded pixel calibration constants  **[Medium]**
- **Where:** `index.html:217` — `GRID = { a: 142.88..., b: 485.68..., m: 174.42..., e: 87.38..., d: 316.35..., W: 190.50..., H: 174.42..., fullW: 9933, fullH: 14043, ... }`.
- **What:** These constants are calibrated to the specific `assets/map.webp` file. `pixelToHex` and `centerFull` depend on them exactly.
- **Why it matters:** Replacing the basemap image will silently break hit detection — the app will still run but clicks will land on the wrong hex. There is no runtime sanity check (e.g., "the map image's natural dimensions match `fullW`/`fullH`"). If the map ever changes, recalibrate.
- **Risk multiplier:** No tests cover this. See TESTING.md — `pixelToHex` is the highest-risk untested code.

### F2. Firebase SDK version pinned in a hard-coded URL  **[Medium]**
- **Where:** `index.html:205` — `var base="https://www.gstatic.com/firebasejs/10.12.5/";`
- **What:** Three dynamic imports (`firebase-app.js`, `firebase-firestore.js`, `firebase-auth.js`) are pinned to `10.12.5`.
- **Why it matters:** When 10.12.5 eventually rots (Firebase deprecates old SDKs on a schedule), upgrading requires manually editing the URL and re-verifying the destructured module surface (`fsMod.collection`, `fsMod.onSnapshot`, `authMod.signInWithEmailAndPassword`, etc.). No CI signal will alert you when this breaks.

### F3. POI seed import is a one-shot modal-only flow  **[Medium]**
- **Where:** `index.html:368` — `#seedfile` `onchange` handler; only rendered when `onGMChange` runs on sign-in and `Backend.getPOI()` returns `null`.
- **What:** The only in-app path to seed `meta/poi` is: sign in as GM → the "one-time setup" file input appears → pick a JSON file. If the operator dismisses the modal without importing, or Firestore rejects the write, there is no re-open UI. The GM has to sign out and back in to see the seed row again, and only if `getPOI()` still returns nothing.
- **Why it matters:** Losing this flow means signed-in GMs have no POI names — every info panel shows only a hex ID. Documented in CLAUDE.md but easy to hit accidentally.

## Coupling

### C1. Everything in one HTML file  **[Medium]**
- **Where:** `index.html` (~390 lines: ~110 CSS + ~65 HTML + ~215 JS).
- **What:** CSS, HTML shell, Backend adapter, hex math, SVG rendering, and input handling all coexist in a single file.
- **Why it matters:** Editing one concern (say, adding a new gesture) risks accidental scope creep across layers. Refactoring to split into `js/` modules requires re-testing fog rendering + pan/zoom + POI seed + GM login — none of which have automated coverage.
- **Note:** The empty `js/` directory suggests a split was considered. See STRUCTURE.md.

### C2. Empty `js/` directory  **[Low — housekeeping]**
- **Where:** `js/` at repo root, tracked but empty.
- **What:** Committed but contains no files.
- **Why it matters:** Either dead scaffolding or an aborted refactor. New contributors will wonder if they're missing files. Either populate it or remove it.

## Performance

### P1. Full fog re-render on every reveal toggle  **[Low at current scale]**
- **Where:** `index.html:261` — `renderFog()`.
- **What:** Clears `maskHoles` and rebuilds one `<polygon>` per revealed hex on *every* reveal state change (including full-collection Firestore snapshots on boot).
- **Why it matters:** Fine at the current ~250 keyed hexes and typical reveal counts. If the map is scaled up (multiple campaigns, larger grid), this becomes O(revealed) per snapshot event — could visibly stutter above a few thousand hexes.

### P2. Full overlay rebuild on every selection  **[Low]**
- **Where:** `index.html:266` — `clearOverlay` + `renderOverlay`.
- **What:** Similar clear-and-rebuild pattern for the selection outline + fast-travel reach highlights.
- **Why it matters:** Cheap at current scale; called only on selection change.

### P3. BFS over the entire `revealed` Set per selection  **[Low]**
- **Where:** `index.html:270` — `reachFrom(id)`.
- **What:** Every `showInfo` call runs a BFS from the selected hex over all revealed hexes to compute the fast-travel network size.
- **Why it matters:** O(revealed) per selection. Fine now; would want memoisation if revealed count grows.

## Accessibility

### A1. No keyboard navigation for the map  **[Medium if accessibility is a requirement]**
- **Where:** Pan/zoom/tap only via Pointer Events (`index.html:314+`).
- **What:** No keyboard shortcuts to pan, zoom, jump to hex, cycle through revealed hexes, or open the info panel.
- **Why it matters:** Users on keyboards or assistive tech can't drive the map. The search input works with keyboard, but map interaction does not.

### A2. GM login modal is not keyboard-trappable  **[Medium if accessibility is a requirement]**
- **Where:** `index.html:157-175` (`#modal`) and its open/close handlers.
- **What:** Modal doesn't trap focus, doesn't set `aria-modal`, `role="dialog"`, or `aria-labelledby`, and Escape doesn't close it.
- **Why it matters:** Screen-reader users can tab out of the modal into the underlying map controls while it's open.

### A3. Minimal ARIA  **[Low]**
- **Where:** Only one `aria-label` in the file (`#infoclose`). No landmarks, no live region for `#status`/`flash()`, no descriptive labels on the zoom buttons beyond `title` attrs.
- **Why it matters:** Reveal/hide actions announce nothing to assistive tech. Consider `role="status"` on `#status` and `aria-live="polite"` if accessibility matters.

## Data Model

### D1. No audit trail on `revealed/`  **[Low unless multi-party]**
- **Where:** Firestore `revealed/{hexId}` docs — shape is only `{ t: <ms> }`.
- **What:** No `by` field (which GM revealed it), no `session` field, no `party` field.
- **Why it matters:** If multi-party campaigns become a use case (parallel adventuring groups on the same map, or wanting to know when/who), the current schema doesn't support it. Would need a schema migration.

### D2. `data/poi.json` gitignored, undocumented in-repo  **[Low]**
- **Where:** `.gitignore:1-3`, referenced by `index.html:171`.
- **What:** The file exists locally, not in git. This is deliberate (spoiler protection) but confusing for a fresh checkout.
- **Why it matters:** `CLAUDE.md` documents it; a new contributor without that doc will see references to `data/poi.json` throughout the code, find nothing there, and be confused. Not a bug — a documentation load-bearing point.

## Ops

### O1. No CI, no linter, no test suite  **[Medium — accept-or-plan]**
- **Where:** Absent. See TESTING.md.
- **What:** There is no automated verification. All testing is manual: serve, click around, verify Firestore reads/writes.
- **Why it matters:** Refactors and dependency bumps are riskier than they should be, and `GRID` calibration + reveal/hide state machine are the highest-value tests you don't have. Consider: a minimal Playwright smoke test that boots the app, taps a hex, verifies the info panel opens.

### O2. No hosting/deployment automation documented  **[Low]**
- **Where:** No `firebase.json`, no GitHub Actions, no README (removed in commit `0659b7d`).
- **What:** How the app gets from a git commit to a live URL is not in the repo.
- **Why it matters:** New contributor / future-you will have to figure out where the site is hosted and how to push updates. Consider a one-line note in CLAUDE.md or a `deploy/` doc.

## Responsive

### R1. Legend and hint disappear on narrow screens  **[Low — intentional]**
- **Where:** `index.html:109` — `@media (max-width:560px){ #brand .s{display:none} #legend{display:none} #hint{display:none} }`.
- **What:** The fast-travel colour legend, the "drag to pan…" hint, and the brand subtitle are hidden on phones.
- **Why it matters:** Not a bug — a deliberate space tradeoff. Just be aware that mobile users don't get the same visual key.

---

*Concerns analysis: 2026-09-21*
