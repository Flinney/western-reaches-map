# Western Reaches Map — Playable MVP

## Current State

**Shipped:** v1.0 MVP (2026-09-22) — 20/20 v1 requirements verified end-to-end on the deployed GH Pages URL against MacBook Chrome + Pixel 8 Pro Chrome. The app is now usable at a live Shadowdark session.

- Live URL: `https://flinney.github.io/western-reaches-map/`
- Deploy loop: GitHub Actions publishes `main` → GH Pages on every push (no manual steps).
- Local dev: `python3 -m http.server 8000` renders the basemap under full fog with no Firebase credentials required — demo-mode invariant preserved.
- Codebase: 436 lines in `index.html` + 33 lines in `firebase-config.js` + `.github/workflows/pages.yml` — still the deliberate zero-toolchain single-file design.

## What This Is

A single-page fog-of-war hex map for the Shadowdark "Western Reaches" tabletop campaign. The GM signs in and reveals hexes on their device; every player at the table sees the map update live in their browser on phone, tablet, or laptop within ~1 second. As of v1.0, this works end-to-end: map alignment, hex interaction, cross-device live sync, navigation, search, and GM Mode all verified against the deployed URL.

## Core Value

**At a live Shadowdark session, the GM taps a hex on their device and every player — on whatever device they brought — sees it appear on their map within a second, reliably.** Verified in v1.0; still the ONE thing that has to keep working.

## Requirements

### Validated

<!-- Capabilities present and verified against the deployed URL. -->

**Pre-existing (preserved through v1.0):**

- ✓ SVG-based hex rendering with fog-of-war mask (revealed hexes are polygon holes) — existing, preserved
- ✓ Calibrated hex grid geometry mapping `assets/map.webp` (9933×14043) to a drawn 3200×4524 canvas — `GRID.d` recalibrated in Phase 2 (`316.35 → 198.97`) to eliminate a residual uniform half-hex Y offset; all other `GRID` fields untouched
- ✓ Backend adapter isolating Firebase, with a demo-mode fallback so the app renders under full fog with no network — invariant preserved through every phase
- ✓ Firebase Auth (email/password) GM sign-in flow — works once credentials are configured
- ✓ Firestore `revealed/{hexId}` collection design with `onSnapshot` streaming — verified live in Phase 3
- ✓ One-time GM POI seeding path (upload local `data/poi.json` into `meta/poi`) — existing
- ✓ Codebase mapped in `.planning/codebase/` (ARCHITECTURE, STACK, STRUCTURE, CONVENTIONS, INTEGRATIONS, TESTING, CONCERNS)

**Shipped in v1.0 (fix-MVP):**

- ✓ Map fits the viewport correctly on the deployed GitHub Pages URL, phone/tablet/laptop, portrait & landscape — v1.0 (LAYOUT-01, LAYOUT-02, Phase 2)
- ✓ SVG overlay pixel-aligned with basemap image at every zoom level and after every pan — v1.0 (LAYOUT-03, Phase 2)
- ✓ Initial load centers and fully shows the map without user pan/zoom — v1.0 (LAYOUT-04, Phase 2)
- ✓ Tap/click reliably opens the info panel for the correct hex on touch and mouse — v1.0 (HEX-01, Phase 2)
- ✓ Fast-travel gold highlight renders on connected revealed neighbours when a revealed hex is selected — v1.0 (HEX-02, Phase 2)
- ✓ Red selection outline stacks over the gold fast-travel highlight — v1.0 (HEX-03, Phase 2)
- ✓ Reveal / Hide button toggles both local fog and Firestore doc — v1.0 (HEX-04, Phase 2, fixed via `#info,#gmpill` pointer-capture guard)
- ✓ GM reveal on device A → all other clients see it within ~1s — v1.0 (SYNC-01, Phase 3)
- ✓ GM hide on device A → all other clients see it re-fog within ~1s — v1.0 (SYNC-02, Phase 3)
- ✓ Mid-session join receives current revealed set on first render — v1.0 (SYNC-03, Phase 3)
- ✓ Firestore write rejection rolls back optimistic reveal and shows `Couldn't save the change — check your connection` — v1.0 (SYNC-04, Phase 3). Note: plain network drops are *queued* by the Firestore SDK (documented behavior, correct for a tabletop session — no data loss on transient wifi); `.catch` only fires for genuine rejections.
- ✓ Pan works on mouse-drag and single-finger drag without accidental hex taps (6px `moved` threshold) — v1.0 (NAV-01, Phase 4)
- ✓ Pinch-zoom, wheel-zoom, and +/- buttons all funnel through `zoomAt` — v1.0 (NAV-02, Phase 4)
- ✓ Search box locates hex by `CCRR` ID and centers + briefly highlights it — v1.0 (NAV-03, Phase 4)
- ✓ Search box locates POI by case-insensitive substring name for signed-in GM — v1.0 (NAV-04, Phase 4)
- ✓ GM Mode toggle dims fog from `opacity 0.965` → `0.42` for reveal planning — v1.0 (NAV-05, Phase 4)
- ✓ GitHub Pages auto-deploy on every push to `main` (no manual steps) — v1.0 (OPS-01, Phase 1)
- ✓ `README.md` documents `python3 -m http.server 8000` and confirms demo-mode works with unmodified `firebase-config.js` — v1.0 (OPS-02, Phase 1)
- ✓ Firebase-unreachable path still renders the basemap under full fog with a demo-mode flash notice — v1.0 (OPS-03, Phase 1)

### Active

<!-- Populated by /gsd:new-milestone for v1.1. Left intentionally empty at milestone close. -->

*(No active requirements — v1.0 shipped. Start the next milestone with `/gsd:new-milestone`.)*

### Out of Scope

<!-- Deliberate exclusions. Reasoning re-audited at v1.0 close; all still valid. -->

- New features (encounter tracking, party markers, notes, dice, multi-campaign, additional maps) — deferred pending real-session feedback; MVP was fix-and-verify only
- Locking `GM_UID` to a specific Firebase user — worth doing before opening to strangers or before the first real session; still deferred but noted in Key Decisions for revisit
- Architectural rewrite — the `GRID` constants are hand-calibrated to `assets/map.webp`; v1.0 required only a single-field `GRID.d` recalibration, confirming the rewrite would have been wasted work
- Migrating off Firebase — user has console access; alternative sync backends offer no meaningful upside at this scale; SYNC-01..03 verified end-to-end so no cause to switch
- A build system, TypeScript, framework, or bundler — deliberate zero-toolchain design preserved through v1.0
- Automated test suite as a v1.0 requirement — manual verification against the deployed URL sufficed; a proper suite can be considered post-session as feedback shapes what to lock down

## Context

- **Target use**: The user is running a Shadowdark campaign at the table. Players bring their own devices (mix of phones, tablets, laptops).
- **v1.0 outcome**: The app is now usable at a live session. First real session pending — feedback there will shape v1.1.
- **Codebase after v1.0**: 436 lines in `index.html`, 33 lines in `firebase-config.js`, plus `.github/workflows/pages.yml`. All edits in Phases 2–4 landed inside `index.html` — the single-file architecture held.
- **Diagnostic overlay**: `?debug=1` gated overlay (added in Phase 2, extended through Phase 4) remains in `index.html` — costs zero pixels when the URL parameter is absent and is load-bearing for future overlay/tap regression diagnosis. Do not remove.
- **Grid calibration lesson**: The `GRID.d` field turned out to be tunable — recalibrating it in Phase 2 was necessary despite the initial "do not touch GRID" constraint. Any future basemap change (new hex tile shape, image swap) will require re-running the same magenta-marker calibration pass.
- **HEX-04 root cause was pointer capture**, not the button binding — noted for anyone touching `#viewport` pointer handling in the future.

## Constraints

- **Tech stack**: Vanilla ES modules in one `index.html`, no build step, no framework, no bundler, no test framework — deliberate and validated through v1.0.
- **Hosting**: GitHub Pages via `.github/workflows/pages.yml` (OIDC deploy, pinned action versions, minimum-permission scoping).
- **Backend**: Firebase (Firestore + Auth), Web SDK 10.12.5, loaded from `https://www.gstatic.com/firebasejs/10.12.5/` via dynamic import.
- **Basemap image**: `assets/map.webp`, full-res 9933×14043, drawn at 3200×4524. `GRID.a/b/m/e/W/H/fullW/fullH/colMin/colMax/rowMin/rowMax` remain locked to these dimensions; only `GRID.d` is tunable and its current value (`198.97169678985841`) is calibrated against `assets/map.webp` specifically.
- **Devices**: Must work on phone, tablet, and laptop, touch and mouse input. `env(safe-area-inset-*)` handles notch. Verified on Pixel 8 Pro (Chrome) and MacBook (Chrome + Safari + Firefox).
- **Local dev**: `python3 -m http.server` + demo-mode (unmodified `firebase-config.js`) — no auth required. Preserve.
- **Security posture**: Firestore security rules are the real access boundary; client-side `isGM` is UI-only. Any auth/authorization change must respect this.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix in place — do not rewrite | Hex `GRID` constants are calibrated to `assets/map.webp`; rewriting means recalibrating pixel-by-pixel with no MVP payoff. | ✓ Good — a single-field `GRID.d` recalibration was the only calibration work needed; the rest of the code was correct |
| Keep Firebase for sync | User has console access; alternatives are equal or worse at this scale. | ✓ Good — SYNC-01..03 verified end-to-end; Firestore SDK's offline queueing is actually the right product behavior for a tabletop session |
| Defer GM_UID lockdown out of MVP | Not gameplay-blocking. | ⚠️ Revisit — needed before opening the URL to non-players/strangers; put on the v1.1 candidate list |
| Local dev works without Firebase auth | Demo-mode fallback already renders under full fog with no network; preserving is cheaper than adding a dev-only auth flow. | ✓ Good — invariant survived every phase; UAT-verified in Phase 1 |
| Cross-device support in MVP | Players will bring phones, tablets, and laptops. | ✓ Good — verified on Pixel 8 Pro + MacBook (three browsers); no per-device fixes required |
| Deploy loop is Phase 1, not Phase N | The primary bug (map squishing) only reproduces on the deployed URL. | ✓ Good — Phase 2's LAYOUT-01 fix could not have been validated without Phase 1's live URL |
| Recalibrate `GRID.d` despite CONTEXT D-05 | Diagnostic magenta-grid overlay proved a uniform half-hex Y offset that D-05's assumption ("constants correct given correct viewport sizing") did not predict. | ✓ Good — user-authorized deviation via interactive checkpoint; alignment now pixel-perfect |
| Keep `?debug=1` overlay permanently | Zero pixels when absent; load-bearing during Phases 2–4 debugging. | ✓ Good — kept as-is for future regression diagnosis |
| Reframe SYNC-04 to Firestore reality | Firestore SDK's default offline behavior queues writes; DevTools Offline never reaches `.catch`. The `.catch` path is present but only fires on genuine rejections. | ✓ Good — documented in the archived REQUIREMENTS.md; captures product-correct behavior (no data loss on transient wifi drops) |

## Next Milestone Goals

*(To be defined via `/gsd:new-milestone`. Candidates surfaced from v1.0 close:)*

- **First-real-session feedback loop**: run a live game, capture what breaks or feels wrong, drive v1.1 requirements from that data.
- **Lock `GM_UID`** so random signups don't get GM privileges — recorded in Key Decisions as ⚠️ Revisit.
- **Tighten Firestore security rules** to enforce GM-only writes on `revealed/` and `meta/poi` (client-side `isGM` is UI-only today).
- **Post-session features** (encounter tracking, party markers, notes, journal, etc.) — deferred until real-session feedback ranks them.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-22 after v1.0 MVP milestone completion — 20/20 v1 requirements shipped and verified against the live GH Pages deployment.*
