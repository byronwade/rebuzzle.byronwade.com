# Human-reviewed daily pool implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Keep generated puzzle candidates out of the public archive until each candidate passes the existing qualified blind-playtest admission rule.

**Architecture:** Add a private daily-candidate repository storing the full generated puzzle payload independently of `puzzles`. Extend the playtest service with a candidate-specific admission result using only qualified reviews. Queue AI generation from the existing ahead-of-time content workflow, then publish an atomically claimed admitted candidate for a date; otherwise retain the existing community/curated reserve path.

**Tech stack:** TypeScript, Next.js server actions, MongoDB, existing `puzzle-playtest-v3` service and Jest tests.

### Task 1: Candidate pool model and repository

**Files:** `apps/web/src/db/models.ts`, `apps/web/src/db/indexes.ts`, new `apps/web/src/lib/game/daily-puzzle-candidate-repository.ts`, its tests.

- [ ] Define candidate statuses, immutable payload snapshot, generation key, assigned date, policy version, review metadata, and timestamps.
- [ ] Add unique generation-key, candidate-ID, and single-date-assignment indexes.
- [ ] Implement idempotent insert, list-for-review, claim-ready-for-date, find-claim-for-date, mark-published, and release/skip operations with duplicate-key/race handling.
- [ ] Test idempotency, one-date assignment, concurrent claim protection, and retry behavior.

### Task 2: Per-candidate human admission evidence

**Files:** `apps/web/src/ai/puzzle-agent/review/puzzle-playtest-service.ts`, `apps/web/src/ai/puzzle-agent/review/__tests__/puzzle-playtest-service.test.ts`.

- [ ] Add a read-only candidate result keyed by puzzle ID that loads the existing candidate, controls, and reviews.
- [ ] Count only qualified reviewers and require the existing complete status/profile coverage.
- [ ] Reuse `humanSolveFloorEvidence`; require five qualified reviews on each of the current four profiles (20 total), reject above one multiple-answer report, and reject any explicit visual failure.
- [ ] Return compact eligibility and reasons without making candidate answers available through the player-facing playtest API.
- [ ] Test incomplete, unqualified, floor-failing, ambiguous, visually failing, and eligible candidates.

### Task 3: Queue future AI puzzles without publishing

**Files:** `apps/web/src/app/actions/puzzleGenerationActions.ts`, new candidate queue helper and tests.

- [ ] Add a queue-only generation mode for the cron's next-day pre-generation call.
- [ ] Persist the full puzzle payload in the private pool using a stable generation key; submit the exact candidate visual and puzzle ID to the playtest service.
- [ ] Make retries return the prior candidate without spending another generation attempt.
- [ ] Do not create a row in `puzzles`, assign a daily date, or run public revalidation for an unreviewed candidate.
- [ ] Make playtest submission failures visible as pending review and leave the candidate ineligible; provide a retry path on the next bounded workflow run.

### Task 4: Publish only admitted candidates

**Files:** `apps/web/src/app/actions/puzzleGenerationActions.ts`, candidate repository, `apps/web/src/lib/game/persist-daily-puzzle.ts`, related tests.

- [ ] At daily publication, try an existing claim for the same date, otherwise find the oldest candidate that passes individual human admission and atomically claim it.
- [ ] Persist with the existing answer and date uniqueness checks, adding admission contract and evidence reference to publication metadata.
- [ ] Mark the candidate published only after the public puzzle row is created; make retries recover the same candidate.
- [ ] Skip candidates with duplicate archived answers and continue to the next eligible candidate.
- [ ] Keep community and curated reserve fallback behavior unchanged when no candidate passes or review services fail.
- [ ] Ensure public daily requests never call AI generation; candidate generation remains a scheduled workflow action.

### Task 5: Wire schedule, explain gates, and verify

**Files:** `apps/web/src/app/api/workflows/daily-content/route.ts`, its tests, `apps/web/docs/HUMAN_PUZZLE_PLAYTESTING.md`, `docs/product/native-growth-scorecard.md`.

- [ ] Route next-day pre-generation through queue-only mode and report candidate status without implying a public puzzle exists.
- [ ] Preserve current error, budget, and reserve behavior for today's puzzle and blog generation.
- [ ] Document per-candidate admission separately from the aggregate 30-puzzle research release gate.
- [ ] Run focused candidate, playtest, persistence, workflow, and reserve tests; typecheck; inspect diff and confirm no answer reaches reviewer payloads.

## Completion check

- [ ] Report the exact tests and typecheck commands run, any environment failures, the branch/commit, and the operational index/deployment requirement.
- [ ] Do not report retention, enjoyment, revenue, or “hours-to-solve” improvement without live outcome evidence.
