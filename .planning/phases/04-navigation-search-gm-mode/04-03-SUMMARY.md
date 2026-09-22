---
phase: 04-navigation-search-gm-mode
plan: 03
subsystem: navigation
tags: [uat, cross-device, nav-01, nav-02, nav-03, nav-04, nav-05, milestone-close]

# Dependency graph
requires:
  - phase: 04-navigation-search-gm-mode
    plan: 01
    provides: "Pan/zoom/tap audit — NAV-01 and NAV-02 confirmed PASS by code inspection"
  - phase: 04-navigation-search-gm-mode
    plan: 02
    provides: "Search + GM Mode audit — NAV-03, NAV-04, NAV-05 confirmed PASS by code inspection"
provides:
  - "Cross-device UAT results for NAV-01..05 — all five criteria verified on MacBook Chrome + Pixel 8 Pro Chrome"
  - "Demo-mode regression confirmation — localhost with blanked apiKey works correctly"
  - "Phase 4 and MVP milestone closure"
affects: [milestone-mvp]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/04-navigation-search-gm-mode/04-03-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md

key-decisions:
  - "All five NAV criteria verified on both MacBook (Chrome) and Pixel 8 Pro (Chrome) against the live deployed URL — zero regressions found."
  - "Demo-mode invariant confirmed intact: pan, wheel-zoom, button-zoom, CCRR search all work; POI results absent (gmKey null); GM Login flashes instead of opening modal — no Firebase console errors."
  - "Phase 4 closed as complete. All 20/20 v1 MVP requirements now verified. MVP milestone gate met."
  - "Pixel 8 Pro (Chrome) substituted for iPhone Safari for touch UAT — per Plan 02-01 precedent."

requirements_covered: [NAV-01, NAV-02, NAV-03, NAV-04, NAV-05]

# Metrics
duration: ~30m (human UAT across 5 checkpoint tasks)
completed: 2026-09-21
status: passed
---

# Phase 4 Plan 03: Cross-Device UAT Summary

**All five NAV criteria verified on MacBook Chrome and Pixel 8 Pro Chrome against the live GitHub Pages deployment. Zero regressions. Demo-mode invariant preserved. MVP milestone gate met — 20/20 v1 requirements complete.**

## UAT result matrix

| Criterion | Laptop (Chrome) | Phone (Chrome) | Notes |
|-----------|----------------|----------------|-------|
| NAV-01 — Pan without accidental tap | pass | pass | Pixel 8 Pro Chrome used for touch tests |
| NAV-02 — Pinch / wheel / button zoom | pass | pass | Pinch-zoom on Pixel 8 Pro; wheel + +/−/Fit on MacBook |
| NAV-03 — CCRR hex ID search | pass | pass | Verified on both laptop and phone |
| NAV-04 — POI substring search (GM only) | pass | pass | Case-insensitive substring; sign-out removes POI results |
| NAV-05 — GM Mode fog dim toggle | pass | pass | 0.965 → 0.42 → 0.965; sign-out resets correctly |

## Device substitution notes

Pixel 8 Pro (Chrome, Android) was used for all touch-input tests in place of iPhone Safari. This substitution follows the precedent established in Plan 02-01 SUMMARY: the user's available touch device is the Pixel 8 Pro. Touch event handling uses the standard Pointer Events API (not Safari-specific Touch Events), so Chrome on Android exercises the same code paths as Safari on iOS for pan, pinch, and tap interactions. This substitution is accepted as equivalent for the purposes of this UAT.

## Observed behaviors

Verbatim user resume-signal responses from each checkpoint task:

- **Task 1 (deployment confirmation):** "deployed and rendering"
- **Task 2 (NAV-01, NAV-02 on laptop):** "NAV-01 pass, NAV-02 pass"
- **Task 3 (NAV-01, NAV-02 on phone):** "NAV-01 pass, NAV-02 pass"
- **Task 4 (NAV-03, NAV-04, NAV-05 on laptop and phone):** "All pass on both devices"
- **Task 5 (demo-mode regression check):** "Demo mode intact"

## Deviations from CONTEXT

None. The UAT plan executed exactly as written. Both Plan 04-01 and Plan 04-02 were audit-clean (zero source edits each), meaning no code needed to be deployed for Phase 4 — the existing `index.html` already satisfied all five NAV criteria on paper. This UAT confirmed those paper findings live on the actual devices. No deviations, no gap-closure plans required.

## Demo-mode invariant

Task 5 confirmed the demo-mode invariant is intact after the Plans 04-01 and 04-02 audit waves. On a localhost server (`python3 -m http.server 8000`) with `firebase-config.js` apiKey blanked:

- The map renders under full fog (opacity 0.965).
- The `#status` pill flashes the demo-mode notice (`Demo mode — add Firebase settings in firebase-config.js to go live`).
- No Firebase-related console errors.
- Pan (mouse drag) works correctly.
- Wheel-zoom works; `+`, `−`, and `Fit` buttons work.
- Typing `3952` in the search box surfaces "Hex 3952"; clicking it centers the map on that hex.
- Typing a POI name substring returns no results — the `if(gmKey)` gate correctly short-circuits when `gmKey` is null (no GM sign-in).
- Clicking "GM Login" shows a flash message and does NOT open the GM modal (because `Backend.configured` is false in demo mode).

`firebase-config.js` was restored to its committed state after this check. No blanked config was committed.

## Gaps identified

None. Every UAT step passed on both devices. No defects requiring a gap-closure plan (`/gsd:plan-phase 04 --gaps`) were found.

## Phase-close checklist

- [x] NAV-01 verified on laptop (Chrome) and phone (Chrome) — marked complete in REQUIREMENTS.md
- [x] NAV-02 verified on laptop (Chrome) and phone (Chrome) — marked complete in REQUIREMENTS.md
- [x] NAV-03 verified on laptop (Chrome) and phone (Chrome) — marked complete in REQUIREMENTS.md
- [x] NAV-04 verified on laptop (Chrome) and phone (Chrome) — marked complete in REQUIREMENTS.md
- [x] NAV-05 verified on laptop (Chrome) and phone (Chrome) — marked complete in REQUIREMENTS.md
- [x] Phase 4 row updated to complete in ROADMAP.md (completed 2026-09-21)
- [x] ROADMAP.md Progress table: Phase 4 → "3/3 · Complete · 2026-09-21"
- [x] All 20/20 v1 requirements now complete — MVP milestone gate met
- [x] No new blockers

## Pre-check automated evidence (Task 1)

The following automated checks were run before human UAT began:

| Check | Command | Result |
|-------|---------|--------|
| Plans 04-01 and 04-02 SUMMARY commits in git log | `git log --oneline main -20` | 391182f (04-02 SUMMARY) and cb787b1 (04-01 SUMMARY) present |
| Deployed URL reachable | `curl -sI https://flinney.github.io/western-reaches-map/` | HTTP 200, Last-Modified Tue 2026-09-22 |
| Phase 02-02 pointer-capture guard deployed | `curl -s ...index.html \| grep -c "moved<6"` | 1 (present in deployed HTML) |

## Next steps

All 20/20 v1 requirements are verified. The MVP milestone is complete. Recommended next action:

```
/gsd:complete-milestone MVP
```

This will close the milestone, tag the repository, and generate the milestone completion report.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | (Tasks 1-5 had no commits — checkpoint UAT tasks) | Human UAT: 5 checkpoints, all passed |
| 2 | (see final commit) | docs(04-03): close Phase 4 — cross-device UAT PASS, NAV-01..05 verified |

## Self-Check

- `.planning/phases/04-navigation-search-gm-mode/04-03-SUMMARY.md` — this file; being written now
- UAT result matrix: 5 rows × 2 device columns — all cells filled with "pass"
- Frontmatter `status: passed` — correct (all UAT observations positive)
- `requirements_covered: [NAV-01, NAV-02, NAV-03, NAV-04, NAV-05]` — all 5 NAV requirements

## Self-Check: PASSED

---
*Phase: 04-navigation-search-gm-mode*
*Completed: 2026-09-21*
