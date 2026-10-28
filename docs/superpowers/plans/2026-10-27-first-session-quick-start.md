# First-session quick-start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Help a new iOS player understand the rebus and scoring rules before their first daily puzzle, then remember that they saw the guide.

**Architecture:** Reuse `HelpView` as a one-time sheet presented only after `model.daily` is available. Store dismissal in `@AppStorage`; keep manual Help as the same sheet. Add deterministic first-run/returning-player controls only to the existing DEBUG UI fixture path.

**Tech Stack:** SwiftUI, `@AppStorage`, XCTest/XCUITest, existing `RebuzzleUITests` fixture.

**Spec:** `docs/superpowers/specs/2026-10-27-first-session-quick-start-design.md`

## Global Constraints

- Preserve the current daily puzzle, draft, score, and hint state when the guide is dismissed.
- Do not add a network dependency, account requirement, paywall, purchase gate, or new package.
- Present no more than once per installation; the manual Help action remains available.
- Do not claim retention or revenue lift from implementation or simulator tests.
- Preserve the pre-existing mixed worktree; do not stage, commit, push, submit, or upload.

## Review Focus

- Daily data is still loading or unavailable — guide must not cover loading/error recovery; Task 1 adds a fixture response and asserts the retry state remains visible.
- Dismissal by either the primary CTA or close control — the same puzzle remains usable; Task 1 covers both paths.
- App relaunch after dismissal — guide stays dismissed without relying on launch-argument defaults; Task 1 relaunch test.
- Accessibility XXXL — guide text and start action remain readable and tappable; Task 1 accessibility test.
- Existing UI tests — deterministic returning-player fixture state prevents order-dependent first-run sheets; Task 1 fixture hook and full focused UI regression run.

---

### Task 1: Implement and verify the first-session quick-start

**Files:**
- Modify: `apps/ios/RebuzzleUITests/GameplayUITests.swift`
- Modify: `apps/ios/Rebuzzle/App/PreviewData.swift` (DEBUG-only onboarding state and 503 fixture for unavailable daily data)
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

**Interfaces:**
- Consumes: existing `launchFixture(extraArguments:)`, `HelpView`, and daily UI fixture.
- Produces: `@AppStorage("hasSeenFirstSessionQuickStart")`, `HelpView(firstSession: Bool = false)`, and four passing onboarding UI tests.

- [x] **Step 1: Add deterministic fixture controls and the UI tests before production behavior.**
  - Fresh install: wait for “Your first puzzle”; assert “Sun + flower = sunflower” and “Three scored guesses. Then keep solving until it clicks.”; assert “lighthouse” stays hidden for the fixture’s daily; dismiss with “Let’s play”; submit a wrong guess and confirm the answer remains hidden; relaunch without reset flags and assert the guide does not appear; open toolbar Help and assert the full guide still works.
  - Existing install: simulate prior device credentials and puzzle progress with no quick-start preference; assert the migration skips the automatic guide.
  - Accessibility XXXL: assert the guide’s close action is tappable, capture the quick-start, close it, and scroll until the puzzle input is reachable.
  - Unavailable daily: return 503 from the fixture's `/api/puzzle/today`; assert the loading error/retry remains visible and no automatic guide appears.
  - Keep all existing fixture launches in returning-player state so unrelated UI tests do not depend on test order.
- [x] **Step 2: Run the three tests to establish RED.**
  - Run: `xcodebuild -quiet -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'platform=iOS Simulator,id=BB383330-674F-4597-9B9A-1530B80CCBEE' -derivedDataPath /tmp/rebuzzle-eve-nudge-dd -parallel-testing-enabled NO -only-testing:RebuzzleUITests/GameplayUITests/testFirstSessionQuickStartExplainsPuzzleAndPersistsAfterRelaunch -only-testing:RebuzzleUITests/GameplayUITests/testFirstSessionQuickStartWorksAtAccessibilitySize -only-testing:RebuzzleUITests/GameplayUITests/testFirstSessionQuickStartWaitsForDailyAvailability test`
  - Expected: 2 fail at the missing first-session sheet; the unavailable-daily guard passes.
- [x] **Step 3: Implement the DEBUG fixture controls and one-time guide.**
- In `AppModelFactory.make()`, let `--ui-fresh-install` remove the preference and default fixture launches set returning-player state before `TodayView` reads it; migrate installs with an existing device credential as already onboarded; add fixture-only prior progress and the daily 503 response.
  - In `TodayView`, use `@AppStorage("hasSeenFirstSessionQuickStart")`, present `HelpView(firstSession: true)` once after `model.daily` is available, and mark the guide seen on any dismissal. Keep toolbar Help opening the complete guide.
  - Make the first-session variant compact: keep the rebus example, accurate three-scored-guesses/continued-solving explanation, and a direct “Let’s play” action; keep the detailed rules and Plus explanation in manual Help.
- [x] **Step 4: Rerun the onboarding tests and verify GREEN.**
  - Expected: all 4 pass, including first-guess submission, returning-install migration, persistence after relaunch, accessibility-size use, and no blocking guide when the daily is unavailable.

### Task 2: Verify the integrated first-session experience

**Files:**
- Review: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Review: `apps/ios/Rebuzzle/App/PreviewData.swift`
- Review: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

- [x] Run the first-session tests and focused existing gameplay, keyboard-dismissal, Eve, and share/result UI regressions on iPhone 16 Pro (`BB383330-674F-4597-9B9A-1530B80CCBEE`).
- [x] Inspect the standard and accessibility XXXL quick-start screenshots; confirm dismissal leaves the original puzzle usable.
- [x] Build the iOS Release simulator configuration and run `git diff --check`.
- [x] Record the exact simulator/test/build evidence and note that physical-device behavior and retention impact remain unverified; complete the scoped code review.
