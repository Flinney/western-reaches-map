---
phase: 03-live-sync-across-devices
plan: 02
subsystem: sync
tags: [uat, firebase, firestore, cross-device, offline-behavior]

# Dependency graph
requires:
  - phase: 03-live-sync-across-devices
    provides: "Plan 01 audit + one-line rollback fix; code path for optimistic-write + rollback + flash confirmed present in `index.html`"
provides:
  - "Cross-device UAT results for SYNC-01, SYNC-02, SYNC-03 (all PASS) and SYNC-04 (FAIL against as-written test method)"
  - "Empirical finding: Firestore SDK's default offline behavior queues writes rather than rejecting, so DevTools Offline mode does not reach `toggleReveal`'s `.catch` handler"
affects: [phase-03-completion, sync-04-contract]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/03-live-sync-across-devices/03-02-SUMMARY.md
  modified: []

key-decisions:
  - "Phase 3 is NOT marked complete on the basis of this UAT — SYNC-04 as specified was not verified. See 'Recommended next step' below."
  - "SYNC-04's test method (Chrome DevTools Offline) does not force a Firestore write rejection; the Firebase SDK queues writes locally when the browser is offline and settles the Promise only when connectivity is restored. This is documented Firestore behavior, not a code defect."

patterns-established:
  - "For any Firestore-write UAT that intends to trigger a rejection, DevTools Offline is insufficient. Use one of: (a) bogus projectId in `firebase-config.js` (revert immediately), (b) server-side Firestore rules block, (c) explicit `disableNetwork()` call plus rules block."

requirements-completed: [SYNC-01, SYNC-02, SYNC-03]

# Metrics
completed: 2026-09-22
status: partial
duration: "~10m (interactive human UAT)"
---

# Phase 3 Plan 02: Cross-Device UAT

**SYNC-01, SYNC-02, SYNC-03 verified against the live URL with two browser sessions and the Firebase project. SYNC-04 failed against the plan's recommended test method — analysis below shows the failure is a test-method problem, not a code defect.**

## UAT Results

| Criterion | Scenario | Device Setup | Observed | Verdict |
|-----------|----------|--------------|----------|---------|
| SYNC-01 | GM (device A) reveals hex → device B fog polygon clears | Laptop (GM) + mobile browser | Latency not clocked; human UX was "fast" — subjectively ≤ ~1s | PASS |
| SYNC-02 | GM hides same hex → device B re-fogs | Laptop + mobile | Same as SYNC-01 — subjectively ≤ ~1s | PASS |
| SYNC-03 | Fresh session (device C) sees all previously-revealed hexes on first paint | New incognito window on device C, live URL | All revealed hexes visible immediately, no manual refresh | PASS |
| SYNC-04 | Chrome DevTools Offline → tap Reveal → observe rollback + flash | Laptop only | **No rollback fired. No flash message shown while offline.** When Network was set back to Online, the write went through and the revealed hex appeared on device B. | **FAIL** (against as-written test method) |

## Verbatim flash text (SYNC-04)

No flash message was observed while DevTools was set to Offline. The `#status` pill remained empty throughout the offline period. The exact string expected by the plan — `Couldn't save the change — check your connection` — was not shown.

The string IS still present verbatim in `index.html` (`grep` confirms one occurrence at line ~316), and Plan 01's rollback fix (re-call `showInfo(id)` on rollback) is still in place. Neither was exercised by this test.

## What actually happened on SYNC-04

Firestore's default offline behavior is to **queue writes locally**, not reject them. When Chrome DevTools flips to Offline:

1. `Backend.reveal(id)` → `SDK.setDoc(...)` was called.
2. Firestore SDK detected no network and queued the write in its in-memory (and, if enabled, IndexedDB-persisted) mutation queue.
3. `setDoc` returned a Promise that **did not settle** — neither resolved nor rejected.
4. `toggleReveal`'s `.catch` handler consequently never ran; no rollback, no flash.
5. The optimistic local mutation stayed applied on device A (hex looked revealed to the GM).
6. Device B saw nothing yet — no `onSnapshot` firing because the write hadn't reached the server.
7. When DevTools was flipped back to Online, the SDK flushed the queue → `setDoc` resolved → `onSnapshot` fired on both devices → hex appeared everywhere.

This is [documented Firestore behavior](https://firebase.google.com/docs/firestore/manage-data/enable-offline#configure_offline_persistence). The `.catch` path in `toggleReveal` is only reached when the write is **actually rejected** by the backend — auth failure, rules violation, or a fatal SDK error — never for a plain "network is down" case.

**The user-facing behavior we actually observed on offline (queue → sync on reconnect) is arguably the correct product behavior for a live tabletop session** where network drops are transient. Whether Phase 3 wants to keep the "reject → flash" contract as-specified or reframe it to match Firestore's actual queue-then-flush semantics is a product decision — see "Options for closing Phase 3" below.

## Latency observations

- SYNC-01, SYNC-02: not clocked with numbers. Subjective UX was "fast" — good enough to trust the ~1s threshold in normal use. If a hard number is later required, add a `console.time`/`timeEnd` pair inside `toggleReveal` and the `attachRevealed` snapshot callback.
- SYNC-03: not applicable (initial-payload rehydration has no latency threshold in the plan; only "all revealed hexes visible on first paint" was required, and it was).

## Firebase-side verification

Firebase project: `western-reaches` (from `firebase-config.js`).

Console cross-checks were not explicitly recorded per criterion during this UAT. Given SYNC-01 and SYNC-02 both propagated to the second device, the reveal/hide docs at `revealed/{hexId}` were being written and deleted correctly server-side. If a defect is later suspected, re-run SYNC-01 with the Firestore console open on `revealed/` and confirm the doc appears with a `t` field on tap.

## Demo-mode regression check

Not exercised in this UAT — the test was against the live GH Pages URL, not localhost. Demo mode was not touched. `firebase-config.js` is unchanged (no bogus-projectId workaround was used).

## Phase 3 status

**Phase 3 status: BLOCKED on SYNC-04.** As written, SYNC-04 requires the verbatim flash message to fire on a forced write failure. The plan's recommended failure-inducing method (DevTools Offline) does not force a rejection, so the flash path was not exercised. Three of four SYNC requirements are verified against live Firebase.

## Options for closing Phase 3

1. **Re-run SYNC-04 with a real rejection-inducing method** (unblocks phase as-specified).
   - Deploy a temporary Firestore rules block on `revealed/` writes for ~30s, tap Reveal on device A, expect rollback + flash within seconds. Revert the rule.
   - OR: edit `firebase-config.js` locally to a bogus `projectId` (e.g. `"western-reaches-DEADBEEF"`), reload, sign in, tap Reveal, observe rollback + flash. **Revert immediately** — do NOT commit.

2. **Reframe SYNC-04's contract** to match Firestore reality (unblocks phase, changes requirements).
   - Update REQUIREMENTS.md: SYNC-04 becomes "on a **rejected** write (auth/rules/fatal), the app rolls back and shows `Couldn't save the change — check your connection`. On network drop, the write is queued and sync resumes transparently on reconnect."
   - Verify the rollback path once via Option 1's rules-block method, then close.

3. **Defer SYNC-04 to a post-MVP hardening phase** (unblocks phase, tracks the gap).
   - Mark SYNC-04 as `deferred` in this SUMMARY's frontmatter and REQUIREMENTS.md.
   - Add a Phase 4.1 or backlog item to verify the rollback path with a proper rejection method.

Option 1 is the fastest path to a green Phase 3 without changing the product contract. Option 2 is the most honest — it says "we tested what actually happens in the wild (network drops) and the app handles it correctly (queue + sync)."

## Feeds into Phase 4

- The queue-on-offline behavior is a **feature to lean into** for search/navigation UX: a GM can plan a route offline and it'll sync when they're back at the table with wifi. Phase 4's search/GM-mode work should not assume all state changes have already propagated to other devices.
- SYNC-01/02/03 are trustworthy for player-facing UX in normal network conditions — Phase 4 can rely on live-sync working.

## Self-Check

- File exists at `.planning/phases/03-live-sync-across-devices/03-02-SUMMARY.md`: yes.
- All four SYNC criteria have a verdict: yes (3 PASS, 1 FAIL).
- Verbatim string `Couldn't save the change — check your connection` appears in this file: yes.
- Firebase project ID `western-reaches` referenced: yes.
- Phase-3-status line present: yes ("Phase 3 status: BLOCKED on SYNC-04").

## Self-Check: PASSED (SUMMARY structure correct; underlying UAT verdict is partial)

---
*Phase: 03-live-sync-across-devices*
*Completed: 2026-09-22*
