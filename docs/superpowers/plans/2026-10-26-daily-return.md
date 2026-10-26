# Daily Return Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Reliable countdown and native, enjoyable routes back to daily play.
**Architecture:** Pure DailyReturnTiming in RebuzzleCore owns parsing, clamped time and calendar reminder dates. ReminderStore owns OS authorization/scheduling. One ReturnRouter hands notification/URL/shortcut requests to RootView. WidgetKit uses the local reset schedule without account data.
**Tech Stack:** Swift 6, SwiftUI, UserNotifications, AppIntents, WidgetKit, XCTest/Swift Testing.
**Spec:** docs/superpowers/specs/2026-10-26-daily-return-design.md

## Global Constraints
- iOS 18; opt-in daily reminders, at most 60 pending notifications; no new credential access.
- App countdown uses server deadline. Widget labels local reset schedule; no invented completion state.
- Preserve drafts, identity isolation, accessibility and reduced motion.

## Review Focus
- Countdown never becomes negative or counts up after deadline.
- DST and already-completed days cannot cause duplicate/today reminders.
- Denial/revocation/scheduling failure cannot appear as successful reminders.
- Cold/warm external routes open Play root without discarding draft.
- Widget extension signs and embeds in release without test fixtures.

### Task 1: Timing contracts
Files: Core/Sources/RebuzzleCore/DailyReturnTiming.swift; Core/Tests/RebuzzleCoreTests/DailyReturnTimingTests.swift.
Interfaces: deadline(String)->Date?; remaining(until:now:)->Int; reminderDates(hour:minute:completedToday:now:calendar:days:)->[Date]; nextMidnight(after:calendar:)->Date.
- [x] Tests for clamping, ISO variants, DST, skipped completion, passed time, 60-date cap; run swift test (red).
- [x] Implement pure contracts; run full core suite (green).

### Task 2: Native reminders and routes
Files: ReminderStore.swift, ReturnRouter.swift, DailyReturnCard.swift, AppModel.swift, RebuzzleApp.swift, SettingsView.swift, TodayView.swift, ReturnTests.swift, GameplayUITests.swift.
Interfaces: ReminderStore.schedule(completedToday:) remains async throws; permission status/nextReminder exposed. ReturnRouter.shared.request UUID? and openPlay(); RootView consumes requests by selecting Play and resetting its navigation identity. PlayTodayIntent opens app and calls router.
- [x] Add routing and notification construction tests; observe red.
- [x] Implement permission-aware reminders, countdown, return routing, shortcut and discovery.
- [x] Run runtime/UI suites and inspect normal/large text countdown and reminder settings.

### Task 3: Widget and delivery
Files: RebuzzleWidgets/DailyPuzzleWidget.swift, project.yml, generated project, resources Info.plist.
- [x] Add small/medium/rectangular widget with countdown, reset label, and rebuzzle://play route; generate/build project.
- [x] Verify URL route on simulator, widget registration and signed embedded extension; archive/upload build 7. Widget gallery placement remains a physical-device beta check.
- [x] Verify existing TestFlight group Testing; save notes, push branch, update PR and release evidence.

Continue existing dedicated feature branch. Explore-agent dispatch was rejected by session agent limit, so targeted known-file reads and local review are used; no claim of independent review or automatic merge.
