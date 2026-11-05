# Eve Hint Follow-Up Design

## Intent

Make the native daily puzzle feel more like a conversation with Eve. The player already sees answer-blind reactions to guesses and can reveal authored nudges, but the hint deck has no follow-up interaction. A bounded question and response gives a stuck player one more way to engage with the clue without turning the game into an answer lookup.

## Goals

- Let a player ask Eve one focused follow-up after each revealed daily hint.
- Render the question and Eve’s response as chat turns attached to that hint.
- Keep Eve’s response grounded in the already revealed hint and puzzle type.
- Keep the interaction optional, answer-blind, and separate from scored attempts, hint count, streaks, and rewards.
- Preserve replies per account and puzzle on the device; let the player retry if Eve cannot respond.
- Respect the existing Rebuzzle visual language, Dynamic Type, VoiceOver, Reduce Motion, and the pinned answer composer.

## Non-goals

- Free-form chat or asking Eve arbitrary questions.
- Creating or revealing another authored hint.
- Changing the score, clue, timer, result, hint ladder, or game state.
- Providing the follow-up after the daily round is finished.
- Extending this first version to archive practice.

## Player flow

1. The player reveals a normal authored hint. The existing hint count and score behavior stay unchanged.
2. An outlined, 44-point-minimum action appears within that hint turn: **What should I look at?**
3. Tapping it adds a right-aligned player message with that fixed question and starts Eve’s response.
4. While the request is pending, the hint turn shows Eve composing. When complete, a compact Eve reply appears below the player message.
5. The action is available once per hint. If the request fails or times out, the player message remains and a **Try again** action requests a fresh reply without adding another question. Only one retry is available for that hint.
6. The answer composer remains usable throughout. Follow-up replies are local to the account and puzzle, and reappear when the player returns to that daily puzzle.

The action is shown only for a revealed hint during an unfinished daily round. Existing replies remain in the transcript after the round ends, but no new follow-up can be started.

## AI and server boundary

- The native client sends only the current puzzle ID and the index of the revealed hint. It does not send free-form player text.
- The server resolves the authenticated player’s current daily puzzle using the same stable timezone used by daily gameplay, verifies the puzzle ID and hint index, and selects only the puzzle type and that hint for the prompt.
- The model receives only the puzzle type, the selected revealed hint, and Eve's fixed coaching instruction. It does not receive the answer, explanation, board content, guesses, or unrevealed hints. No model output affects scoring or game state.
- The server buffers the short reply, keeps its first sentence, and returns it only if it has at most 24 words and contains no exact answer-word sequence. Otherwise it returns this fixed answer-blind fallback: “Take another look at the nudge and notice which detail it points you toward.” The canonical answer is used only for this deterministic post-generation guard and is never included in model input.
- The endpoint requires authentication, is private and non-cacheable, is rate-limited to 30 requests per IP per hour and 8 requests per account per hour, and rejects a finished daily round.
- The database's final-attempt record is authoritative for whether the round is finished. A score-locked but unfinished round remains eligible.
- A timeout or unavailable model is non-fatal. The UI exposes one retry action and preserves the rest of the game. If the retry also fails, the player can continue with the authored hint deck.

## Visual and accessibility direction

- Reuse the existing Eve avatar, panel, field, accent, and chat-turn spacing.
- Use a small trailing question bubble and a separate Eve response block so authorship is clear.
- Use the existing reduced-motion environment when the turns appear; never rely on animation to communicate the response.
- Keep controls at least 44 points high, allow text to wrap at accessibility sizes, and provide explicit accessibility labels and values for the request, loading, reply, and retry states.
- Keep the pinned answer composer visible and operable while the response loads.

## Persistence and state

- Store requested hint indexes, retry counts, and completed reply text under an account-and-puzzle-specific local key.
- Store no guessed answer or additional gameplay data.
- Reset in-flight requests on account or puzzle change. A saved request without a completed reply is presented as retryable.
- The client permits one initial request and one retry per hint. A retry generates a fresh reply without adding another player-question bubble. The server rate limit provides an additional cost boundary.

## Validation evidence

- Server tests cover authentication, current-puzzle and hint-index validation, rate limiting, cache headers, and answer-blind model inputs.
- Native UI tests cover the conversation turn, one request per hint, retry after failure, unchanged hint/guess/score state, keyboard availability, and accessibility-size layout.
- A simulator build verifies the app still compiles with the new request client and view state.

## Implementation calls

- Continue using SwiftUI, `APIClient.request`, `EveReplyStore`-style local presentation state, and the existing `generateAIText` provider.
- Use a fixed question rather than free-form input to keep the prompt safe and the interaction fast.
- Buffer the model reply until the direct-answer and length checks pass; the UI shows an Eve composing state while it waits.
- Support the current daily puzzle only. Archive practice and broader chat can be evaluated separately after this path is used.
