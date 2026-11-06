# Daily Round Countdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the next-puzzle countdown consistent across active Play, the existing widget, and an optional Live Activity that resumes an unfinished daily round.

**Architecture:** The app writes only the server-provided reset timestamp to a dedicated App Group. The widget reads that value without a network request. An opt-in ActivityKit service mirrors the active round’s reset time and guesses remaining, updates after server-confirmed submissions, and ends when the round completes. Existing deep-link routing opens Play.

**Tech Stack:** Swift 6, SwiftUI, ActivityKit, WidgetKit, RebuzzleCore, XcodeGen.

**Spec:** `docs/superpowers/specs/2026-11-04-daily-round-countdown-design.md`.

## Global Constraints

- iOS 18 minimum; preserve the existing bundle IDs, server-authoritative game flow, and native app navigation.
- Use server `nextPuzzleTime` as the single reset date; do not introduce a solve deadline, background polling, or new backend route.
- Live Activities are opt-in and show no answer, hints, guesses, account ID, or credentials.
- Share only the reset timestamp through `group.com.byronwade.rebuzzle`; no tokens, answers, guesses, or personal data enter the App Group.
- Live Activities can end automatically after eight hours; the widget is the persistent countdown surface.
- Do not add or run automated tests in this task under the higher-priority session instruction. Verify with Release/simulator builds and visual inspection.

## Review Focus

- The server reset timestamp is read consistently by Play, widget, and Live Activity, including after account time-zone changes and app relaunch.
- App Group entitlements are present for both the app and widget extension and are included in provisioning.
- Activity requests happen only while the app is foregrounded and only after the player opted in.
- A confirmed guess updates the count; an unconfirmed/ambiguous submission never changes it.
- Completed, stale, disabled, unavailable, and duplicate ActivityKit states do not leave misleading activities behind.
- Large text, dark appearance, no-Dynamic-Island devices, and VoiceOver labels remain understandable.

## Tasks

### Task 1: Share the authoritative reset date

**Files:**
- Create app and widget entitlement files under `apps/ios/Rebuzzle/Resources` and `apps/ios/RebuzzleWidgets/Resources`.
- Modify `apps/ios/project.yml` and regenerate `apps/ios/Rebuzzle.xcodeproj/project.pbxproj`.
- Modify `apps/ios/Rebuzzle/App/AppModel.swift` and `apps/ios/RebuzzleWidgets/DailyPuzzleWidget.swift`.

- [ ] Configure the same App Group for app and widget targets and enable `NSSupportsLiveActivities` for the app.
- [ ] Persist only the server reset timestamp to the group defaults after a successful daily load and reload the existing widget timeline.
- [ ] Make widget timeline and “fresh puzzle ready” copy use the shared reset date, with existing local-midnight fallback only when no valid timestamp is cached.

### Task 2: Add the opt-in ActivityKit round

**Files:**
- Create `apps/ios/Core/Sources/RebuzzleCore/DailyRoundActivityAttributes.swift`.
- Create `apps/ios/Rebuzzle/Services/DailyLiveActivityStore.swift`.
- Create `apps/ios/RebuzzleWidgets/DailyRoundLiveActivity.swift`.
- Modify `apps/ios/RebuzzleWidgets/DailyPuzzleWidget.swift`, `apps/ios/Rebuzzle/App/AppModel.swift`, and `apps/ios/Rebuzzle/Features/SettingsView.swift`.

- [ ] Define shared static/dynamic ActivityAttributes with only puzzle identity, reset date, guesses remaining, and completion state.
- [ ] Add a default-off setting and clear handling for iOS Live Activities being disabled.
- [ ] Start or reconcile one activity from the foreground app after session restore; update only after a confirmed guess; end on completion/disable; mark stale at reset.
- [ ] Implement Lock Screen and Dynamic Island layouts with native adaptive colors, concise status, a countdown, and a tap-through to Play.
- [ ] Convert the existing single-widget entry point into a WidgetBundle that includes both the Home/Lock Screen widget and the Live Activity.

### Task 3: Put the countdown into active Play

**Files:**
- Create `apps/ios/Rebuzzle/Features/DailyPuzzleTicker.swift`.
- Modify `apps/ios/Rebuzzle/Features/TodayView.swift`.

- [ ] Show a compact server-timestamp countdown below the active puzzle date, using calm copy and no solve deadline.
- [ ] Show a ready state at zero while the existing midnight refresh flow loads the new daily.

### Task 4: Verify the shipped surfaces

- [ ] Build the iOS app and widget extension for simulator and Release; inspect archive app group and Live Activity declarations.
- [ ] Manually inspect Play, Home/Lock Screen widget, Lock Screen Live Activity, compact/expanded Dynamic Island, completion, and stale/reset states in light and dark appearance.
- [ ] Confirm the activity payload and App Group store contain none of the prohibited answer, guess, credential, or account data.
- [ ] Record exact build and visual-verification evidence in the execution ledger; do not claim physical-device or retention results from simulator evidence.
