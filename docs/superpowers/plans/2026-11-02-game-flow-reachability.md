# Game flow action reachability — implementation plan

**Goal:** Keep the next hint action visible above the composer and surface completion, share, and tomorrow’s puzzle before Journey details.
**Spec:** `docs/superpowers/specs/2026-11-02-game-flow-reachability.md`

## Tasks

1. **Fix nudge visibility.** Add a stable scroll ID to the next-nudge control; after a hint reveal or accepted guess, scroll to that action when another hint remains, otherwise scroll to the latest conversation turn. Keep the frame-order assertion and hittability assertions.
2. **Fix result hierarchy.** Hide the redundant daily masthead on completed results and scroll to the result anchor. Keep result `DailyStreakCard` immediately after the hero; place share, spoiler-safe copy, and `DailyReturnCard` before Journey details.
3. **Verify.** Run the nudge-order, result share, solved countdown/reminder, streak order, standard and Accessibility XXXL puzzle-access, and draft-preservation UI tests. Then inspect the final diff and current CI state.

## Review focus

- The final authored hint has no stale nudge action.
- The countdown and reminder remain together; sharing still hides the answer.
- No result action is made unreachable at accessibility text sizes.

## Root-cause evidence

- The hint-count handler now targets the next nudge action, but the next wrong guess triggers the attempt-count handler afterward.
- The attempt-count handler currently scrolls only to the latest guess turn. The regression test reproduces the result: next-nudge frame maxY 496.67 is below the pinned answer-field minY 428.67.
- Hypothesis: when play remains active and authored hints remain, targeting the next nudge action from the attempt-count handler will preserve feedback and keep the next action above the composer. Game-over and score-lock destinations remain unchanged.
- A result screen recording shows the duplicate “TODAY’S PUZZLE / Make it click.” header remains above the completion card; share is partly below the tab bar and the expanded countdown is not in the first viewport even after Journey details move below it.
- Root cause: the completed state retains the full active-play masthead and date, repeating information already represented by the result and consuming vertical space before share and return actions. A regression assertion now checks the masthead is absent after a solve.
- The compact result-context streak card and standard-size spacing preserve the large solve moment while bringing the countdown and reminder above the tab bar; `testSolvedResultShowsCountdownAndOptionalReminderWithoutScrolling` now passes.

## Verification evidence

- Passed on iPhone 17 Pro simulator (iOS 26.3.1): `testEveNudgesBecomeConversationTurnsAndRemainAnswerBlind`, `testDailyResultShareOpensFromTheInitialResultViewport`, `testSolvedResultShowsCountdownAndOptionalReminderWithoutScrolling`, and `testWrongGuessThenWin`.
- Passed on iPhone 17 Pro simulator (iOS 26.3.1): `testDailyResultShareRemainsAccessibleAtAccessibilityTextSize`; Xcode logged a non-failing “Invalid frame dimension (negative or non-finite)” runtime warning while focusing the answer field, so its source remains to be identified.
- Passed on iPhone 17 Pro simulator (iOS 26.3.1): `testAccessibleCountdownAndReminders`; the test scrolls the Accessibility XXXL reminder form until the “Daily reminder” switch is reachable. The same non-failing frame warning was logged.
- Release configuration compiles for generic iOS with code signing disabled. No Apple Distribution identity or App Store Connect API key is present in this workspace, so this validates compilation only and is not a TestFlight archive.
- The standard and Accessibility XXXL `View puzzle` toolbar flows pass with the unsent answer draft preserved after returning from Study.
- Follow-up code review found no actionable issues. Full CI has not been refreshed; its predecessor-head run failed 16 tests on iOS 26.0.1. VoiceOver, iPad, and physical-device checks remain open.
