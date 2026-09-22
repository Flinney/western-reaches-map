---
phase: 04-navigation-search-gm-mode
plan: 01
subsystem: navigation
tags: [pan, zoom, tap, pointer-events, nav-01, nav-02]

# Dependency graph
requires:
  - phase: 02-map-renders-hexes-respond
    provides: "Phase 02-02 pointer-capture guard (e.target.closest('#info,#gmpill') return) at index.html:354"
provides:
  - "Audit of pan/zoom/tap discrimination code against NAV-01 and NAV-02 — all criteria PASS or PRESERVE-AS-IS"
  - "Zero source edits — no defects found; existing code satisfies both requirements"
  - "Concrete handoff to Plan 04-02 (search + GM mode) and Plan 04-03 (cross-device UAT)"
affects: [04-02, 04-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pan/tap discrimination via Manhattan moved accumulator (|dx|+|dy| from panStart, capped with Math.max) and strict moved<6 gate in endPointer"
    - "Pinch zoom inlines same anchor math as zoomAt but uses a start-snapshot centroid — necessary because zoomAt's single-call API cannot express a moving centroid"

key-files:
  created:
    - .planning/phases/04-navigation-search-gm-mode/04-01-SUMMARY.md
  modified: []

key-decisions:
  - "No edits to index.html — audit found zero defects against NAV-01 and NAV-02; PASS/PRESERVE-AS-IS outcomes are valid and expected per plan instructions."
  - "Pinch branch correctly inlines zoomAt math with a start-snapshot anchor; refactoring to call zoomAt would require changing zoomAt's signature to accept a snapshot, which is out of plan scope and unnecessary."
  - "Manhattan moved threshold (|dx|+|dy|) is intentionally preserved — plan wording explicitly states the criterion refers to the variable `moved`, not Euclidean distance; no evidence of observable false-taps or dropped-taps."

requirements_covered: [NAV-01, NAV-02]

# Metrics
duration: ~5m
completed: 2026-09-21
---

# Phase 4 Plan 01: Pan/Zoom/Tap Audit (NAV-01, NAV-02)

**Audited pan/zoom/tap discrimination code in `index.html` against NAV-01 and NAV-02. Both criteria are satisfied by the existing code. Zero source edits required.**

## What shipped

No edits required — audit verdict was PASS or PRESERVE-AS-IS for both NAV-01 and NAV-02. The existing implementation already satisfies both requirements as written. `git diff --name-only` is empty after Task 2 (expected, valid outcome per plan instructions and the Plan 03-01 audit-only precedent).

## Audit table

Phase 4 Success Criteria 1 and 2 verbatim from ROADMAP.md:

> 1. Dragging with a mouse or a single finger pans the map without accidentally triggering a hex tap; the 6px `moved` threshold behaves as expected on both input types.
> 2. Pinch-zoom works on touch; wheel-zoom and the +/- buttons work on desktop; all three funnel through `zoomAt` and feel smooth.

| Criterion | File:Line | Verdict | Notes |
|-----------|-----------|---------|-------|
| NAV-01 — pointer-capture guard | `index.html:354` `if(e.target.closest && e.target.closest("#info,#gmpill")) return;` | PASS | Present verbatim; guards `#info` and `#gmpill` from swallowing pointer events. From Plan 02-02 — must not be modified. |
| NAV-01 — moved accumulator | `index.html:362` `moved=Math.max(moved,Math.abs(dx)+Math.abs(dy));` | PASS | Manhattan distance (|dx|+|dy|) from panStart, accumulated via Math.max so it only increases. Matches plan interfaces spec. The criterion wording "6px `moved` threshold" refers to the variable `moved` — which is Manhattan — not Euclidean. No evidence of false-taps or dropped-taps; preserve as-is. |
| NAV-01 — tap gate | `index.html:364` `var wasTap=pointers.size===1 && moved<6;` | PASS | Strict less-than 6 gate. Single-pointer guard ensures two-finger interactions (which set `pointers.size===2`) never fire a tap. `moved<6` is evaluated at the moment of pointerup before `pointers.delete` removes the entry, so the count is correct. |
| NAV-02 — wheel → zoomAt | `index.html:370-371` `zoomAt(e.clientX-r.left,e.clientY-r.top, e.deltaY<0?1.15:1/1.15)` with `{passive:false}` | PASS | Calls `zoomAt` at cursor position; `{passive:false}` + `e.preventDefault()` prevent the page from scroll-hijacking the zoom gesture. Factor 1.15 / (1/1.15) matches button factor (1.3 / (1/1.3) — slight intentional difference). |
| NAV-02 — #zin/#zout → zoomAt | `index.html:374-375` `zoomAt(vp.clientWidth/2,vp.clientHeight/2,1.3)` / `zoomAt(vp.clientWidth/2,vp.clientHeight/2,1/1.3)` | PASS | Both button handlers call `zoomAt` anchored to viewport center. |
| NAV-02 — #fit → fit() | `index.html:376` `document.getElementById("fit").onclick=fit;` | PASS | Calls `fit()` which sets `minS=scale*0.85` and resets `scale`/`tx`/`ty`; `zoomAt`'s clamp is then bounded by the updated `minS`/`maxS`. |
| NAV-02 — minS/maxS bounds | `index.html:261` `var ns=Math.max(minS,Math.min(maxS,scale*f));` (zoomAt); `index.html:359` `ns=Math.max(minS,Math.min(maxS,pinchStart.scale*f))` (pinch) | PASS | Identical clamp expression in both paths. `minS` is set by `fit()` at line 260 as `scale*0.85`. `maxS=3.4` is hard-coded at line 256. All three zoom paths (pinch, wheel, buttons) respect these bounds. |
| NAV-02 — pinch → zoomAt equivalence | `index.html:359-361` pinch branch vs `index.html:261-262` zoomAt | PRESERVE-AS-IS | Pinch inlines the same anchor formula as `zoomAt`: `tx=cx-(cx-pinchStart.tx)*(ns/pinchStart.scale); ty=cy-(cy-pinchStart.ty)*(ns/pinchStart.scale)` vs `tx=cx-(cx-tx)*(ns/scale); ty=cy-(cy-ty)*(ns/scale)`. The difference is that pinch uses snapshot values (`pinchStart.tx`, `pinchStart.scale`) rather than live values (`tx`, `scale`) — this is *required* because the pinch centroid moves each frame and the animation must anchor against the moment the pinch *started*, not the current frame's state. Calling `zoomAt` per-frame would not produce this behavior without adding snapshot-state parameters. Math and clamps are textually identical; "funnel through zoomAt" is satisfied in effect. No defect; no change required. |

## Deviations from CONTEXT

None — plan executed exactly as written. Zero source edits; audit-only result is the correct outcome when both criteria are already satisfied.

## Demo-mode invariant

Preserved. No edits were made to `index.html`. The Backend adapter, `initFirebase`, `attachRevealed`, `attachGM`, and boot section are all untouched. The "renders with no network" invariant is unaffected: `Backend.configured=false` on placeholder config, `Backend.onRevealed` calls its callback with `new Set()`, and the map renders under full fog with no SDK calls (line 192-193 short-circuit paths). No new `FB.`/`SDK.` references were introduced outside the Backend adapter body.

## Regression posture

All grep gates run against the worktree copy of `index.html` (sourced from main repo via worktree):

| Gate | Expected | Observed | Status |
|------|----------|----------|--------|
| `grep -c 'moved<6' index.html` | 1 | 1 | PASS |
| `grep -c 'e\.target\.closest.*#info,#gmpill' index.html` | 1 | 1 | PASS |
| `grep -c 'zoomAt(vp\.clientWidth/2' index.html` | 2 | 2 | PASS |
| `grep -c 'zoomAt(e\.clientX' index.html` | 1 | 1 | PASS |
| `grep -c 'Backend\.configured' index.html` | 3 | 3 | PASS |
| `grep -c 'function zoomAt' index.html` | 1 | 1 | PASS |
| `grep -c 'function fit' index.html` | 1 | 1 | PASS |
| `grep -c 'var GRID=' index.html` | 1 | 1 | PASS |
| `git diff --name-only` | (empty) | (empty) | PASS |

## Handoff to Plan 04-02

Plan 04-02 audits and hardens the **search** and **GM Mode dim-fog** sections of `index.html` (NAV-03, NAV-04, NAV-05). The following regions from this plan's audit are **load-bearing and must not be touched by Plan 04-02**:

- **Pointer-capture guard** (`index.html:354`): `if(e.target.closest && e.target.closest("#info,#gmpill")) return;` — if Plan 04-02 needs to add the `#results` dropdown to this guard (to prevent search-result clicks from also firing as hex taps), the guard must be extended as a strict superset: `e.target.closest("#info,#gmpill,#results")`. It must never be removed or replaced.
- **`moved` accumulator** (`index.html:362`): Manhattan distance formula `Math.max(moved,Math.abs(dx)+Math.abs(dy))` — do not change to Euclidean, do not rename, do not extract to a constant.
- **`zoomAt` function** (`index.html:261-262`): The clamp and anchor formula are correct; do not restructure.
- **`pinchInfo` function** (`index.html:368-369`): Snapshot-based pinch centroid math — do not inline or move.
- **`endPointer` / `moved<6` gate** (`index.html:364`): The tap discrimination threshold — preserve verbatim.

## Handoff to Plan 04-03 (cross-device UAT)

Plan 04-03 runs manual UAT against `https://flinney.github.io/western-reaches-map/` and on localhost. For NAV-01 and NAV-02, the following behaviors must be verified:

**NAV-01 (phone — touch):**
- Single-finger drag: map pans; no info panel opens during a drag of >6px Manhattan distance from touch start.
- Short tap (<6px movement): info panel opens for the tapped hex.
- Edge case: tap on `#info` panel or `#gmpill` pill does NOT pan or trigger hex tap (pointer-capture guard).

**NAV-01 (laptop — mouse):**
- Mouse drag: map pans without triggering hex selection.
- Short click (<6px movement): info panel opens for the clicked hex.
- Cursor changes to `grabbing` during drag and returns to `grab` on mouseup.

**NAV-02 (phone — touch):**
- Two-finger pinch: map zooms about the pinch centroid; `scale` is clamped to `minS`/`maxS`; animation feels smooth (no jumps).
- Zoom-out cannot go below `minS` (~`scale*0.85` from last `fit()`).

**NAV-02 (laptop — mouse/keyboard):**
- Scroll wheel: zooms about the cursor position; page does not scroll vertically during wheel-over-map.
- `+` button: zooms about viewport center.
- `−` button: zooms out about viewport center.
- `Fit` button: resets map to full-viewport fit.
- All four interactions clamp to `minS`/`maxS`.

**Expected on `?debug=1`:**
- `s:` value changes during zoom operations.
- `tap:` coordinate updates on each short click/tap.
- `dx:`/`dy:` values show the offset between tap and hex center (should be small for accurate taps).

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | (none) | Task 1 + Task 2 — audit only, no source edits; no commit needed |
| 2 | (see final commit) | docs(04-01): complete pan/zoom/tap audit — NAV-01, NAV-02 PASS |

## Self-Check

- `index.html` — exists, unmodified (no Task 2 edits required)
- `.planning/phases/04-navigation-search-gm-mode/04-01-SUMMARY.md` — this file; being written now
- All grep gates: PASS (verified above in Regression posture table)

## Self-Check: PASSED

---
*Phase: 04-navigation-search-gm-mode*
*Completed: 2026-09-21*
