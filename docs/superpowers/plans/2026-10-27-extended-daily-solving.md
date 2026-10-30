# Extended Daily Solving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players keep solving a difficult daily puzzle after the three-guess scored round, without revealing the answer or selling a gameplay advantage.

**Architecture:** Persist an explicit `playMode` on daily guess records and make the server the authority for the scored, continuing, solved, revealed, and expired phases. Keep classic/legacy sessions unchanged. Add authoritative session restoration and matching continuation UI in native iOS and the web daily game; leave community puzzles untouched.

**Tech Stack:** TypeScript/Next.js route handlers, MongoDB operations, Swift 6 Core models, SwiftUI, XCTest/XCUITest, Jest.

**Spec:** `docs/superpowers/specs/2026-10-27-extended-daily-solving-design.md`

## Global Constraints

- The first three guesses remain the only performance-scored guesses.
- Extended solving is free; Plus never grants extra attempts or gameplay power.
- A missing `playMode` means classic three-guess behavior; do not reopen completed historical sessions.
- Only the server may reveal an answer or finalize a daily result.
- Keep existing authentication, idempotent writes, per-user and per-IP rate limits, and daily lock semantics.
- A continued solve counts as solved for daily progress and streaks but awards no attempt-performance points.
- Community puzzles and retired React Native/desktop attempt flows do not enter extended daily mode.
- Do not commit the current dirty worktree or include unrelated/user-owned files.

## Review Focus

- Legacy records with absent mode must remain terminal under the old three-guess rule.
- Third-miss retries, concurrent fourth guesses, reveal retries, and concurrent expiry must not duplicate attempts, score, progress, streak changes, or finish events.
- A score-locked attempt cannot be restored with an answer before solve, reveal, or expiry.
- A continued run expires only at the server's daily boundary, and its optional review never blocks the new daily.
- Community puzzle submission, archive access, and account switching must not inherit another daily session's mode or history.

---

### Task 1: Add the backward-compatible daily mode and terminal state to the server

**Files:**
- Modify: `apps/web/src/db/models.ts`
- Modify: `apps/web/src/db/operations.ts`
- Modify: `apps/web/src/app/api/puzzles/guess/route.ts`
- Modify: `apps/web/src/app/api/puzzle/session/route.ts`
- Create: `apps/web/src/lib/game/extended-daily-finalization.ts`
- Create: `apps/web/src/app/api/puzzles/reveal/route.ts`
- Test: `apps/web/src/app/api/puzzles/guess/__tests__/extended-solve.test.ts`
- Test: `apps/web/src/app/api/puzzle/session/__tests__/route.test.ts`
- Create: `apps/web/src/app/api/puzzles/reveal/__tests__/route.test.ts`

**Interfaces:**
- Guess request accepts optional closed `playMode: "extended"`; missing means `classic`.
- Guess/session responses include an explicit phase and `scoreLocked`; only final solved/revealed/expired phases carry an answer.
- Extended runs store mode with each accepted attempt. Attempts 1–3 are scored; later attempts are unscored.
- Reveal is authenticated, owns only the caller's score-locked open daily run, and is idempotent.

- [ ] Add failing API tests for legacy third-miss finalization, extended third-miss score lock without answer, an unscored continuation solve, an explicit reveal, and session restoration.
- [ ] Run the focused route tests and confirm each failure points to missing extended-mode behavior.
- [ ] Implement mode persistence and authoritative phases in the guess/session routes plus a shared finalizer for reveal and expiry, reusing existing daily progress/stat rules.
- [ ] Add a failing expiry test covering a prior-day score-locked run and a non-blocking review payload, then implement once-only finalization when a new daily session is loaded.
- [ ] Run focused route tests and inspect that classic rows and community submissions retain their existing behavior.

### Task 2: Represent score lock and continued outcomes in shared iOS Core

**Files:**
- Modify: `apps/ios/Core/Sources/RebuzzleCore/GameSession.swift`
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Test: `apps/ios/Core/Tests/RebuzzleCoreTests/CoreTests.swift`
- Test: `apps/ios/RebuzzleTests/RuntimeTests.swift`

**Interfaces:**
- Decode the server phase and score-lock fields while retaining defaults for older response fixtures.
- Keep `gameOver` reserved for a terminal result; expose score lock separately.
- Represent optional expired-run review data without putting it into the active puzzle answer.

- [ ] Add failing Core tests for the third-miss score lock, continued incorrect guess, late solve, explicit reveal, and legacy response decoding.
- [ ] Run the focused Core tests and confirm expected failures.
- [ ] Implement the Codable state and response mapping without changing existing classic behavior.
- [ ] Run the focused Core and runtime tests.

### Task 3: Add native iOS continue/reveal experience and restore behavior

**Files:**
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Test: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- Native daily guesses opt into extended mode; AppModel follows server phase after every response and restore.
- `Keep solving` retains the board and permits another guess; `Reveal the answer` calls the authenticated reveal route.
- Expired review is dismissible and never blocks the current daily.

- [ ] Add UI regressions proving the third wrong guess shows both actions while the answer remains absent.
- [ ] Add UI regressions for a continued solve, restore after relaunch, reveal, and an expired prior-day review while today's puzzle remains playable.
- [ ] Run the new UI tests and confirm they fail against current behavior.
- [ ] Implement the native state and UI with accessible labels, Dynamic Type support, and reassuring non-punitive copy.
- [ ] Run focused iOS Core, runtime, and gameplay UI tests plus a Release simulator build.

### Task 4: Keep the web daily game in sync with the authoritative run

**Files:**
- Modify: `apps/web/src/components/GameBoard.tsx`
- Test: `apps/web/src/app/api/puzzle/session/__tests__/route.test.ts`
- Create: `apps/web/e2e/daily-extended-solving.spec.ts`

`apps/web/src/app/page.tsx` renders `GameBoard`; keep its current puzzle loading contract unless the implementation proves session hydration belongs there.

**Interfaces:**
- Web daily guesses opt into extended mode and respect server phase, attempt history, and score lock.
- On reload, the web client hydrates the authoritative daily session before enabling another guess.
- Community puzzle player remains on the existing community rules.

- [ ] Add a Playwright regression that restores a score-locked run, continues without showing the answer, and renders a solved continuation correctly.
- [ ] Run focused web tests and confirm the current local-only three-guess state fails the new assertion.
- [ ] Implement server-backed daily hydration and the matching continue/reveal controls.
- [ ] Run focused web route/component tests and the web typecheck.

### Task 5: Document the product contract and review the full change

**Files:**
- Modify: `docs/product/native-growth-scorecard.md`
- Modify: `apps/ios/Release/Checklist.md` only if the new flow adds a physical-beta gate.
- Review all changed files from Tasks 1–4.

- [ ] Record the implemented flow and the exact outcome measures needed after a production cohort exists; do not claim a retention or revenue lift.
- [ ] Run the targeted native and web verification commands and `git diff --check`.
- [ ] Review final diffs for answer leakage, legacy-session regressions, cross-account state, and unrelated worktree changes.
- [ ] Keep the work in the current branch without committing the existing mixed dirty worktree.
