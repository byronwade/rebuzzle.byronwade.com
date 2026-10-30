# Playful Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Simplify navigation and make every daily puzzle feel rewarding, shareable and easy to return to.
**Architecture:** Pure JourneyProgress derives rewards from the existing account-scoped Journal. Native tab selection lives in AppModel; composed reward and Journey views reuse Theme. Server scoring and Eve remain authoritative and separate.
**Tech Stack:** Swift 6, SwiftUI, RebuzzleCore, XCTest, Swift Testing.
**Spec:** docs/superpowers/specs/2026-10-26-playful-journey-design.md

## Global Constraints
- iOS 18 minimum; use existing native app and Thorbis tokens.
- No extra guesses, paid boosts, invented scores, surprise notification opt-ins or answer leakage.
- XP is on-device Journey progress; no claim that it syncs with account statistics.
- Preserve account isolation, accessible text, reduced motion and dark mode.

## Review Focus
- Duplicate restored completions must not add XP twice.
- Week boundaries and future dates must not create false weekly progress.
- Identity changes must clear pushed views and display the right journal.
- Large type must leave composer and navigation reachable.
- Completed games must retain Eve history and spoiler-free sharing.

### Task 1: Earned progression
**Files:** Create Core/Sources/RebuzzleCore/JourneyProgress.swift and Core/Tests/RebuzzleCoreTests/JourneyProgressTests.swift under apps/ios.
**Interfaces:** JourneyProgress(entries: [JournalEntry], now: Date = Date(), calendar: Calendar = .current), totalXP, level, levelXP, weeklyDays, badges; static points(won: Bool, attempts: Int, hintsUsed: Int) -> Int. Badge has id, title, detail, symbol, progress, goal, earned.
- [x] Write tests for empty/duplicate entries, reward outcomes, level boundary, Monday boundary, distinct days, future exclusion and isolated empty identity.
- [x] Run swift test --package-path apps/ios/Core; expect missing JourneyProgress failure.
- [x] Implement deterministic derivation and rerun the complete core suite; expect all pass.

### Task 2: Native play journey
**Files:** Modify App/RebuzzleApp.swift, App/AppModel.swift, Features/ProgressScreen.swift, Features/TodayView.swift, Features/SettingsView.swift, Design/Theme.swift and RebuzzleUITests/GameplayUITests.swift. Create Features/JourneyRewards.swift.
**Interfaces:** AppTab.play/journey/you, AppModel.selectedTab; JourneyRewards(game:) displays immutable earned result. Journey screen links to existing JournalView; result has a button selecting Journey.
- [x] Add UI test navigating Play → solve → Journey → Journal → You → Play, checking preserved result and earned XP; run against old app and verify missing new navigation fails.
- [x] Implement three tabs, Journey hero/weekly goal/badge collection, result animation and journey action, concise daily/help copy, invite share sheet and real bundle version.
- [x] Run native runtime and UI suite; inspect light, dark, large text and iPad. Expect no failures or clipped controls.

### Task 3: Launch and delivery
**Files:** docs/marketing/2026-10-26-native-launch.md and output release evidence.
- [x] Write truthful App Store copy, screenshot captions and optional social drafts; don't send campaigns.
- [x] Review final diff; run meaningful affected tests and verify signed production bundle excludes fixtures.
- [x] Archive/upload 1.0.0 (6), save TestFlight notes, verify automatic group access and tell user iPhone update steps.

Execution: continue in the task's dedicated feature checkout; no shared/main branch edits. Agent dispatch was attempted but rejected by the session's agent limit, so use local implementation and review with explicit evidence. Existing user authorization covers implementation, branch push and TestFlight upload. No new approval is required for this continuation.
