---
phase: 03-live-sync-across-devices
plan: 01
subsystem: sync
tags: [firebase, firestore, onSnapshot, optimistic-update, rollback]

# Dependency graph
requires:
  - phase: 02-map-renders-hexes-respond
    provides: "toggleReveal write path (Backend.reveal|hide via #info panel button) reachable end-to-end"
provides:
  - "Audit of the live-sync pipeline (Backend adapter, attachRevealed onSnapshot, toggleReveal .catch rollback) against SYNC-01..04"
  - "Single hardening edit: info panel button label is re-rendered after a rolled-back write, so it can no longer lie about persisted state"
  - "Concrete cross-device UAT checklist handed off to Plan 02"
affects: [03-02, live-sync-uat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic-update-with-rollback for Firestore writes: mutate local state → render → write → on .catch invert + re-render + re-showInfo + flash + console.warn"

key-files:
  created:
    - .planning/phases/03-live-sync-across-devices/03-01-SUMMARY.md
  modified:
    - index.html (one added line inside toggleReveal .catch)

key-decisions:
  - "Do not extend Backend or add new methods — the four criteria are satisfied by the existing adapter; the only defect was a missing showInfo re-render in toggleReveal's rollback."
  - "Do not touch attachRevealed, initFirebase, Backend adapter bodies, or attachGM (D-16 from Phase 2)."
  - "Preserve verbatim flash text 'Couldn't save the change — check your connection' — Plan 02 UAT asserts on it."

patterns-established:
  - "After any optimistic-update rollback, always re-render whatever UI depends on the now-reverted state (fog, overlay, AND the info panel's button label if it is open for the affected hex)."

requirements-completed: [SYNC-03, SYNC-04]

# Metrics
duration: 1m 26s
completed: 2026-09-22
---

# Phase 3 Plan 01: Audit and Harden Live-Sync Pipeline

**Audited SYNC-01..04 against index.html and applied a single one-line rollback fix so the info panel button label cannot lie after a failed Firestore write.**

## Performance

- **Duration:** 1m 26s
- **Started:** 2026-09-22T02:40:17Z
- **Completed:** 2026-09-22T02:41:43Z
- **Tasks:** 3
- **Files modified:** 1 (index.html)

## Accomplishments

- Mapped every SYNC-01..04 criterion to a specific file:line in `index.html`.
- Identified one defect (SYNC-04: `showInfo(id)` not called inside `toggleReveal`'s rollback `.catch`) and applied the minimal one-line fix prescribed by the plan.
- Confirmed the Backend adapter, `initFirebase`, `attachRevealed`, and `attachGM` are all untouched (D-16 preserved).
- Confirmed the demo-mode "renders with no network" invariant holds after the edit.

## Audit table

| Criterion | File:Line | Verdict | Notes |
|-----------|-----------|---------|-------|
| SYNC-01 (reveal write propagates ~1s) | `index.html:313` (call site in `toggleReveal`) → `index.html:194` (`Backend.reveal` → `SDK.setDoc`); read path `index.html:201-203` (`attachRevealed` → `SDK.onSnapshot` on `revealed` collection) | PASS (code) · N/A — LATENCY verified in Plan 02 | Write path is unconditional in live mode; every snapshot rebuilds a full new Set from doc IDs, so remote propagation is authoritative once the CDN import succeeds. |
| SYNC-02 (hide delete propagates ~1s) | `index.html:313` → `index.html:195` (`Backend.hide` → `SDK.deleteDoc`); read path same `onSnapshot` at `index.html:201-203` | PASS (code) · N/A — LATENCY verified in Plan 02 | Deletion is observed as a snapshot without the doc; the callback rebuilds a fresh Set, so removals apply cleanly with no delta-application logic to get wrong. |
| SYNC-03 (mid-session join gets full state) | Registration `index.html:429` (`Backend.onRevealed(cb)`), stored at `index.html:192` (`pendingRevealed=cb`), invoked at `index.html:214` (`attachRevealed()` inside `initFirebase`), initial snapshot delivered at `index.html:201-203` | PASS | Boot order is correct: `Backend.onRevealed(cb)` at line 429 runs BEFORE `initFirebase()` at line 432, so `pendingRevealed` is queued before the async import. Firestore's `onSnapshot` delivers the full current state on the first callback firing. No local seeded value shadows the snapshot payload (`revealed=new Set()` at line 255 is initialized empty and overwritten wholesale by the callback at line 429). |
| SYNC-04 (rollback + flash on write failure) | `index.html:310-315` (`toggleReveal`); flash `index.html:318` | FIXED | Defect: `.catch` re-rendered fog+overlay but did not re-invoke `showInfo(id)`, so the info panel's Reveal/Hide button label could remain stale after a failed write. Fix: added `if(selected===id) showInfo(id);` inside the `.catch` handler between the re-render and `flash()`. Verbatim flash text `Couldn't save the change — check your connection` preserved. `console.warn(e)` preserved. |

## Task Commits

Each task committed atomically:

1. **Task 1: Audit** — no source files touched; findings captured in this SUMMARY's Audit table (verified by `git diff --name-only` returning empty after Task 1).
2. **Task 2: Apply minimal hardening fix** — `68d1e25` (fix)
3. **Task 3: Write SUMMARY** — final plan-metadata commit (this file)

## Files Created/Modified

- `index.html` — added one line inside `toggleReveal`'s `.catch` handler at approx line 315: `if(selected===id) showInfo(id);`. Change is scoped to the handler; no adjacent code was restructured, renamed, or "cleaned up".
- `.planning/phases/03-live-sync-across-devices/03-01-SUMMARY.md` — this file. Phase directory created in this worktree (main-repo copy already exists via prior planning session).

## Edits applied

```diff
@@ toggleReveal .catch handler @@
   if(op && op.catch) op.catch(function(e){ if(willReveal) revealed.delete(id); else revealed.add(id); renderFog(); renderOverlay();
+    if(selected===id) showInfo(id);
     flash("Couldn't save the change — check your connection"); console.warn(e); }); }
```

- Guarded on `selected===id` so we only re-render the info panel if it's actually open for the hex whose write failed. If the GM has already selected a different hex before the rollback fires, we leave that unrelated selection alone.
- No other change to `toggleReveal`, `flash`, `attachRevealed`, `Backend.*`, `initFirebase`, `attachGM`, or the boot section.

## Decisions Made

- **Do not add a new Backend method or extend the adapter surface** — the four SYNC criteria are satisfied by the existing adapter shape. Extending Backend would add API surface with no correctness payoff and would risk regressing the demo-mode invariant.
- **Do not "clean up" the compact one-line `.catch` style in `toggleReveal`** — it's terse but correct; the plan explicitly forbids refactoring load-bearing handlers. The fix is the smallest possible textual addition.
- **Guard the re-render on `selected===id`** — the plan's suggested line was `if(selected===id) showInfo(id);`; adopted verbatim to avoid re-rendering the panel when it's already been re-focused on a different hex.

## Deviations from Plan

None — plan executed exactly as written. Task 1 identified exactly the class of defect the plan anticipated (SYNC-04 rollback missing `showInfo` re-render); Task 2 applied exactly the fix the plan prescribed for that defect class.

## Issues Encountered

- The phase directory `.planning/phases/03-live-sync-across-devices/` did not yet exist in this worktree branch's committed history (the worktree base predates the phase-03 planning session). Created it before writing the SUMMARY. Not a plan deviation — the plan output section explicitly instructs `Create .planning/phases/03-live-sync-across-devices/03-01-SUMMARY.md`.

## Demo-mode invariant

Preserved. The edit is scoped to a UI re-render (`showInfo` reads local state only — `revealed`, `gmKey`, `selected`, `isGM`) and touches no `FB`/`SDK` references, so a demo-mode caller (which would hit the `.catch` via `Promise.reject(new Error("offline"))` from `Backend.reveal`/`Backend.hide`) still runs the same handler with no null-dereference risk. In practice `toggleReveal` also short-circuits at line 310 with `if(!isGM) return;`, so demo-mode users never reach the rollback path — but the invariant "no crash if the .catch fires with `FB` null" holds.

## Handoff to Plan 02 (cross-device UAT)

Plan 02 must run these browser-observable checks against two URLs:

- **Localhost (demo-mode regression):** `http://localhost:8000/` served via `python3 -m http.server 8000` from the repo root, with `firebase-config.js` unmodified. Verify: (a) map renders under full fog, (b) demo-mode `flash("Demo mode — add Firebase settings in firebase-config.js to go live")` appears, (c) no console errors, (d) clicking a hex opens the info panel with no Reveal/Hide button (isGM is false in demo mode), (e) `?debug=1` overlay reports `rev: 0` after load.
- **Live URL (cross-device sync):** `https://flinney.github.io/western-reaches-map/` on two devices simultaneously (GM device + player device).

Concrete UAT steps:

1. **SYNC-01 (reveal propagates ~1s):** Sign in as GM on device A. Reveal a hex. Confirm on device B (unauthenticated, live URL) the hex appears in the fog within ~1s. Repeat with 2–3 different hexes.
2. **SYNC-02 (hide propagates ~1s):** With the same hex still selected on device A, tap "Hide hex". Confirm on device B the hex re-fogs within ~1s.
3. **SYNC-03 (mid-session join):** With ≥3 hexes revealed by device A, open the live URL in a fresh incognito window on device C. Confirm all revealed hexes appear immediately on first render, without any manual refresh, and that `?debug=1` reports the correct `rev:` count on device C at load.
4. **SYNC-04 (rollback + verbatim flash):** On device A (signed in as GM), simulate a write failure — either kill network before tapping "Reveal hex", or add a Firestore rules-block on `revealed/` writes in the console for 30 seconds. Tap "Reveal hex" on an unrevealed hex. Confirm:
   - the hex briefly appears revealed (optimistic update),
   - then re-fogs (rollback),
   - the flash message `Couldn't save the change — check your connection` appears in `#status` (verbatim, including the em-dash `—`),
   - the info panel's button label reads `Reveal hex` again (not the stale `Hide hex`) — this is the specific behavior the Plan 01 fix enables,
   - `console.warn` fires with the write error,
   - re-tapping "Reveal hex" after network is restored (or after the rules-block is removed) succeeds and propagates to device B per SYNC-01.

## Regression posture

- `grep -c "Couldn't save the change — check your connection" index.html` → 1 (verbatim string preserved).
- `grep -c 'onSnapshot(SDK.collection(FB.db,"revealed"' index.html` → 1 (read path preserved).
- `grep -o "Backend\.\(reveal\|hide\)" index.html | wc -l` → 2 (both call sites in `toggleReveal` preserved).
- `git diff HEAD~1..HEAD -- index.html` shows exactly one addition and zero deletions.
- Backend adapter bodies, `initFirebase`, `attachRevealed`, `attachGM` all textually unchanged.

## User Setup Required

None — no external service configuration required. The change is client-side JavaScript in `index.html`; no Firestore rules, no `firebase-config.js`, no environment variable, and no new deploy step.

## Next Phase Readiness

- **Plan 02 (cross-device UAT) is unblocked.** All four SYNC criteria are code-verified; the "handoff to Plan 02" section above is the concrete UAT checklist to run against the live URL.
- **No new blockers.** Deferred: locking `GM_UID` to a real Firebase UID (v2 requirement, out of MVP scope per PROJECT.md).

## Self-Check

Verifying claims:

- `index.html` (modified) — exists · one-line addition confirmed by `git diff HEAD~1..HEAD -- index.html`
- `.planning/phases/03-live-sync-across-devices/03-01-SUMMARY.md` (this file) — being written now; will be committed in the final plan-metadata commit
- Commit `68d1e25` (Task 2 fix) — verified with `git log --oneline -1` returning `68d1e25 fix(03-01): re-render info panel button label after failed reveal/hide`

## Self-Check: PASSED

---
*Phase: 03-live-sync-across-devices*
*Completed: 2026-09-22*
