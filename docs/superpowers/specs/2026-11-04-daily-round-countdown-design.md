# Daily Round Countdown Design

## Intent

Give a player one calm, consistent view of when the next daily puzzle arrives and an easy way to return to an unfinished round. This directly advances the existing product goal of a satisfying daily game with useful, opt-in ways back into play.

## Current state

- The active Play screen shows the puzzle date but no reset countdown.
- `DailyReturnCard` shows a server-provided countdown only after a round is complete.
- The existing Home and Lock Screen widget derives local midnight, while the app’s daily payload already contains the authoritative `nextPuzzleTime` for the account’s saved time zone.
- The app already has a WidgetKit extension, a `rebuzzle://play` route, and an opt-in notification reminder.

## Goals

- Show a restrained next-puzzle countdown while an unfinished daily is open.
- Make the app, widget, and Live Activity use the server’s same reset timestamp.
- Correct the widget’s current local-midnight assumption by sharing only the reset timestamp through a dedicated App Group.
- Offer an opt-in ActivityKit Live Activity that shows guesses remaining, a next-puzzle countdown, and a tap target that returns directly to Play.
- Update the activity only after a confirmed server response; end it when the round completes. Mark it stale at the reset so it can say that a fresh puzzle is ready if the app is not open.
- Use the existing Thorbis palette and typography with native system presentation, clear labels, and accessible timer copy.

## Product and privacy decisions

- Live Activities are **off by default**. The player enables them in Settings and can switch them off there; iOS can also disable them for the app.
- Activity content contains only an opaque puzzle identifier for lifecycle matching, the reset date, and guesses remaining. It never contains the answer, explanation, hint text, submitted guesses, account identity, or authentication data.
- The App Group contains only the latest server reset timestamp. It is not a second source of puzzle or account data.
- The countdown is to the next puzzle, never a solve deadline. Progress remains safe at reset and copy does not imply a streak penalty.
- The Home/Lock Screen widget is the persistent countdown surface. Apple limits a Live Activity to eight active hours; use it as an active-round companion and do not promise it will remain visible for a full day. No ActivityKit push notifications or background polling are added.
- When a round completes, end its Live Activity immediately and allow a short, answer-free Lock Screen recap for up to 20 minutes. A reset makes an unfinished activity stale; foreground refresh reconciles it with the new puzzle.
- If the server reset is unavailable, retain the last shared timestamp. If no valid timestamp exists, the widget falls back to its existing local-midnight behavior; the app must not invent a server reset date.

## Interaction and visual behavior

### Play

Place a small secondary countdown below the daily date while the round is unfinished. Use the exact reset timestamp already returned by the daily API. At zero, say that a fresh puzzle is ready; do not show a red urgency state or interrupt an answer.

### Widget

Read the shared timestamp for Home Screen and Lock Screen widget families. Continue using WidgetKit’s native timer text so iOS updates the countdown without app-side polling. At zero, show “A fresh puzzle is ready” and keep the existing tap-through to Play.

### Live Activity

- Lock Screen: Rebuzzle mark, “Today’s puzzle,” guesses remaining, and “Next puzzle in” with a system countdown.
- Dynamic Island compact/minimal/expanded presentations: prioritize the remaining-guess count and the same timer; every tap opens the active daily Play screen.
- When stale at reset: show “A fresh puzzle is ready.” Do not imply the previous round is still playable.
- Dark and light appearances use system-adaptive neutrals plus Rebuzzle blue. Keep Live Activity typography native and glanceable.

### Settings

Add one explicit “Live round” toggle with plain copy explaining what appears and that the answer is never shown. If iOS has disabled Live Activities, explain how to enable them in iPhone Settings without repeatedly prompting or silently changing the player’s choice.

## Constraints

- iOS 18 minimum; use the existing SwiftUI app, WidgetKit extension, and RebuzzleCore package.
- The existing server remains authoritative for puzzle date, reset time, guesses, and completion.
- App Group identifier: `group.com.byronwade.rebuzzle`; configure it for the app and widget extension.
- `NSSupportsLiveActivities` must be enabled in the iOS app target. No new external package or backend endpoint is required.
- Accessibility, Dynamic Type, dark mode, Reduce Motion, and the existing reminder behavior remain supported.

## Non-goals

- No timer that limits how long a player can think or pause.
- No answer or hint disclosure on a system surface.
- No ActivityKit push tokens, server-pushed updates, notification prompts, streak warnings, or paid gameplay.
- No claim that Live Activities persist all day or improve retention without player evidence.

## Acceptance evidence

- A Release build compiles the app, shared core, and widget extension with the App Group and Live Activity declarations.
- Archive metadata and signing show the same app identifier/team, with the shared group present for both relevant targets.
- Manual simulator inspection covers active Play, the existing widget families, a compact/expanded Dynamic Island, completion, and the stale/reset state in light and dark appearance.
- Review verifies the system surfaces contain no answer, guess text, or account data.
- Do not run automated tests in this task, per the higher-priority session instruction.

## Apple guidance

Apple describes Live Activities as glanceable tracking for a defined short-to-medium activity and states the eight-hour active limit in its [Live Activities HIG](https://developer.apple.com/design/human-interface-guidelines/live-activities) and [ActivityKit lifecycle guide](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities). The design uses ActivityKit’s standard foreground request/update/end lifecycle and `ActivityConfiguration` in the existing widget extension.
