# Western Reaches Map — Playable MVP

## What This Is

A single-page fog-of-war hex map for the Shadowdark "Western Reaches" tabletop campaign. The GM reveals hexes on their device and every player at the table sees the map update live in their browser, on phone, tablet, or laptop. Today the app renders but is not usable at the table: it looks squished on GitHub Pages, the SVG overlay does not align with the underlying map image, hex interaction is broken, the Reveal button does nothing, and it is unclear whether reveal state actually reaches other players.

## Core Value

**At a live Shadowdark session, the GM taps a hex on their device and every player — on whatever device they brought — sees it appear on their map within a second, reliably.** If that fails, nothing else matters.

## Requirements

### Validated

<!-- Capabilities already present in the codebase and worth preserving. -->

- ✓ SVG-based hex rendering with fog-of-war mask (revealed hexes are polygon holes) — existing
- ✓ Calibrated hex grid geometry mapping `assets/map.webp` (9933×14043) to a drawn 3200×4524 canvas — existing, must not be recalibrated
- ✓ Backend adapter isolating Firebase, with a demo-mode fallback so the app renders under full fog with no network — existing invariant, preserve
- ✓ Firebase Auth (email/password) GM sign-in flow — existing, works once credentials are configured
- ✓ Firestore `revealed/{hexId}` collection design with `onSnapshot` streaming — existing
- ✓ One-time GM POI seeding path (upload local `data/poi.json` into `meta/poi`) — existing
- ✓ Codebase mapped in `.planning/codebase/` (ARCHITECTURE, STACK, STRUCTURE, CONVENTIONS, INTEGRATIONS, TESTING, CONCERNS) — existing

### Active

<!-- The MVP: what has to be true before this can be used at a real session. -->

- [ ] Map fits the viewport correctly on the deployed GitHub Pages URL, on phone, tablet, and laptop, in portrait and landscape
- [ ] SVG overlay (fog mask, hex outlines, fast-travel highlight) aligns pixel-perfectly with the underlying basemap image at all zoom levels
- [ ] Tapping/clicking a hex reliably opens the info panel for the correct hex on both touch and mouse input
- [ ] Fast-travel highlight (gold tint on connected revealed neighbours) actually renders when a revealed hex is selected
- [ ] "Reveal hex" / "Hide hex" button in the info panel actually toggles reveal state
- [ ] GM revealing a hex on one device causes every other client to see the hex reveal within ~1 second
- [ ] Pan, pinch-zoom, wheel-zoom, and zoom buttons work on desktop and touch devices
- [ ] Search box locates hexes by ID (e.g. `3952`) and POIs by name; results tap-to-jump correctly
- [ ] GM Mode toggle dims the fog so the GM can see unrevealed hexes
- [ ] GitHub Pages auto-deploy on push to `main` — confidence that the deployed URL matches `main`
- [ ] The app can be run and tweaked locally without needing to authenticate to Firebase (demo mode is enough for dev)

### Out of Scope

<!-- Deliberate exclusions for this MVP. -->

- Any new features beyond the existing feature surface (encounter tracking, dice, notes, journal, party markers, multi-campaign, additional maps) — MVP is fix-and-verify only; new features come after a real session
- Locking `GM_UID` to a specific Firebase user — worth doing before the first real session so random signups don't get GM powers, but not gameplay-blocking; explicitly deferred until post-MVP
- Rewriting the architecture from scratch — the hex `GRID` constants are hand-calibrated against `assets/map.webp`; a rewrite would force pixel-level recalibration and buys nothing for the MVP
- Migrating off Firebase — user has console access; alternative sync backends (Supabase Realtime, PartyKit, Ably, static+localStorage) are equal or worse for this scale
- A build system, TypeScript, framework, or bundler — deliberate zero-toolchain design is preserved
- Automated test suite as an MVP requirement — manual verification against a real deployed URL and (optionally) a couple of players suffices for MVP; formal tests deferred

## Context

- **Target use**: The user is prepping to run a Shadowdark campaign at the table within the next 2–3 weeks. Players will bring their own devices (mix of phones, tablets, laptops).
- **Prior state**: The single-file architecture is a deliberate zero-build design. Everything runs in one `<script type="module">` inside `index.html`, with `firebase-config.js` as the only other module. Firebase Web SDK 10.12.5 is loaded from the Google CDN via dynamic `import()`.
- **What the codebase map already documents**: See `.planning/codebase/ARCHITECTURE.md` for the four-layer breakdown (Backend adapter → Hex geometry → SVG rendering → Input/GM/boot), and `STACK.md` for the intentional no-toolchain stance.
- **What's newly known (from questioning)**: The GM login modal on the deployed page is exactly Firebase Auth email/password — no mystery, user can create/reset a user in the Firebase console. The user is open to a from-scratch rewrite but has been advised against it because the hex geometry is calibrated to the specific basemap.
- **Suspected root cause of "everything is broken"**: Since the overlay is misaligned AND the map looks squished, both are probably explained by the same CSS/viewport interaction (`#viewport` sizing, `#world` transform, or basemap+SVG width/height agreement) on GitHub Pages. Fixing the layout root cause likely resolves several symptoms at once, but each Active item must still be verified independently.

## Constraints

- **Tech stack**: Vanilla ES modules in one `index.html`, no build step, no framework, no bundler, no test framework — deliberate. Any fix must live within this shape.
- **Hosting**: GitHub Pages (open to alternatives if they materially unblock deployment, but preferred).
- **Backend**: Firebase (Firestore + Auth), Web SDK 10.12.5, loaded from `https://www.gstatic.com/firebasejs/10.12.5/` via dynamic import.
- **Basemap image**: `assets/map.webp`, full-res 9933×14043, drawn at 3200×4524. The `GRID` calibration constants in `index.html` are locked to these dimensions and must not be edited without recalibrating.
- **Devices**: Must work on phone, tablet, and laptop, both touch and mouse input. Notch/safe-area insets already accounted for via `env(safe-area-inset-*)`.
- **Timeline**: 2–3 weeks to a session-ready state.
- **Local dev**: Contributor must be able to `python3 -m http.server` and use the app without authenticating (demo mode is the local dev experience).
- **Security posture**: Firestore security rules are the real access boundary; client-side `isGM` is UI-only. Any auth or authorization changes must respect this.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix in place — do not rewrite | Hex `GRID` constants are calibrated to `assets/map.webp`; rewriting means recalibrating pixel-by-pixel, which is real work with no MVP payoff. Existing code is ~400 lines and cleanly layered. | — Pending |
| Keep Firebase for sync | User has console access. Alternatives (Supabase, PartyKit, Ably, localStorage) are equal or worse for this scale. Ripping it out kills the shared-map experience. | — Pending |
| Defer GM_UID lockdown out of MVP | Not gameplay-blocking; belongs to a "before-first-session hardening" step. Called out in Out of Scope so it does not get lost. | — Pending |
| Local dev works without Firebase auth | Demo-mode fallback already renders the map under full fog with no network. Preserving this invariant is cheaper than adding a dev-only auth flow. | ✓ Good |
| Cross-device support in MVP | Players will bring phones, tablets, and laptops. Testing must cover all three. | — Pending |

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
*Last updated: 2026-09-20 after initialization*
