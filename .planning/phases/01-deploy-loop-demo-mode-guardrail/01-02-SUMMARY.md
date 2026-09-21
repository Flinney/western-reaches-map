---
phase: 01-deploy-loop-demo-mode-guardrail
plan: 02
subsystem: docs
tags: [readme, demo-mode, ops, docs]

# Dependency graph
requires: []
provides:
  - "README.md at the repo root: contributor/player quickstart with local dev command, demo-mode explanation, deployed URL, and go-live pointer"
affects:
  - "01-03: demo-mode UAT — Plan 03 references the README's wording for demo mode"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Docs live in-file: README links to firebase-config.js top-of-file walkthrough rather than duplicating it"

key-files:
  created:
    - "README.md — contributor/player quickstart at repo root"
  modified: []

key-decisions:
  - "D-07: Recreated README.md at the repo root (deleted in commit 0659b7d); README.md is the conventional entry point for a GitHub repo"
  - "D-08: README scope — local dev command, demo-mode confirmation, deployed URL link, go-live pointer to firebase-config.js top comment"
  - "D-09: README does NOT re-document GRID calibration constants or four-layer architecture; those live in CLAUDE.md and .planning/codebase/"
  - "D-04: No README status badge for the Actions workflow — deferred per plan context"

patterns-established:
  - "README quickstart pattern: one-command local dev, demo-mode explanation, link to deployed URL, pointer to in-file walkthrough for configuration"

requirements-completed:
  - OPS-02
  - OPS-03

# Metrics
duration: 5min
completed: 2026-09-21
---

# Phase 1 Plan 02: README.md with local dev quickstart and demo-mode confirmation

**Single-file quickstart README that documents `python3 -m http.server 8000`, confirms map renders under full fog with no sign-in, and links to the deployed GH Pages URL and `firebase-config.js` go-live walkthrough**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-21T05:22:06Z
- **Completed:** 2026-09-21T05:27:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `README.md` (67 lines) passing all 12 automated acceptance criteria
- Documents demo mode behavior precisely: no sign-in required to see the map render; `Backend` adapter gates Firebase load on `apiKey` value
- References both demo-mode flash messages verbatim from `INTEGRATIONS.md` canonical facts
- Points readers to `firebase-config.js` in-file walkthrough rather than duplicating it (D-08)
- Lists served files (`index.html`, `firebase-config.js`, `assets/map.webp`) and gitignored files (`data/poi.json`, `.env`, `.planning/`) accurately per `.gitignore`
- References `.github/workflows/pages.yml` deploy workflow

## Task Commits

Each task was committed atomically:

1. **Task 1: Create README.md at the repo root** - `94fa062` (docs)

**Plan metadata:** (committed alongside SUMMARY.md)

## Files Created/Modified

- `README.md` — contributor/player quickstart: local dev command, demo mode, deployed URL, go-live pointer, file layout, deploy workflow reference

## Decisions Made

- Content-scope decisions (D-07, D-08, D-09) followed exactly as specified in the plan
- Noted nuance from `<canonical_facts>`: the committed `firebase-config.js` contains a real `firebaseConfig` block (so a fresh clone attempts live Firebase) — README wording clarifies "no sign-in required" means no authentication, not zero network calls
- Demo-mode flash messages cited verbatim from `INTEGRATIONS.md` table rather than paraphrased, for accuracy in Plan 03 UAT referencing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `README.md` is ready for Plan 03's demo-mode UAT (OPS-03): the README now confirms expected demo-mode behavior with the exact flash messages, so the UAT verifier knows what to look for
- Plan 01 (GitHub Actions workflow) is the parallel wave companion — together Plans 01+02 satisfy OPS-01, OPS-02, and partially OPS-03

## Self-Check: PASSED

- `README.md` exists at worktree root: confirmed
- Commit `94fa062` exists: confirmed (`git log --oneline -1` shows it)
- All 12 automated acceptance criteria pass: confirmed (ran verify block)
- No other files modified: confirmed (`git status --short` showed only `README.md` as new)

---
*Phase: 01-deploy-loop-demo-mode-guardrail*
*Completed: 2026-09-21*
