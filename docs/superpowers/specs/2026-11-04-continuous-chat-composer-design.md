# Continuous Chat Composer Design

## Intent

Keep the next move visible throughout a Rebuzzle round. Daily and Practice already show each guess as a conversation with Eve, but their answer fields live after the growing history. As guesses and AI replies accumulate, the player must scroll away from the newest feedback to find where to answer again.

## Goals

- Keep the answer field and primary check action docked to the bottom of the playable screen.
- Let the conversation remain a scrollable history, with the newest confirmed guess and Eve reply brought into view after they change.
- Use the same composer treatment in Daily and Practice so the interaction feels like one game.
- Keep keyboard dismissal, keyboard submit, server reconciliation, validation errors, disabled/loading states, and existing haptics working.
- Leave hints and the puzzle board in the scrollable content, and keep the current answer hidden until the existing result flow reveals it.
- Respect Dynamic Type, Reduce Motion, VoiceOver labels, safe areas, and small iPhone screens.

## Design decisions

- Build one focused `GuessComposer` view around a bound answer, focus binding, enabled/loading state, optional error/recovery action, and submit closure.
- Attach it with `safeAreaInset(edge: .bottom)` to the scrollable game page. The inset must rise above the keyboard and reserve content space so the last feedback card cannot sit behind it.
- Keep the existing keyboard toolbar's explicit Hide keyboard and Check answer actions.
- If the keyboard was open before a non-terminal guess, keep it open for the next guess; if it was closed, leave it closed. Release focus after solve/reveal or when session reconciliation is needed.
- After a guess is confirmed, scroll the matching conversation turn to the bottom of the visible conversation area. When Eve's streamed reply grows, keep that latest reply visible too.
- Always reveal the new turn after the player submits. During subsequent reply updates, only auto-follow while the player is already near the latest turn; scrolling up to read older turns pauses auto-follow until they return to the bottom.
- When the daily session is not ready or needs reconciliation, the dock provides the existing Refresh progress action. When a round is solved or exhausted, remove the composer and use the existing result/solution presentation.
- On a Practice request failure, keep the draft and error in the dock so the existing Check action retries the same answer.
- Keep the full hint flow in the scrollable content. Do not put secondary controls in the dock.

## Non-goals

- Changing scoring, attempt limits, hint order, AI reply content, server requests, or reward logic.
- Changing navigation or adding a timer, modal, or new permission prompt.
- Adding pressure mechanics, punishment copy, or notifications.

## Acceptance criteria

- Daily and Practice keep the answer composer visible at the bottom while the player scrolls through earlier turns.
- After a submitted guess and during Eve's streamed response, the newest feedback is visible above the dock; the player can still scroll back to older turns.
- The keyboard toolbar can still dismiss the keyboard, and the docked check action remains reachable while typing.
- A non-terminal guess preserves the player's prior keyboard state; a terminal result and reconciliation state dismiss it.
- A failed request, invalid draft, or daily-session refresh state has a clear message and recovery action without hiding the composer.
- Solved/exhausted rounds show the existing end-of-round state without an active answer field.
- Standard and accessibility text sizes, Reduce Motion, and dark mode remain legible and usable.

## Builder calls

- Keep a compact, single-row composer at standard text sizes and allow it to stack at accessibility text sizes.
- Reuse the existing palette, rounded field, and strong primary-action treatment from `Theme`; do not introduce a new visual language.
- Measure whether the player is near the latest turn from the nearest scroll view's geometry. Follow a new submitted turn unconditionally, then pause reply-stream scrolling if the player moves more than 72 points away from the bottom.
- Use Refresh progress as the Daily failure recovery because `AppModel.submit()` marks the session for reconciliation when the server response cannot be confirmed. Practice leaves its draft intact after cancelling a pending submission, so the existing check action is the retry.

## Interaction reference

- Mobbin: [ChatGPT conversation composer with keyboard open](https://mobbin.com/screens/fbcef4f1-0bd9-42bc-a15e-1420960bdeb4?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp), reviewed 2026-11-04 for keeping the next text action ready while a conversation is in progress. Rebuzzle keeps its own puzzle controls and visual language.
