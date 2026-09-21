---
phase: 01-deploy-loop-demo-mode-guardrail
plan: "01"
subsystem: infra
tags: [github-actions, github-pages, deploy, ops, ci-cd]

requires: []
provides:
  - ".github/workflows/pages.yml — GitHub Actions workflow that publishes the repo root to GitHub Pages on every push to main"
affects:
  - "02-map-renders-hexes-respond"
  - "03-live-sync-across-devices"
  - "04-navigation-search-gm-mode"

tech-stack:
  added:
    - "GitHub Actions (actions/checkout@v4, actions/configure-pages@v5, actions/upload-pages-artifact@v3, actions/deploy-pages@v4)"
  patterns:
    - "Two-job Pages workflow: build job uploads artifact, deploy job applies it via OIDC (no stored PAT)"
    - "Concurrency guard: group=pages, cancel-in-progress=true prevents stale deploys overwriting new ones"
    - "Minimum-permission scoping: contents:read + pages:write + id-token:write only"

key-files:
  created:
    - ".github/workflows/pages.yml"
  modified: []

key-decisions:
  - "D-01: Deploy on every push to main with no paths-ignore — 'if it's on main, it's live' beats any skip trickery"
  - "D-02: workflow_dispatch enabled for manual re-runs without a code change"
  - "D-03: concurrency group pages + cancel-in-progress:true — newer push cancels in-flight older run"
  - "D-05: GitHub Actions workflow (not Pages 'Deploy from branch') — enables D-02/D-03; uploads repo root as-is"
  - "Action versions pinned to stable major tags (v3/v4/v5) — compromised upstream requires a visible version bump to take effect"

patterns-established:
  - "Zero-build deploy: workflow uploads repo root with path: . — no Node setup, no build command"
  - "OIDC-based Pages deploy: id-token:write scope mints a short-lived token; no stored PAT needed"

requirements-completed:
  - OPS-01

duration: 5min
completed: "2026-09-21"
---

# Phase 01 Plan 01: Create GitHub Actions Pages Workflow Summary

**GitHub Actions workflow publishing the repo root to GitHub Pages on every push to main, using OIDC deploy with pinned stable action versions and minimum-permission scoping**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-21T05:26:00Z
- **Completed:** 2026-09-21T05:31:15Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Created `.github/workflows/pages.yml` — a valid GitHub Actions workflow that auto-deploys the repo to GitHub Pages on every push to `main` and on manual dispatch
- Enforced all security mitigations from the threat model: pinned stable action versions (T-01-01), minimum permissions (T-01-02), concurrency guard (T-01-04)
- Zero-build deploy: the workflow uploads the full repo root (`path: .`) without any Node setup, build command, or test step, preserving the zero-toolchain constraint

## Task Commits

1. **Task 1: Create the GitHub Actions Pages workflow** - `434e5ec` (feat)

**Plan metadata:** (see below — committed immediately after SUMMARY)

## Files Created/Modified

- `.github/workflows/pages.yml` — GitHub Actions workflow: two jobs (build + deploy), push-to-main + workflow_dispatch triggers, concurrency guard, OIDC-based Pages deploy

## Decisions Made

- Used canonical action versions from CONTEXT.md: `actions/checkout@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4` — no bumps needed, these are current stable majors as of plan date
- Permissions scoped to exactly three: `contents: read`, `pages: write`, `id-token: write` — no additional scopes
- `path: .` on upload-pages-artifact — uploads whole repo root; `data/poi.json` is gitignored so it never enters the artifact tree; `.planning/` is also gitignored

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `python3 -c "import yaml"` failed on the system Python (pyyaml not installed). Installed via `/opt/homebrew/bin/pip3 install pyyaml --break-system-packages`. YAML validated successfully after install.

## User Setup Required

**One manual step is required before the workflow will fire:**

In the GitHub repo Settings → Pages, set the source to **GitHub Actions** (not "Deploy from a branch"). This is documented in the plan as a prerequisite for Plan 03. Until this toggle is flipped, the workflow file is committed and ready but deploys will not occur.

Live-URL verification (`https://flinney.github.io/western-reaches-map/`) is deferred to Plan 03, which covers the Settings toggle as an explicit checkpoint.

## Next Phase Readiness

- Deploy loop infrastructure is in place — `.github/workflows/pages.yml` will fire the moment the Pages source is toggled to GitHub Actions in repo Settings
- Plan 02 (README) and Plan 03 (Pages settings + live verification checkpoint) can proceed in any order
- No blockers for Phase 2 (Map Renders & Hexes Respond) — subsequent phases can push fixes to `main` and verify against the deployed URL once Plan 03's manual toggle is done

## Threat Flags

No new threat surface beyond what is in the plan's threat model (T-01-01 through T-01-06). All mitigations are implemented in the workflow file.

---
*Phase: 01-deploy-loop-demo-mode-guardrail*
*Completed: 2026-09-21*
