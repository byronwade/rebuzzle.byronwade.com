# Native daily difficulty calibration

## Goal

Use the native app’s post-puzzle difficulty pulse to improve future daily puzzle selection without treating a small, self-selected sample as a reliable measurement of enjoyment or solve time.

## Behavior

- Read `daily_quality_feedback` events from `nativeGrowthEvents` alongside the existing web `difficulty_accuracy` feedback used by Apex calibration.
- For a lookback window, count only the newest native rating from each account. Native feedback affects difficulty only when at least 10 distinct accounts have rated a puzzle in that window.
- Map `too_easy` to an upward difficulty signal and `just_right` to a calibrated signal. `tough_but_fair` contributes to the healthy-challenge sample and never acts as a reason to ease difficulty. Add a challenge-preserving generation note only when at least three eligible accounts choose it.
- `unclear` is excluded from difficulty math. When at least three eligible accounts report unclear puzzles, send a clarity-focused note to generation so clue mapping can improve without labeling the puzzle too hard.
- Keep native account identifiers inside the database query. Generation receives only aggregate counts and notes.
- Preserve all existing web feedback behavior and the current performance-signal calculations. If native feedback storage is unavailable, calibration continues with available web and solve data.

## Limits

- These votes express a player’s selected perception. They do not measure enjoyment, active thinking time, or objective puzzle difficulty.
- No puzzle content, rating, or account data is rewritten by this change.
- No automatic production puzzle is published as part of calibration.

## Acceptance

- Fewer than 10 distinct native accounts cannot change the difficulty delta.
- Repeated ratings from one account count once, using that account’s latest rating in the lookback.
- Ten eligible `too_easy` ratings can move the existing calibration upward when the solve behavior is otherwise in its target band.
- `tough_but_fair` does not lower the difficulty delta and creates a generation note only after three eligible accounts choose it.
- `unclear` does not affect the difficulty delta and can add a clarity-focused generation note only after the configured count threshold.
- Existing web difficulty feedback and graceful database-failure behavior remain intact.
