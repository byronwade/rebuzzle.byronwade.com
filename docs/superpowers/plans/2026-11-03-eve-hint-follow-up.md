# Eve Hint Follow-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player ask Eve one short, answer-blind follow-up after each revealed daily hint, without affecting puzzle scoring or hint usage.

**Architecture:** Add an authenticated daily-only API endpoint that selects the requested authored hint and puzzle type, generates one concise coaching reply, and applies direct-answer and length checks before returning it. Extend the existing native Eve reply store with account/puzzle-scoped follow-up state, then render the fixed question and reply inside each hint’s chat turn.

**Tech Stack:** SwiftUI, Swift Observation, Next.js route handlers, TypeScript, existing AI client, MongoDB operations, Jest, XCTest/XCUITest.

**Spec:** `docs/superpowers/specs/2026-11-03-eve-hint-follow-up-design.md`

## Global Constraints

- Use a fixed question rather than free-form input to keep the prompt safe and the interaction fast.
- The model receives only the puzzle type, the selected revealed hint, and Eve's fixed coaching instruction. It does not receive the answer, explanation, board content, guesses, or unrevealed hints.
- The canonical answer is used only for a deterministic post-generation guard and is never included in model input.
- A score-locked but unfinished round remains eligible; the endpoint rejects a finished daily round.
- The endpoint is rate-limited to 30 requests per IP per hour and 8 requests per account per hour; retries count toward the same limit.
- The client permits one initial request and one retry per hint.
- The server returns one sentence of at most 24 words or a fixed answer-blind fallback.
- The feature is daily-only; it does not change scoring, hints, streaks, rewards, or game state.
- The answer composer stays usable while Eve’s reply is pending.

## Review Focus

- **Hidden answer exposure:** Verify the model input excludes answer, explanation, board, guesses, and unrevealed hints. Pin this in the route test.
- **Finished-round boundary:** Verify a final attempt blocks new follow-ups while a score-locked continuation remains eligible. Pin this in the route tests.
- **Direct answer and verbosity:** Verify output with the exact answer sequence or more than 24 words resolves to the fixed fallback. Pin this in helper tests.
- **Retry and account isolation:** Verify a failed follow-up can be retried once, a completed reply cannot be requested again, and puzzle/account changes cancel old work. Pin this in Eve reply store tests.
- **Keyboard and accessibility layout:** Verify the follow-up control and status remain reachable at Accessibility XXXL while the answer composer stays available. Pin this in UI tests.

---

### Task 1: Build the answer-blind daily follow-up endpoint

**Files:**
- Create: `apps/web/src/lib/game/eve-nudge-reply.ts`
- Create: `apps/web/src/lib/game/__tests__/eve-nudge-reply.test.ts`
- Create: `apps/web/src/app/api/puzzles/nudge-reply/route.ts`
- Create: `apps/web/src/app/api/puzzles/nudge-reply/__tests__/route.test.ts`

**Interfaces:**
- `sanitizeEveNudgeReply(text: string, answer: string): string` returns the first sentence if it contains at most 24 words and no exact answer-word sequence; otherwise it returns the fixed fallback from the spec.
- `POST /api/puzzles/nudge-reply` accepts `{ puzzleId: string, hintIndex: number }` and returns `{ success: true, reply: string }`.

- [x] **Step 1: Add failing sanitizer tests** for a valid sentence, multiple sentences, the direct answer, a longer answer contained only as a partial word, and a response exceeding 24 words.
- [x] **Step 2: Run the sanitizer tests and verify they fail** because the helper does not exist.
- [x] **Step 3: Implement `sanitizeEveNudgeReply`** in `apps/web/src/lib/game/eve-nudge-reply.ts`; use word-token sequences so answer matching does not reject unrelated longer words.
- [x] **Step 4: Run the sanitizer tests and verify they pass.**
- [x] **Step 5: Add failing route tests** for unauthenticated requests, invalid puzzle IDs, invalid hint indexes, stale daily puzzle IDs, finished rounds, score-locked unfinished rounds, rate limits, no-store headers, and model-input answer blindness.
- [x] **Step 6: Run the route tests and verify they fail** because the route does not exist.
- [x] **Step 7: Implement the route**: authenticate, apply the 30/IP/hour and 8/account/hour rate limits, resolve the stable local puzzle date, load only that active daily puzzle by date, verify the requested ID/index and unfinished status, then pass only puzzle type and selected hint to `generateAIText`. Use the canonical answer only after generation in the deterministic sanitizer. Return private no-store JSON.
- [x] **Step 8: Run both new server test files** and verify every route and sanitizer case passes.
- [x] **Step 9: Commit Task 1** as `Add answer-blind Eve hint follow-ups`.

### Task 2: Add persistent native follow-up request state

**Files:**
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Modify: `apps/ios/Rebuzzle/Services/EveReplyStore.swift`
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`
- Modify: `apps/ios/RebuzzleTests/EveReplyTests.swift`

**Interfaces:**
- `APIClient.fetchEveNudgeReply(puzzleID:hintIndex:) async throws -> String` calls the new JSON endpoint.
- `EveReplyStore.requestNudgeFollowUp(hintIndex:)` starts the initial request once; `retryNudgeFollowUp(hintIndex:)` permits one retry.
- `AppModel.requestEveNudgeFollowUp(hintIndex:retry:)` verifies that the hint is revealed and the daily session is active before forwarding the request.

- [ ] **Step 1: Add failing `EveReplyTests`** for initial request, restored reply/request state, retry after failure, one-retry maximum, same-account isolation, puzzle change cancellation, and preservation of the existing guess-reply lifecycle.
- [ ] **Step 2: Run the focused Eve reply tests and verify they fail** on the missing follow-up behavior.
- [ ] **Step 3: Implement the API client method and follow-up state in `EveReplyStore`**. Persist requested indexes, retry counts, and successful replies under a daily account/puzzle key; cancel requests on reset; ignore late responses from an old puzzle.
- [ ] **Step 4: Wire activation/reset and the guarded AppModel action** at existing daily load, puzzle-change, and sign-out boundaries.
- [ ] **Step 5: Run the focused Eve reply tests** and verify new and existing lifecycle cases pass.
- [ ] **Step 6: Commit Task 2** as `Persist Eve hint follow-up state`.

### Task 3: Render the follow-up as a Rebuzzle chat turn

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Modify: `apps/ios/Rebuzzle/App/PreviewData.swift`
- Modify: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- `EveNudgeTurnView` receives whether the fixed question was asked, pending/retry state, the reply text, and request/retry closures.
- The fixture endpoint returns a deterministic answer-blind reply and supports a first-failure argument for UI retry coverage.

- [ ] **Step 1: Add failing UI tests** for question/reply ordering, one request per hint, retry after a fixture failure, unchanged hint/guess state, no answer exposure, and the composer remaining tappable while Eve is pending.
- [ ] **Step 2: Run the focused UI tests and verify they fail** because the follow-up control and response are missing.
- [ ] **Step 3: Add the fixed-question action and chat turns** inside `EveNudgeTurnView`; show Eve composing, the buffered reply, and one retry action after an error. Gate new requests to revealed hints in unfinished daily play, preserve completed replies in the result transcript, and respect Reduce Motion and Dynamic Type.
- [ ] **Step 4: Add the deterministic fixture response and failure mode.**
- [ ] **Step 5: Run the focused UI tests** on the standard and Accessibility XXXL paths; verify the composer and follow-up remain reachable and every test passes.
- [ ] **Step 6: Build the iOS Simulator app and run the focused server test files** as final integration verification.
- [ ] **Step 7: Commit Task 3** as `Add Eve follow-up chat turns`.
