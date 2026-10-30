# Native Puzzle Quality Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show aggregate guess-count and completion-outcome patterns for recent official puzzle dates in the existing admin funnel.

**Architecture:** Add a bounded Mongo aggregation over existing `puzzleAttempts`, grouping identity and local puzzle date inside Mongo before returning date-level counts. Extend the existing admin response and card, and document the new source metric and its limitations.

**Tech Stack:** TypeScript, MongoDB aggregation, Next.js route handler, React, Jest, existing admin dashboard components.

**Spec:** `docs/superpowers/specs/2026-10-28-native-puzzle-quality-analytics-design.md`

## Global Constraints

- Return only puzzle date and aggregates; never return player IDs, answers, or raw attempt rows.
- Synthetic `attemptType: "finalization"` rows do not count as guesses.
- Keep `verifyAdminAccess` and `Cache-Control: private, no-store` behavior.
- Do not add client collection or claim solve duration from current timing fields.
- Keep this source-only; do not deploy, migrate production, or upload TestFlight.

## Review Focus

- **Date boundaries and local dates:** include the one-day UTC buffer and order the 30 most recent active puzzle dates; test a boundary date.
- **Synthetic finalization rows:** exclude them from guess buckets while preserving reveal and expiry outcomes; test a reveal after three guesses.
- **Extended solving:** keep four-or-more guesses in one bucket; test a five-guess solved run.
- **Incomplete runs:** classify attempts with no terminal record as in progress; do not count them as failed.
- **Privacy and authorization:** keep aggregation server-side and admin-only; test unauthorized access and assert the serialized response omits identifiers and raw answers.
- **Platform scope:** the shared collection does not identify client platform; label the results all-platform rather than native-only.

---

### Task 1: Aggregate puzzle attempt quality

**Files:**
- Modify: `apps/web/src/db/analytics-ops.ts`
- Modify: `apps/web/src/db/indexes.ts`
- Create: `apps/web/src/db/__tests__/analytics-ops.test.ts`

**Interfaces:**
- Produces: `nativeGrowthEventOps.getDailyPuzzleQuality(start: Date, end: Date)` returning records with `puzzleDate`, `players`, `guessBuckets`, and `outcomes` only.
- Consumes: existing `PuzzleAttempt` records. Identity is used only in an internal `$group` stage.

- [ ] **Step 1: Write `aggregates exact buckets and outcomes without exposing player or answer fields` and `buffers local puzzle dates and returns only the newest 30 active dates` tests** against the aggregation method and its Mongo pipeline contract.
- [ ] **Step 2: Run the focused test** with `pnpm --filter @rebuzzle/web exec jest --runInBand src/db/__tests__/analytics-ops.test.ts`; confirm failures are due to the missing method/aggregation result.
- [ ] **Step 3: Add the Mongo aggregation** in `analytics-ops.ts`; filter official date-shaped keys, group by `{userId, puzzleDate}`, exclude finalization rows from guess counts, then return date-only aggregates.
- [ ] **Step 4: Add a `puzzleDate` index** in the existing `puzzleAttempts` index registry.
- [ ] **Step 5: Re-run the focused tests** and confirm the aggregate contract passes.

### Task 2: Expose the metrics through the admin route

**Files:**
- Modify: `apps/web/src/app/api/admin/native-funnel/route.ts`
- Modify: `apps/web/src/app/api/admin/native-funnel/__tests__/route.test.ts`

**Interfaces:**
- Produces: the existing response plus `summary.dailyPuzzleQuality`.
- Consumes: `nativeGrowthEventOps.getDailyPuzzleQuality(start, end)`.

- [ ] **Step 1: Add `includes daily puzzle quality after admin verification` and `returns 503 when the daily quality aggregation fails` route tests**; assert private/no-store and no account IDs or raw answer fields.
- [ ] **Step 2: Run the focused route test** and verify the new response assertion fails before implementation.
- [ ] **Step 3: Call the new aggregate** for the existing 30-day period and include only its typed date-level results.
- [ ] **Step 4: Re-run route tests** and confirm failure behavior remains 503 if either aggregate is unavailable.

### Task 3: Render the daily quality table and document evidence

**Files:**
- Modify: `apps/web/src/components/admin/tabs/NativeGrowthCard.tsx`
- Modify: `docs/product/native-growth-scorecard.md`

**Interfaces:**
- Consumes: `summary.dailyPuzzleQuality` returned by the existing route.
- Displays: semantic table labeled as all-platform, server-recorded daily puzzle data, with recent puzzle date, players, guess buckets, and outcome counts.

- [ ] **Step 1: Add `renders all-platform daily player counts and outcome distributions in an accessible table` and `shows a clear empty state when no server-recorded attempts exist` tests** using React's server renderer.
- [ ] **Step 2: Render a responsive semantic table** and an empty state; label that rows represent server-recorded player-days and that counts are not enjoyment or solve-time evidence.
- [ ] **Step 3: Update the scorecard** to distinguish source implementation from production data and player outcomes.
- [ ] **Step 4: Run the focused web tests, web typecheck, and `git diff --check`.**
