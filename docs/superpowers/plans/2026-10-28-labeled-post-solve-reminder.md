# Labeled Post-Solve Reminder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Make the optional daily reminder action understandable at a glance on the completed-puzzle screen.

**Architecture:** Keep `DailyReturnCard` in its current result-screen position and keep `ReminderView` as the only place that configures local notifications. Replace the bell-only navigation affordance with a compact text-and-symbol control whose title reflects whether a reminder is scheduled. Preserve its accessibility identifier, permission timing, and reminder behavior.

**Tech Stack:** SwiftUI, `ReminderStore`, XCUITest.

**Spec:** Current product goal and `docs/product/native-growth-scorecard.md` return-loop evidence; simulator screenshot from `testSolvedResultShowsCountdownAndOptionalReminderWithoutScrolling`.

## Global Constraints

- Reminders remain opt-in and local to iOS.
- Request notification permission only when the player saves an enabled reminder in `ReminderView`.
- Keep `DailyReturnCard` visible in the completed-result viewport at default and accessibility text sizes.
- Keep the existing `configureReminder` accessibility identifier and no-pressure reminder copy.

## Review Focus

- Narrow iPhone width: the countdown and reminder label stay readable and tappable.
- Accessibility text sizes: the label wraps without clipping or pushing the button offscreen.
- Disabled and scheduled states: the visible copy matches the action that opens reminder settings.
- Denied notification permission: the action still opens the existing explanation and iOS Settings route.
- Touch target and VoiceOver: the action remains at least 44 points and has a clear name and hint.

---

### Task 1: Label the post-solve reminder action

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/DailyReturnCard.swift`
- Modify: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- Consumes: `AppModel.reminders.nextReminder`, the existing `ReminderView`, and `configureReminder` accessibility identifier.
- Produces: a visible `Remind me` or `Edit time` control; the existing reminder configuration and scheduling contract is unchanged.

- [x] **Step 1: Add a UI assertion that the unscheduled control is visibly named “Remind me” and remains hittable in the first result viewport.**
- [x] **Step 2: Run `testSolvedResultShowsCountdownAndOptionalReminderWithoutScrolling` and confirm the new label assertion fails against the current icon-only control.**
- [x] **Step 3: Replace the icon-only link label with a compact `Label`, reflect the scheduled state in its text, retain the existing accessibility hint and identifier, and use a minimum 44-point target.**
- [x] **Step 4: Run the focused default-size and accessibility-size reminder UI tests; inspect the captured completed-result screenshot for layout and hierarchy.**
- [x] **Step 5: Run the Core suite and focused native UI suite; inspect the diff and commit the change.**
- [ ] **Step 6: Create the signed Release archive.** Blocked on Xcode accepting the saved Apple Developer account: the archive command was rejected during provisioning and reported no profiles for the app or widget targets.
