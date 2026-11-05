# Active daily puzzle Live Activity

## Intent

Give a player a quick way to remember where they left off in an unfinished daily puzzle and return to it from the Lock Screen or Dynamic Island. Rebuzzle puzzles can take time to think through, so this should preserve context without creating a deadline or asking the player to solve faster.

## Product contract

- This represents one active daily puzzle, not the wait for tomorrow’s puzzle. The existing daily countdown and reminders remain responsible for the reset and return schedule.
- Start only after the player makes a confirmed guess or reveals a hint. Opening the app alone does not create an activity.
- Keep at most one Rebuzzle Live Activity active per device. Update it after a confirmed guess, hint, or restored session.
- Show only puzzle date, scored-guess progress, hint count, and a short phase label. Never show the answer, clue, typed guess, account identity, or puzzle explanation on a glanceable surface.
- At three scored guesses, say that scoring is locked and the player can keep solving. Do not show a timer, deadline, streak threat, countdown, or alert.
- Tapping the activity opens Today through `rebuzzle://play?source=liveActivity`.
- End immediately after a solve, answer reveal, puzzle change, preference opt-out, or loss of system eligibility. Only a solve or answer reveal may leave a spoiler-safe completion state on the Lock Screen for 15 minutes; puzzle changes and opt-outs dismiss immediately with no retained content.
- The activity is enabled by default after meaningful gameplay, with a visible setting to turn it off. Respect the system’s Live Activities setting. If disabled or unavailable, the game continues normally.
- Use local ActivityKit updates only. No APNs activity tokens, server changes, App Group, or background polling.

## Visual direction

Use one compact information hierarchy: Rebuzzle identity, date, a clear `n/3` scored-guess readout, and the hint count. The Lock Screen can spell out the phase; Dynamic Island presentations should use only the progress and a concise label. Use the existing Rebuzzle type and color tokens, one restrained accent, monospaced numerals, system-safe margins, and VoiceOver state text. The Live Activity itself is the tap target.

Apply the interaction principles from [Thorbis’ design guidance](https://design.thorbis.com/)—native iOS surfaces, one clear idea, readable states, and a direct action—while preserving Rebuzzle’s own brand. Follow Apple’s [Live Activities guidance](https://developer.apple.com/design/human-interface-guidelines/live-activities): fit compact, minimal, expanded, and Lock Screen presentations; start for an active event; update only when state changes; and end promptly when the task ends.

## Lifecycle and recovery

The activity lasts only while a daily run is unresolved and the preference and system setting allow it. It must not imply that the round expires. ActivityKit may limit the visible duration; when the app returns to the foreground, reconcile against the server-restored game and start a fresh activity only if the daily is still active and has accepted progress. End obsolete puzzle activities rather than replacing the game board automatically.

If an ActivityKit request or update fails, keep the game and its feedback usable. Do not surface a gameplay error for an optional surface. If a player disables the feature in-app, end the current activity immediately and do not recreate it until enabled again. A solve may show “Solved” for 15 minutes; an answer reveal may show “Round complete” for 15 minutes. Neither state contains the answer. A puzzle-date change, opt-out, or system disable ends immediately without a retained summary.

## Implementation choices

- Put the shared attributes/content state in `RebuzzleCore`, available to both the app and WidgetKit extension.
- Add a focused app-side coordinator; `AppModel` remains the source of confirmed progress.
- Add the Live Activity configuration alongside the existing daily widget in the `RebuzzleWidgets` extension.
- Expose the opt-out in the existing reminder/return settings.
- Keep the existing iOS 18 minimum and avoid new dependencies or backend work.
