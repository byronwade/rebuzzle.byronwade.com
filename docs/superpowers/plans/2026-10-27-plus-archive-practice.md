# Plus Archive Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Plus players replay published past dailies with hints and answer-blind feedback, without changing today's result, stats, rewards, or streak.

**Architecture:** Add a read-only, paginated archive endpoint over active puzzles published before the server-resolved daily date. Add distinct practice guess and solution-reveal routes that reuse existing normalization and feedback but never enter the scored attempt pipeline. Verify current Apple-signed Plus transactions on every paid server route and process signed App Store revocation notifications. Bind practice-round progress to a short-lived signed token and atomically rotate its server-stored digest so replayed or concurrent requests cannot advance one round twice. Build an isolated SwiftUI practice flow and separate Eve reply scope; keep attempt, token, and hint state in memory.

**Tech Stack:** Next.js route handlers, MongoDB puzzle operations, existing answer-validation and reaction helpers, Jest, SwiftUI, Swift Codable, XCTest, XCUITest, StoreKitTest.

**Spec:** `docs/superpowers/specs/2026-10-27-plus-archive-practice-design.md`

## Global Constraints

- Today's shared daily puzzle, guesses, hints, result, streak, and Journey remain free and unchanged.
- Historical archive and practice access use the existing verified Plus entitlement; no new product or price change.
- Archive eligibility uses the same server-side local-date and timezone rule as the daily route; never trust the device clock.
- The archive list excludes answers and explanations and never includes scheduled future or unpublished puzzles.
- Practice does not persist guesses, attempts, hint counts, journal entries, analytics events, progress, stats, XP, achievements, streaks, learning signals, or daily rewards.
- Never use the existing scored archive branch in `apps/web/src/app/api/puzzles/guess/route.ts` for practice.
- Practice uses no-store responses, preserves answer-blind feedback and Eve prompts, and keeps rate limits.
- Every archive/practice endpoint independently verifies a current Apple-signed Plus transaction; refund notifications revoke access.
- Solution reveal requires a server-signed, user- and puzzle-bound round token recording three wrong guesses; never trust the client attempt count.
- Practice token replay protection stores only a digest, user/puzzle/round binding, and expiry; create the TTL index before enabling the routes in a deployment.
- Preserve existing Journal study behavior, Plus purchase/restore, keyboard dismissal, account isolation, VoiceOver, Dynamic Type, and Reduce Motion.
- Do not modify or stage the user-owned untracked Xcode project directories.

## Review Focus

- Device timezone changes and day-boundary requests must not put today's puzzle in the archive — archive and practice route tests pin the server date rule.
- Scheduled active puzzles must not leak into the list — archive query tests include future `publishedAt` rows and unpublished rows.
- Guess, reveal, or accessibility content must not expose answer/explanation early — endpoint serialization and UI tests assert absence before explicit reveal.
- Finishing today's daily must not block practice Eve feedback, while the existing daily guard remains — quip-route tests cover both modes and preserve answer-blind prompting/rate limits.
- Correct, failed, restarted, and abandoned practice sessions must not alter daily state — server mutation mocks and native UI/session tests assert no reward or persistence path.
- Replayed and concurrent use of a signed round token must not advance the same round twice; database updates compare-and-set the current token digest.

---

### Task 1: Publish a safe, paginated past-daily archive

**Files:**
- Modify: `apps/web/src/db/operations.ts`
- Test: `apps/web/src/db/__tests__/puzzle-ops-archive.test.ts`
- Create: `apps/web/src/lib/game/archive-puzzles.ts`
- Test: `apps/web/src/lib/game/__tests__/archive-puzzles.test.ts`
- Create: `apps/web/src/app/api/puzzles/archive/route.ts`
- Create: `apps/web/src/app/api/puzzles/archive/__tests__/route.test.ts`
- Use: `apps/web/src/lib/game/daily-lock.ts`
- Use: `apps/web/src/lib/game/public-puzzle.ts`
- Use: `apps/web/src/lib/game/public-visual.ts`

**Interfaces:**
- `GET /api/puzzles/archive?cursor=<opaque>&limit=<bounded integer>` returns `{ items: PublicPuzzle[], nextCursor: string | null }`.
- `PublicPuzzle` contains only the native presentation fields: `id`, clue text, puzzle type, difficulty, ordered hints, published date, and public visual.
- Resolve the viewer's local daily date using the same validated timezone resolver as `/api/puzzle/today`. Derive each puzzle's publication key with `getUtcPuzzleDate(publishedAt)` and include only keys strictly earlier than that local date.
- `isPublishedPastPuzzle(puzzle, localDateKey)` in `apps/web/src/lib/game/archive-puzzles.ts` is the shared eligibility rule for archive listing, practice guess/reveal, and practice quips.
- Use a stable descending date/id cursor. Do not use `findActivePuzzles(limit)` without a published-date bound or `getPuzzleForDate`, which may generate missing puzzles.

- [x] Add Jest cases for old published puzzles, current-day exclusion, future scheduled rows, inactive/unpublished rows, cursor stability, and clamped page size.
- [x] Run the archive route test and observe failures for the missing route/query contract.
- [x] Add `isPublishedPastPuzzle` and tests for active/published checks and UTC publication-day versus viewer-local-day boundaries.
- [x] Add a bounded `puzzleOps` query for active records with `publishedAt` earlier than UTC midnight for the server-resolved local date, sorted by publication date and id, and a cursor that cannot skip or duplicate entries.
- [x] Add the route with input validation, existing timezone validation, `toPublicPuzzle` and `toPublicVisual` filtering, and `Cache-Control: private, no-store`.
- [x] Run the focused archive route test and confirm no answer, explanation, or future puzzle appears in the response.

### Task 2: Add isolated practice guess and solution-reveal contracts

**Files:**
- Create: `apps/web/src/app/api/puzzles/practice/guess/route.ts`
- Create: `apps/web/src/app/api/puzzles/practice/guess/__tests__/route.test.ts`
- Create: `apps/web/src/app/api/puzzles/practice/reveal/route.ts`
- Create: `apps/web/src/app/api/puzzles/practice/reveal/__tests__/route.test.ts`
- Use: `apps/web/src/lib/game/archive-puzzles.ts`
- Use: `apps/web/src/ai/services/answer-validation.ts`
- Use: `apps/web/src/lib/game/reactions.ts`
- Use: `apps/web/src/lib/game/public-puzzle.ts`

**Interfaces:**
- `POST /api/puzzles/practice/guess` accepts a validated `puzzleId`, guess, optional prior signed round token, and StoreKit proof; returns the existing answer-blind feedback plus a new signed token only after a wrong guess.
- The guess route returns an outcome on a correct guess but does not return answer/explanation for a wrong guess. Input for today's, future, unpublished, unknown, or malformed puzzle IDs is rejected.
- `POST /api/puzzles/practice/reveal` accepts a validated published-past `puzzleId` and a signed round token at wrong-guess count three; it returns answer/explanation only after the round ends and the player explicitly reveals. It performs no guess/session write.
- Both routes authenticate through existing identity handling, verify a server-side Plus entitlement from Apple-signed StoreKit transaction data, resolve the server-authoritative daily date, set no-store headers, and use existing rate limits or an equivalent bounded rate limit.

- [x] Add Jest tests for correct, wrong, near-match, invalid, and third-attempt feedback; assert answer/explanation remain absent except on correct outcome or explicit reveal.
- [x] Add Jest tests that today's, future, inactive, unpublished, and malformed puzzles are rejected even if the client spoofs its local clock; archive listing requires authentication.
- [x] Add spies/assertions proving the routes never call `createAtomicDailyAttempt`, `updateUserStats`, `checkAndAwardAchievements`, daily-progress writes, or `recordFinalAttemptSignal`.
- [x] Run focused route tests and observe failures before adding production handlers.
- [x] Implement practice-only handlers using the existing puzzle lookup, answer normalizer, and deterministic reaction builder; keep them separate from the scored guess and session routes.
- [x] Run focused route tests, the existing daily-only tests, and the existing session tests; confirm daily contracts still pass and practice never mutates persisted state.

### Task 3: Allow answer-blind Eve feedback in practice

**Files:**
- Modify: `apps/web/src/app/api/puzzles/quip/route.ts`
- Create: `apps/web/src/app/api/puzzles/quip/__tests__/route.test.ts`
- Use: `apps/web/src/lib/game/archive-puzzles.ts`
- Modify: `apps/ios/Rebuzzle/Services/EveReplyStore.swift`
- Test: `apps/ios/RebuzzleTests/EveReplyTests.swift`

**Interfaces:**
- The quip request has an explicit `mode: "daily" | "practice"`; omitted mode keeps the existing daily behavior.
- Practice quips validate that the target puzzle is published before the server-resolved local daily date. They may bypass only the “daily already completed” guard; authentication, rate limits, input length limits, and answer-blind prompt construction remain.
- Eve reply cache keys include gameplay scope so a practice reply cannot collide with a daily reply for the same puzzle.

- [x] Add quip-route tests for daily guard preservation, practice after daily completion, invalid/current/future puzzle rejection, rate limiting, and absence of answer/explanation in model input.
- [x] Add an Eve reply-store regression proving a daily and practice reply for one puzzle occupy separate keys.
- [x] Run the focused web quip and native Eve tests and observe failures before implementation.
- [x] Implement explicit practice mode and scoped reply caching without changing default daily requests.
- [x] Run focused route/store tests and the existing daily reply tests.

### Task 4: Build the Plus archive and unscored native practice loop

**Files:**
- Create: `apps/ios/Core/Sources/RebuzzleCore/PracticeSession.swift`
- Test: `apps/ios/Core/Tests/RebuzzleCoreTests/PracticeSessionTests.swift`
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Create: `apps/ios/Rebuzzle/Features/ArchiveView.swift`
- Create: `apps/ios/Rebuzzle/Features/PracticeGameView.swift`
- Modify: `apps/ios/Rebuzzle/Features/PlusView.swift`
- Test: `apps/ios/RebuzzleUITests/GameplayUITests.swift`
- Modify: `docs/product/plus-journal-release.md`

**Interfaces:**
- `PracticeSession` owns `puzzleId`, guess count, revealed hint count, current feedback, and round state in memory; it exposes `submit(guess:)`, `revealNextHint()`, `revealSolution()`, and `restartRound()` without touching `GameSession` or `AppModel` daily mutations.
- `APIClient` exposes distinct archive-list, practice-guess, reveal, and practice-quip methods. Practice methods explicitly opt out of the automatic daily-only header and target only the new practice endpoints; solution reveal requires a finished three-guess round; daily methods retain the current header default.
- `ArchiveView` is reachable from Plus after verified entitlement, pages past-puzzle metadata without answers, and navigates into a fresh practice session.
- `PracticeGameView` presents the published board, three progressive hints, familiar answer-blind feedback, Eve feedback, explicit `Practice · unscored` messaging, and an accessible keyboard-dismiss action. Correct answers or explicit reveal show the solution. A fresh round resets only in-memory practice attempts.
- Plus users see no archive purchase interruption mid-session. Non-Plus users get the existing Plus explanation before an archive request is made.

- [x] Add core tests for attempt bounds, progressive hints, success/failed-round/reveal states, and reset behavior; assert daily model types and counters are not imported or mutated.
- [x] Add APIClient tests for request paths, JSON fields, practice-mode Eve scope, daily-only defaults, and explicit practice header override.
- [x] Add UI tests for Plus gating, answer-free archive rows, unscored labeling, staged hints, answer-blind feedback, correct/reveal states, replay reset, and keyboard dismissal.
- [x] Run the new Core/API tests first and confirm the missing state/API contracts fail compilation before implementation. Focused UI flow tests were added after the views existed, then passed.
- [x] Implement the separate Core session, API methods, Plus archive route, and native views using current Rebuzzle design tokens and 44-point controls.
- [x] Update the release record with implementation evidence and the remaining live Apple sandbox/device validation; do not claim user outcomes or revenue lift.
- [ ] Run the full native scheme test command and confirm existing Journal, Plus, keyboard-dismissal, and daily gameplay tests remain intact. Focused practice and keyboard tests passed; the full scheme run is in progress.

### Task 5: Full regression review and delivery

**Files:**
- Review: all Task 1–4 files
- Update: `docs/product/plus-journal-release.md`

- [x] Run focused Web Jest tests, then the full Web Jest and typecheck suites. Full Jest passed 206 suites / 1,245 tests / 2 snapshots with Node 24 and `--maxWorkers=2`; typecheck passed.
- [ ] Run the full native UI scheme on iOS 26.0. Project generation passed earlier; Core tests passed 47, the native unit target passed 64/64, API contract tests passed 5/5, and the archive practice UI flow passed 1/1. An earlier 65-test simulator subset had one keyboard-focus failure; its isolated retry failed during app launch before reaching that test.
- [x] Inspect archive/network responses for answer or explanation leakage and inspect practice paths for scoring/persistence calls; focused route and serialization tests passed.
- [ ] Finish full-device accessibility, keyboard, timezone, and Plus restore validation; focused archive practice UI and route tests passed.
- [x] Run `git diff --check`, review the feature diff, and record what remains unmeasured in the release note.
- [ ] Commit and push the verified change to the existing PR; retain the existing Family TestFlight group and public invitation link.

### Task 6: Enforce Plus with Apple-signed StoreKit proof

**Files:**
- Create: `apps/web/src/lib/storekit/plus-entitlement.ts` and focused tests
- Create: `apps/web/src/app/api/storekit/notifications/route.ts` and focused tests
- Modify: archive, practice guess/reveal, and quip routes and tests
- Modify: `apps/ios/Rebuzzle/Services/PurchaseStore.swift`, `APIClient.swift`, and contract tests
- Modify: `apps/web/package.json` and `pnpm-lock.yaml`; add public Apple Root CA certificates

**Interfaces:**
- Native API methods attach a locally verified current Plus transaction's `jwsRepresentation` in `X-Rebuzzle-StoreKit-Transaction`.
- `hasPlusEntitlement(request)` verifies signature, bundle ID, product ID, App Store environment, and revocation state; all paid server routes use it after authentication and before returning puzzle content.
- The Notifications V2 route verifies Apple's signed payload and records refunded/revoked transaction IDs in dedicated storage.

- [x] Add tests for absent, malformed, invalid-signature, wrong-app, wrong-product, revoked, sandbox/production transactions, and signed-date-ordered refund/reversal notification state.
- [x] Run focused route tests without StoreKit proof and observe 403 responses before puzzle lookup or model calls.
- [x] Implement Apple's App Store Server Library verification with Apple trust roots, existing Node 24 runtime, and fail-closed transaction/revocation handling; propagate current StoreKit proof through archive, practice, and practice Eve requests.
- [x] Add an idempotent verified Notifications V2 webhook; never trust unverified notification fields.
- [x] Run focused StoreKit and affected route tests, Web typecheck, and iOS API contract tests.

### Task 7: Make solution reveal non-spoofable

**Files:**
- Create: `apps/web/src/lib/game/practice-round-token.ts` and tests
- Modify: practice guess/reveal routes and tests
- Modify: `apps/ios/Core/Sources/RebuzzleCore/PracticeSession.swift`, `APIClient.swift`, `PracticeGameView.swift`, and API tests

**Interfaces:**
- Wrong practice guesses return a signed token valid for 24 hours and bound to user ID, puzzle ID, round ID, purpose, and cumulative wrong-guess count. The backend atomically stores and rotates only the token digest, and removes it when a correct guess ends the round.
- Subsequent guesses submit the preceding token; client `attemptNumber` is removed from authority.
- Reveal accepts only the active token for the same user, puzzle, and round with exactly three wrong guesses. Replaying an old token or racing duplicate requests cannot advance a round twice.

- [x] Add tests for direct reveal with a claimed attempt count, missing/tampered/expired/cross-user/cross-puzzle tokens, reveal after three wrong responses, and replayed or concurrent token advancement.
- [x] Run the reveal-spoof test against the client-only guard and observe that it fails before adding server verification.
- [x] Sign and verify purpose-specific tokens with `AUTH_SECRET`; advance only after wrong answers, and keep correct-answer disclosure immediate.
- [x] Update native `PracticeSession` and request/response models to carry the token; never persist it or practice guesses.
- [x] Run focused route/Core/API tests and confirm daily guess contracts remain unchanged.

### Task 8: Close the release record and validate deployment readiness

**Files:**
- Modify: `docs/product/plus-journal-release.md`, this plan, and the SDD progress ledger

- [x] Correct test counts and accurately record the keyboard simulator result.
- [x] Document required backend deployment and App Store Server Notifications setup without recording secret values.
- [x] Add the `practiceRoundTokens` TTL index to the database index migration; executing that migration remains required before route deployment.
- [x] Run the full applicable Web and iOS regression suites and final diff check; record every remaining blocker without implying a TestFlight upload.
