# Playable First-Run Warm-Up

## Intent

Rebuzzle's daily puzzles are meant to reward careful thought. A brand-new player currently lands on a difficult puzzle, while How to Play offers only a static example. Give players a short, safe chance to learn how clues, guesses, hints, and Eve's feedback work before they spend any daily attempts.

## Experience

- After today's puzzle has loaded, present a one-time, skippable warm-up on first use.
- Use a simple relationship rebus: the word `LIGHT` sits above `HOUSE`; the answer is `lighthouse`.
- Let the player submit up to three practice guesses and request one scripted sample hint from Eve. Wrong guesses receive short, progressive coaching labeled as sample feedback.
- State before the first input that warm-up guesses do not use a daily attempt.
- A correct guess celebrates the solve. After the third miss, reveal the answer and explain that practice did not use a daily guess.
- The player can skip at any time and return to today's puzzle. Finishing or skipping prevents automatic presentation next launch.
- Keep a replay action in How to Play.

## Boundaries

- Tutorial state belongs to the tutorial view. Do not call the daily or practice API, mutate the real game model, record guesses, award XP, alter streaks, or count the tutorial as a round.
- Persist only the local completion/skip flag in `UserDefaults`.
- Bypass automatic presentation for `--ui-fixture` launches so existing UI fixtures continue to reach the live answer composer.
- Keep the board, field, buttons, typography, color, and depth in Rebuzzle's existing Thorbis-derived SwiftUI system. Preserve Dynamic Type, VoiceOver labels, Reduce Motion, and the app's haptics setting.
- Provide stable accessibility identifiers for tutorial, skip, hint, submit, and continue actions.

## Acceptance

1. A first-use player sees the tutorial only after the daily puzzle loads; skip is immediately available.
2. Submitting a guess and asking for the hint changes only tutorial-local state.
3. A correct answer produces a success state; three incorrect answers produce a reveal state.
4. Skip and completion both return the player to the unchanged daily round and stop future automatic presentation.
5. How to Play can start the tutorial again on demand.
6. Fixture launches bypass the automatic tutorial; accessibility settings remain respected.
