# Native Journey Badge Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a one-time, server-confirmed badge unlock in the matching daily result.

**Architecture:** `AppModel` captures the complete Journey summary and recent result-key baseline before submitting a possible terminal result, then arms that transient context only after the server confirms completion. It emits only badge IDs present in a complete matching snapshot but absent from the baseline, only when the completed puzzle is the sole newly recorded result, and only when the badge-driving summary counters advance exactly by that result's contribution. This closes the gap caused by `recentEntries` being bounded while the summary includes older rows. `JourneyRewards` consumes and presents the matching event from a transient queue using the existing `JourneyProgress.Badge` definitions and `Theme`.

**Tech Stack:** Swift 6, SwiftUI, `RebuzzleCore`, existing server progress API, existing simulator fixtures.

**Spec:** `docs/superpowers/specs/2026-11-03-native-badge-unlock-design.md`

## Global Constraints

- Use only the four existing server-defined Journey badge IDs; do not change badge or XP rules.
- No optimistic unlock, duplicate award, new endpoint, new dependency, or second achievement catalog.
- Do not arm an unlock check from restore, pull-to-refresh, or account upgrade.
- Keep failure/syncing states truthful; require complete backfill and a matching puzzle ID/date.
- Preserve iOS 18+, current native navigation, Dynamic Type, light/dark, Reduce Motion, and account isolation.
- Do not add or run tests in this turn; verify through simulator build and rendered states.

## Review Focus

1. A stale snapshot from another account must not leak a badge into the result.
2. A matching snapshot without the completed puzzle entry must not unlock anything.
3. Initial restore or manual refresh must not replay historical awards.
4. Offline, incomplete, or delayed responses must not display success.
5. Multiple new badge IDs must remain legible at accessibility sizes and avoid a repeated announcement.
6. A result reached through `revealAnswer` may earn finish badges but must never infer solve-only badges.
7. If the matching completed result and any other new result appear after the baseline, attribution is ambiguous; show no badge unlock.
8. A delayed old result outside the `recentEntries` window must not be attributed to the current puzzle; any unexpected change in `finishes`, `solves`, `firstGuessSolves`, or `unassistedSolves` suppresses the unlock.

## HIG Source Receipt

Consulted 2026-11-03. See the spec for the source list and all 22 applicability rows. Most relevant: Thorbis D-025; HIG-001, 002, 003, 007, 008, 009, 010, 011, 015, 016, 017, 020, 021, 022. Live Apple topics: Designing for Games, Feedback, Motion, Playing Haptics, Accessibility, and Typography.

---

### Task 1: Carry a result-scoped badge check through Journey refresh

**Files:**
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`
- Modify: `apps/ios/Core/Sources/RebuzzleCore/JourneyProgressSnapshot.swift` only if an existing matching-result helper is insufficient

**Interfaces:**
- Add an ephemeral `JourneyBadgeUnlock` value with `id`, `accountID`, `puzzleID`, `puzzleDate`, and `badgeIDs`.
- Add a transient presentation queue to `AppModel` plus a consume operation keyed to the matching result.
- Change `scheduleJourneyRefresh` to accept an optional terminal game context only from `submit` and `revealAnswer`.

- [x] Capture the complete pre-request summary baseline and recent result keys before sending a guess or reveal request; arm it only after the server confirms the matching terminal result.
- [x] After refresh, emit an event only when the account still matches, backfill is complete, the summary exists, `includesResult` confirms the same result, that result is the sole new result key, the badge-driving counter deltas exactly match the terminal result, and the new badge-ID set is nonempty.
- [x] Keep an unresolved check through transient failure or a complete response that has not recorded the result yet; clear it when a matching result is confirmed with no badge delta or when attribution is ambiguous.
- [x] Leave ordinary restore, account-upgrade, and manual refresh calls without a completion context; clear transient events on account identity and daily puzzle changes.
- [x] Inspect the changed Swift source and `git diff --check`.

### Task 2: Present the confirmed unlock in the existing result reward

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/JourneyRewards.swift`
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift` only if result ownership or event consumption requires it

**Interfaces:**
- `JourneyRewards(game:)` continues to render existing stars, XP, weekly trail, and Journey action.
- Map confirmed IDs through `JourneyProgress(summary:).badges`; do not create separate badge copy or rules.

- [x] Add a compact inline badge row inside the existing result surface, before the weekly trail, with “Badge unlocked”, badge name, and its existing detail.
- [x] Support multiple newly earned badges without adding a nested card or action.
- [x] Animate only the confirmed unlock with a brief, interruptible reveal; disable movement under Reduce Motion.
- [x] Announce the new badge name(s) once when VoiceOver is running; keep focus where it was and consume the event once.
- [x] Add no haptic and preserve the current syncing/unavailable state when confirmation is absent.
- [x] Inspect the changed Swift source and `git diff --check`.

### Task 3: Build and inspect result states on native simulators

**Files:**
- Modify: `apps/ios/Rebuzzle/App/PreviewData.swift` only if an existing debug fixture cannot produce a confirmed new badge and matching result.
- Evidence: `/tmp/rebuzzle-badge-unlock-*.png`

- [x] Build the simulator target using the repository’s existing scheme and a supported iOS simulator.
- [x] Launch the UI fixture and inspect a confirmed single-badge result, a multi-badge result, a restored no-unlock result, and a hidden older-result counter delta that must fail closed. Add the narrow DEBUG-only hidden-history fixture input if needed.
- [x] Inspect the result at Accessibility XXXL; save `/tmp/rebuzzle-badge-unlock-xxxl.png`.
- [ ] Verify Reduce Motion on and off, Light and Dark appearance, and a representative iPad window.
- [x] Record the simulator/device, OS, build command, fixture inputs, screenshot path, and untested items in the spec and this ledger.
- [x] Do not claim VoiceOver runtime behavior, physical-device performance, or full release compliance without direct verification.

## Completion Gate

The simulator build and rendered states must match the acceptance criteria. Any untested applicable HIG requirement remains explicitly open; this plan does not authorize a release-readiness claim or TestFlight upload.
