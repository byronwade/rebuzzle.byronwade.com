# Server-Confirmed Level-Up Design

## Intent

Make earned Journey levels feel like a clear game milestone on the daily result screen, while keeping all XP and level decisions owned by Rebuzzle's server.

## Goals

- Show a compact, celebratory level-up card on the result for the puzzle that earned it.
- Require a complete Journey snapshot and a matching server-recorded completion for the same account, puzzle, date, attempt count, and outcome.
- Compare the confirmed server level with a complete, same-account snapshot fetched immediately before guess submission.
- Respect Reduce Motion, Dynamic Type, VoiceOver, and the existing haptics preference.
- Preserve the existing XP, badge, and progress presentation.

## Non-goals

- Change XP formulas, level thresholds, or server APIs.
- Celebrate cached, offline, partial-backfill, unrelated, or historical level changes.
- Add a new notification or interruptive modal.

## Design calls

- The level-up card appears in the existing result reward stack and is scoped to the matching completed puzzle.
- The card appears only when the confirmed summary level exceeds the pre-submit baseline.
- The existing result screen and Journey progress remain usable if confirmation fails; the card is omitted.
- Level-up uses one success haptic through the current haptics setting, and transitions become immediate when Reduce Motion is enabled.

## Implementation

Extend the current badge-baseline and completion-check flow in `AppModel`. Publish a puzzle-scoped level celebration only after `refreshJourneyProgress()` confirms the exact completion and a higher level. Render the celebration in `JourneyRewards`, where the existing confirmation gate also verifies the result snapshot.

Refresh Journey progress before each submitted guess so even a quick successful guess cannot compare against a cached or stale level. A failed or incomplete refresh does not block gameplay; it simply provides no celebration baseline.
