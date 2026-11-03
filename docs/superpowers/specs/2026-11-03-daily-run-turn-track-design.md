# Daily Run Turn Track

## Intent

Make each scored answer feel like a clear turn in a small daily game run. The current arena already has three numbered markers and correct/incorrect states; this pass gives those states a connected visual path and a short prompt that changes as the player advances.

## Goals

- Make the active turn, used turns, and remaining chances understandable at a glance.
- Give the opening move, a follow-up guess, and the final chance distinct, encouraging copy.
- Keep the puzzle board as the focal point and keep the answer composer reachable.
- Preserve the daily game rules, countdown, Eve feedback, streak/XP rewards, and existing accessibility value.
- Respect Dynamic Type and Reduce Motion.

## Design

- Replace isolated numbered squares with a connected three-step track.
- Show the active step in the Rebuzzle accent color, future steps in a quiet neutral, incorrect resolved steps in the error color, and a solved step in the success color.
- Change the adjacent prompt by game state: “Make your move” before a scored guess, “Try a new angle” after a miss with multiple chances left, “One last try” with one scored chance left, and “Score banked” once scored play is locked.
- Keep the existing textual remaining-guess count and the `dailyGuessProgress` accessibility label/value stable. Hide decorative track marks and the visual duplicate count from VoiceOver, and expose the prompt as a separate identified text element.
- Use the existing palette, type, animation style, and Reduce Motion setting. Add no new scoring, networking, data storage, notifications, or dependencies.

## Non-goals

- Changing the number of scored guesses or the score-lock/continue rules.
- Changing puzzle difficulty, Eve’s feedback, daily countdown behavior, or Journey rewards.
- Adding a new dashboard tile or another progression system.

## Review focus

- Zero attempts: first-step prompt, three available steps, and three guesses remaining.
- A rejected guess: first step resolves as a miss, next step becomes active, and the prompt advances.
- Final scored chance and score lock: copy remains accurate and no negative remaining count appears.
- Solved state: existing result and reward screen remains authoritative.
- Accessibility text sizes and Reduce Motion: the track stays readable and the outer progress status remains available.
