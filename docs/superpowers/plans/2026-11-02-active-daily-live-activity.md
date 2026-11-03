# Active daily puzzle Live Activity Implementation Plan

> **For agentic workers:** Native implementation in this session. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let a player glance at progress on an active Rebuzzle daily puzzle and return directly to it without adding solving-time pressure.

**Architecture:** Share ActivityKit attributes and a small content state through `RebuzzleCore`. An app-side coordinator reconciles ActivityKit with server-confirmed `GameSession` progress, while the existing WidgetKit extension renders the Live Activity and the app’s return router opens Today.

**Tech Stack:** SwiftUI, ActivityKit, WidgetKit, RebuzzleCore, existing `AppModel` and `ReturnRouter`.

**Spec:** `docs/superpowers/specs/2026-11-02-active-daily-live-activity-design.md`.

## Global Constraints

- Start only after a confirmed guess or a revealed hint; never when the player merely opens the app.
- Never display clue, answer, typed guess, explanation, account identity, deadline, or countdown.
- Keep one activity per device, and end it when the puzzle ends or changes, the player disables it, or system support is unavailable.
- Preserve the existing server-authoritative game, three scored guesses, and untimed continued solving.
- Use local ActivityKit updates only; add no APNs token flow, server change, App Group, or dependency.
- Keep iOS 18 minimum, Dynamic Type/readability, VoiceOver state text, and normal gameplay when Live Activities are unavailable.

## Review Focus

- Restored unfinished run — recreate or update only when current daily progress exists.
- Score-locked extended solving — show `3/3` and “Keep solving” without implying the puzzle is over.
- Stale activity from another date — end it without replacing the current board.
- System-disabled or app-disabled activity — fail quietly and keep the game playable.
- Completed round — show a spoiler-safe final state briefly, then let the system remove it.

---

### Task 1: Define the shared activity state

**Files:**
- Create: `apps/ios/Core/Sources/RebuzzleCore/DailyPuzzleLiveActivityAttributes.swift`

- [ ] Define `DailyPuzzleLiveActivityAttributes` with puzzle ID/date and a Codable, Hashable state containing scored guesses, hints, and a phase (`solving`, `scoreLocked`, `solved`, `revealed`).
- [ ] Keep all fields spoiler-safe and independent of account identity.

### Task 2: Add ActivityKit lifecycle coordination

**Files:**
- Create: `apps/ios/Rebuzzle/Services/DailyPuzzleLiveActivityCoordinator.swift`
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`

- [ ] Implement one idempotent sync operation that checks the app preference and `ActivityAuthorizationInfo`, updates a matching activity, ends obsolete activities, or requests one for a progressed active puzzle.
- [ ] Reconcile after `restore`, update after confirmed guesses and hints, and end on solve, reveal, daily change, or opt-out.
- [ ] Keep ActivityKit failures isolated from puzzle state and network errors.

### Task 3: Render and route the Live Activity

**Files:**
- Modify: `apps/ios/RebuzzleWidgets/DailyPuzzleWidget.swift`
- Modify: `apps/ios/Rebuzzle/Resources/Info.plist`
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`

- [ ] Add Lock Screen plus compact, minimal, and expanded Dynamic Island presentations using date, guess progress, hint count, and phase only.
- [ ] Add `NSSupportsLiveActivities` to the app plist and a `.liveActivity` `DailyEntrySource` for the existing deep-link route.
- [ ] Open `rebuzzle://play?source=liveActivity` directly at Today’s puzzle.

### Task 4: Add player control and verify integration

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/SettingsView.swift`
- Modify as required: `apps/ios/Rebuzzle.xcodeproj/project.pbxproj`

- [ ] Add a default-on “Show active puzzle on Lock Screen” control in the existing return/reminder settings; turning it off ends the current activity.
- [ ] Ensure the Live Activity target includes shared attributes and both widget configurations.
- [ ] Build the app and WidgetKit extension for an iOS Simulator destination; run `git diff --check` and inspect state-flow/target membership.
