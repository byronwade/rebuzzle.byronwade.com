# Eve Hint Turns Design

## Intent

Make Nudge feel like part of the daily conversation. Today, hints appear in a separate block after the full guess history, so a hint requested between guesses can look as if it arrived after later guesses. Showing each hint as an Eve turn keeps the clue, feedback, and next guess in the order they happened.

## Goals

- Insert each revealed authored hint into the daily transcript at the moment it was requested.
- Keep its position stable after closing and reopening the app.
- Show the same chronological hint and guess order in Eve's postgame debrief.
- Preserve the existing Nudge action, free hint count, scoring, game rules, and answer privacy.
- Keep transcript order clear with Dynamic Type, VoiceOver, and Reduce Motion.

## Design

- Treat a hint as a message authored by Eve, using the existing Eve avatar and conversation card language. Label it `NUDGE · HINT N` and show the puzzle's original hint text.
- Store only the hint index and the number of confirmed guesses already submitted when it was revealed. The hint text continues to come from the daily puzzle response and is not copied into new local storage.
- Nudge reveals its authored hint synchronously from the already-loaded puzzle; capture the guess count in the same `AppModel.revealHint()` call. The composer is disabled while a guess is submitting, so there is no in-flight Nudge state to reconcile.
- Scope saved positions by account and puzzle, using the existing `LocalStore` key convention. A different account or daily puzzle must never inherit another timeline.
- When restoring an existing round, combine the server hint count, the legacy locally saved count, and the new saved positions. Restore any count-only hints without positions after the restored guesses, preserve valid saved positions, and never render the same hint twice.
- Order a hint after `N` submitted guesses immediately before guess `N + 1`. A hint revealed before any guesses appears before the first guess. Multiple hints at the same point stay in hint-number order.
- Use one chronological timeline for active play and Eve's postgame debrief. Remove the separate hint block after the transcript.
- Scroll to the newly revealed Eve hint. Keep the keyboard's existing hide action and the current behavior that retains keyboard focus after a non-terminal guess.
- Use a restrained Rebuzzle accent treatment and a labeled bubble so meaning does not depend on color. Keep the hint button's current 44-point target and avoid adding an extra dialog or AI request.

## Builder call

- Capture the hint position when the Nudge action reveals the local hint. Since the action is synchronous and disabled while a guess submits, this is the same user moment and requires no separate pending state.

## Non-goals

- Changing hint text, hint order, hint availability, costs, attempts, XP, scoring, API calls, or server data.
- Generating personalized hints or adding a new onboarding, reminder, or paid prompt.
- Changing the existing Eve response or guess feedback.

## Acceptance

- Asking for Nudge between guesses shows the new hint between those guess turns, not after the entire thread.
- A hint requested before the first guess appears before guess one.
- Multiple hints requested between the same guesses appear in their authored order.
- Relaunching mid-round restores hint count, hint order, and the next hint action without duplicating or losing a clue.
- Legacy count-only hint progress remains visible after restored guesses.
- Solved and exhausted results retain the same ordered hint/guess history in Eve's debrief.
- The composer still closes the keyboard explicitly; an incorrect guess keeps the previously open keyboard ready for another answer.
- VoiceOver follows the same chronological order, hint copy wraps at large text sizes, and Reduce Motion does not rely on transitions to communicate a new hint.

## References

- Mobbin: [ChatGPT conversation composer with keyboard open](https://mobbin.com/screens/fbcef4f1-0bd9-42bc-a15e-1420960bdeb4?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp), reviewed 2026-11-04 for keeping the conversational action in the same interaction surface.
- Mobbin: [Lexico word-game screen with in-game chat composer](https://mobbin.com/screens/dee1f903-080e-4104-9cc0-2062634126b5?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp), reviewed 2026-11-04 for pairing a puzzle state with a persistent chat affordance; Rebuzzle retains its own visual language.
