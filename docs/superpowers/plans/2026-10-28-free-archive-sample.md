# Free Archive Sample Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let free players try one stable, unscored Archive puzzle, then offer Plus after the round while keeping every other archive puzzle protected.

**Architecture:** Select the oldest active published past daily on the server and return its existing public projection through a dedicated sample endpoint. Permit the exact server-selected sample through the existing answer-blind practice routes; Plus remains required for every other archive item. The native Archive reuses `PracticeGameView` and adds a Plus link after the sample round ends.

**Tech Stack:** Next.js route handlers, MongoDB puzzle operations, Jest, SwiftUI, URLSession, XCTest, XCUITest, StoreKit 2 entitlement headers.

**Spec:** `docs/superpowers/specs/2026-10-28-free-archive-sample-design.md`

## Global Constraints

- The sample is the oldest eligible active, published past daily, selected by server-resolved local date and stable ascending publication date/id order.
- Only the exact server-selected sample bypasses Plus verification; all other past puzzle practice remains Apple-verified Plus-only.
- Sample practice stays answer-blind, uses the existing signed round token for explicit reveal, and writes no daily progress or rewards.
- The sample is repeatable but contains only one puzzle; do not create a one-use account ledger.
- Keep the archive list endpoint, Plus product, price, purchase/restore behavior, and scored daily loop unchanged.
- Do not deploy, submit to TestFlight, commit, or push as part of this source change.

## Review Focus

- No eligible archive puzzle: the sample endpoint returns a safe unavailable response and the free Archive remains usable.
- Local-date boundary: the sample query excludes today, future, inactive, unpublished, and malformed-date puzzles.
- Non-sample ID spoofing: free users remain denied in guess, reveal, and practice Eve APIs for every other archived puzzle.
- Sample reveal: expired, replayed, cross-user, or cross-puzzle practice tokens cannot disclose the answer.
- Free sample solve/replay: no daily result, journal, streak, XP, achievements, or analytics state is changed.

---

### Task 1: Select and safely serialize one archive sample

**Files:**
- Modify: `apps/web/src/db/operations.ts`
- Test: `apps/web/src/db/__tests__/puzzle-ops-archive.test.ts`
- Create: `apps/web/src/lib/game/archive-sample.ts`
- Test: `apps/web/src/lib/game/__tests__/archive-sample.test.ts`
- Create: `apps/web/src/lib/game/public-archive-puzzle.ts`
- Test: `apps/web/src/lib/game/__tests__/public-archive-puzzle.test.ts`
- Create: `apps/web/src/app/api/puzzles/practice/sample/route.ts`
- Test: `apps/web/src/app/api/puzzles/practice/sample/__tests__/route.test.ts`
- Modify: `apps/web/src/app/api/puzzles/archive/route.ts`
- Test: `apps/web/src/app/api/puzzles/archive/__tests__/route.test.ts`

**Interfaces:**
- `puzzleOps.findOldestPublishedBefore(beforeUtc: Date): Promise<Puzzle | null>` returns the first active record sorted by `publishedAt` then `id` ascending, bounded strictly before `beforeUtc`.
- `findFreeArchiveSample(localDateKey: string): Promise<Puzzle | null>` queries that record and confirms `isPublishedPastPuzzle` against the validated local date.
- `toPublicArchivePuzzle(puzzle: Puzzle): PublicPuzzle` returns exactly the existing archive presentation fields, with visual filtering and no answer, explanation, or private review metadata.
- `GET /api/puzzles/practice/sample` requires authentication, uses existing IP/user rate-limit patterns, returns no-store, and responds with one public puzzle or 404.

- [x] **Step 1: Add database-query tests** for selecting the oldest active row before the cutoff, stable ID tie-breaking, and empty results.
- [x] **Step 2: Run the focused DB test and confirm it fails** because `findOldestPublishedBefore` is not defined.
- [x] **Step 3: Implement the bounded ascending query** and run the focused DB test until it passes.
- [x] **Step 4: Add public-projection tests** that omit answer, explanation, review evidence, and unsafe visual fields.
- [x] **Step 5: Extract the existing archive-row projection** into `public-archive-puzzle.ts` and use the same function for the full archive and sample; add a regression to the existing archive-route test that Plus listing still uses the same public shape and remains gated.
- [x] **Step 6: Add GET-route tests** for authentication, rate limits, no-store, empty sample, past-date selection, and absence of secret fields; verify the sample route fails before implementation.
- [x] **Step 7: Implement `findFreeArchiveSample` and the sample GET route** using the same date resolver as the full archive.
- [x] **Step 8: Run focused database/helper/route tests and Web typecheck.**

### Task 2: Keep free practice limited to the selected sample

**Files:**
- Modify: `apps/web/src/app/api/puzzles/practice/guess/route.ts`
- Test: `apps/web/src/app/api/puzzles/practice/guess/__tests__/route.test.ts`
- Modify: `apps/web/src/app/api/puzzles/practice/reveal/route.ts`
- Test: `apps/web/src/app/api/puzzles/practice/reveal/__tests__/route.test.ts`
- Modify: `apps/web/src/app/api/puzzles/quip/route.ts`
- Test: `apps/web/src/app/api/puzzles/quip/__tests__/route.test.ts`

**Interfaces:**
- Guess, reveal, and practice Eve handlers use the same `findFreeArchiveSample(localDateKey)` result when deciding whether an unaffiliated request is the free sample.
- Plus-entitled requests keep the existing `isPublishedPastPuzzle` validation and response contract.
- A free request is allowed only for the sample's exact server-selected puzzle ID; all other historical puzzle IDs still return the existing Plus-required response.

- [x] **Step 1: Add failing tests** proving free sample guess/quip/reveal are allowed, a different past ID remains 403, missing/expired/replayed/cross-user/cross-puzzle tokens cannot reveal the sample, and the sample routes never call daily-progress, stats, achievement, or learning-signal writes.
- [x] **Step 2: Run the focused route tests and confirm the sample cases fail** at the existing blanket Plus gate.
- [x] **Step 3: Implement the exact-sample entitlement exception** after authentication, input validation, server date resolution, and rate limiting; leave all token, answer-blind, and published-past checks intact.
- [x] **Step 4: Run all affected practice guess, reveal, quip, and archive route tests.**

### Task 3: Fetch and play the sample from the free Archive screen

**Files:**
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Test: `apps/ios/RebuzzleTests/PracticeAPIClientTests.swift`
- Modify: `apps/ios/Rebuzzle/Features/ArchiveView.swift`
- Modify: `apps/ios/Rebuzzle/Features/PracticeGameView.swift`
- Modify: `apps/ios/Rebuzzle/App/PreviewData.swift`
- Test: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- `APIClient.fetchArchiveSample() async throws -> Puzzle` fetches `/api/puzzles/practice/sample` without requiring Plus proof; normal authentication headers stay in place.
- `PracticeGameView` gains `isFreeSample: Bool = false`. For a free sample only, it labels the play `Sample · unscored` and shows a Plus navigation link after `session.state != .playing`.
- Free `ArchiveView` fetches and shows the sample while retaining the full-archive Plus explanation. Plus users retain the current paginated archive path.
- The DEBUG fixture server returns only the public sample shape and continues to supply answer material only to practice guess/reveal handlers.

- [x] **Step 1: Add a failing APIClient contract test** for `/api/puzzles/practice/sample`, JSON decoding, auth, and the existing daily-header default.
- [x] **Step 2: Run the focused APIClient test and confirm it fails** because `fetchArchiveSample` is missing.
- [x] **Step 3: Implement the APIClient method** and run the focused APIClient suite.
- [x] **Step 4: Add UI coverage** proving the free Archive can open the sample, the clue remains answer-free, the practice label says unscored, the Plus CTA appears after both solve and explicit reveal but not during play, and no daily streak/XP result is created; update the Plus gate test so only the full archive stays locked.
- [x] **Step 5: Update the DEBUG fixture route** and implement the Archive/Practice UI using the existing navigation and design tokens.
- [x] **Step 6: Run the focused Archive/practice XCUITest cases on the available iOS simulator.**

### Task 4: Regression and release record

**Files:**
- Modify: `docs/product/plus-journal-release.md`
- Review: all Task 1–3 files

- [x] **Step 1: Run the full Web Jest suite and Web typecheck.**
- [x] **Step 2: Run `swift test --package-path apps/ios/Core` and the full `Rebuzzle` Xcode scheme on the available iOS simulator.**
- [x] **Step 3: Run `git diff --check` and a fresh read-only code review of this feature's exact hunks.**
- [x] **Step 4: Update the release record with source/test evidence and clearly note that the sample has not been deployed or uploaded to TestFlight.**
- [x] **Step 5: Preserve all pre-existing worktree changes; do not stage or commit overlapping dirty files.**
