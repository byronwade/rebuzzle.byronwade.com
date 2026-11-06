# Server-Confirmed Level-Up Implementation Plan

> **For agentic workers:** Use the native execution method in this session. Work through the tasks in order and verify each deliverable.

**Goal:** Celebrate a level earned by the current daily completion only after the matching server snapshot confirms it.

**Architecture:** Extend the existing pre-submit Journey baseline and post-completion confirmation in `AppModel`. Render a compact, accessible result card from `JourneyRewards`, gated by the same complete, matching snapshot used for Journey progress.

**Tech Stack:** Swift 6, SwiftUI, RebuzzleCore.

**Spec:** `docs/superpowers/specs/2026-11-04-server-confirmed-level-up-design.md`

## Global Constraints

- Keep level and XP authoritative on the server.
- Require a complete fresh pre-submit baseline, complete post-submit backfill, and exact matching recent puzzle entry before celebration.
- Scope state to the signed-in account and completed puzzle.
- Respect Dynamic Type, VoiceOver, Reduce Motion, and the existing haptics preference.
- Do not add or run tests for this task; compile and inspect the release artifact instead.

## Review Focus

- Cached, partial, failed, or stale Journey responses must not celebrate a level.
- Account changes must clear pending and published celebration state.
- A level change must be tied to the exact puzzle, date, attempts, and outcome.
- Reduce Motion and accessibility text sizes must retain a readable result card.
- Haptics must not fire unless enabled in settings.

---

### Task 1: Confirm a level increase for the completed round

**Files:**
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`

**Interfaces:**
- Produce `JourneyLevelCelebration(puzzleID:puzzleDate:level:)` as observable state.
- Extend the existing baseline and pending completion record with the prior level.

- [x] Refresh Journey progress before guess submission and capture the complete same-account server level; if refresh fails, allow the guess but do not create a reward baseline.
- [x] Publish a level celebration only when a complete snapshot confirms the exact completion and reports a higher level.
- [x] Clear level celebration state on account changes and failed confirmation.

### Task 2: Present an accessible result milestone

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/JourneyRewards.swift`

**Interfaces:**
- Render `journeyLevelUp` only when `confirmedProgress` matches the celebration's puzzle and date.

- [x] Add a compact branded level-up card in the existing result reward stack.
- [x] Use the existing Reduce Motion and haptics preferences, and support Dynamic Type and VoiceOver.

### Task 3: Prepare and upload build 44

**Files:**
- Modify: `apps/ios/project.yml`
- Modify: `apps/ios/Release/Checklist.md`

- [x] Set `CURRENT_PROJECT_VERSION` to `44`.
- [x] Build and archive the Release app, confirm bundle/version/build metadata, and upload to App Store Connect.
- [x] Record the archive, upload result, and existing Family invite URL in the release checklist.
