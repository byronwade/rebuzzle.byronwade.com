# Native Daily Difficulty Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a sufficiently broad sample of native players’ difficulty ratings improve future Apex daily puzzle calibration.

**Architecture:** Extend the existing difficulty-perception aggregate and `performance-monitor.ts` loader. Keep native ratings in their existing `nativeGrowthEvents` collection, deduplicate by account to the latest response in the window, and apply them only at the ten-account threshold. The current `measureWindowPerformance` path already feeds Apex’s learning context, so no new generation API or data model is needed.

**Tech Stack:** TypeScript, Jest, MongoDB collection query abstractions.

**Spec:** `docs/product/native-difficulty-calibration.md`

## Global Constraints

- Preserve the existing web `difficulty_accuracy` feedback mapping and thresholds.
- Require at least 10 distinct native accounts before native ratings affect difficulty.
- Treat `tough_but_fair` as a healthy challenge signal; it must never lower difficulty.
- Exclude `unclear` from difficulty math and only use it for a clarity note at three eligible ratings.
- Never send account identifiers or raw feedback records to generation.
- Native feedback query failure must not discard web votes or behavioral calibration.

## Review Focus

- Several days from one account: only that account’s latest native rating counts.
- Nine unique accounts: native ratings do not shift calibration; ten eligible accounts may.
- `unclear` ratings: no difficulty delta; clarity note appears only at the documented threshold.
- `tough_but_fair` ratings: no easing signal is generated.
- Database failure: existing web and solve data remain usable.

---

### Task 1: Feed native difficulty ratings into Apex calibration

**Files:**
- Modify: `apps/web/src/ai/learning/performance-monitor.ts`
- Modify: `apps/web/src/ai/learning/difficulty-perception.ts`
- Modify: `apps/web/src/ai/learning/__tests__/difficulty-perception.test.ts`
- Create: `apps/web/src/ai/learning/__tests__/performance-monitor.native-feedback.test.ts`

**Interfaces:**
- Consumes: `NativeGrowthEvent` records with `eventType: "daily_quality_feedback"`, `userId`, `occurredAt`, and `rating` from `nativeGrowthEvents`.
- Produces: the existing `measureWindowPerformance(input?: { lookbackDays?: number; minFinals?: number }): Promise<WindowPerformance>` with native aggregate notes blended into its existing difficulty delta.

- [x] **Step 1: Add failing tests**
  - In `difficulty-perception.test.ts`, add `keeps tough but fair votes in the challenge band`: five `toughButFair` votes produce delta `0` and a challenge-preserving note. Add `excludes unclear votes from difficulty math`: three `unclear` votes produce delta `0` and a clarity note.
  - In `performance-monitor.native-feedback.test.ts`, add `requires ten distinct native accounts`: with eight behavioral finals in the healthy challenge band, nine distinct `too_easy` accounts produce delta `0`, while ten produce a positive delta.
  - Add `uses each account's newest native rating`: four accounts answer `too_easy`, three answer `just_right`, and three answer `tough_but_fair`; one of those three has an older `too_easy` then newer `tough_but_fair` response. The ten-account aggregate produces delta `0`; counting both responses would incorrectly raise difficulty. Assert the Mongo pipeline sorts newest-first before grouping by account, then groups by rating, and the returned notes contain no account IDs.
  - Add `keeps web votes when native feedback is unavailable`: with the native collection aggregation rejected and five web `tooEasy` votes, the returned difficulty delta stays positive.
- [x] **Step 2: Run the focused tests and confirm the expected failures**

  Run from `apps/web`: `pnpm test -- --runInBand src/ai/learning/__tests__/difficulty-perception.test.ts src/ai/learning/__tests__/performance-monitor.native-feedback.test.ts`

  Expected: the new assertions fail because the aggregate and loader do not yet use native ratings.
- [x] **Step 3: Implement the aggregate mapping and native loader**
  - Extend `aggregatePerceptionDelta` inputs with optional `toughButFair` and `unclear` counts. Include `toughButFair` in the calibrated sample; exclude `unclear` from the difficulty denominator. Add a challenge note for `toughButFair` ratings and a clarity note when `unclear >= 3`.
  - In `loadPerceptionVotes`, aggregate recent native quality events in MongoDB: match the lookback window and known ratings, sort newest first, group by account using the first rating, then count accounts by rating. Only the bounded rating counts cross into the app process; no raw account ID leaves MongoDB. Merge the aggregate only when there are at least 10 distinct accounts.
  - Forward challenge and clarity notes to generation even when the numeric difficulty delta is `0`; keep ordinary balanced-vote notes behind the existing non-zero-delta behavior.
  - Catch native query errors separately so web feedback is still returned. Do not include account identifiers in returned values or notes.
- [x] **Step 4: Run the focused tests and confirm they pass**

  Run from `apps/web`: `pnpm test -- --runInBand src/ai/learning/__tests__/difficulty-perception.test.ts src/ai/learning/__tests__/performance-monitor.native-feedback.test.ts`

  Expected: all focused tests pass; native query failure preserves the web feedback behavior.
- [x] **Step 5: Verify type safety and the full web test suite**

  Run from `apps/web`: `pnpm typecheck`

  Run from `apps/web`: `pnpm test -- --runInBand`

  Expected: TypeScript and all Jest suites pass.
- [x] **Step 6: Commit the implementation**

  ```bash
  git add docs/product/native-difficulty-calibration.md docs/superpowers/plans/2026-10-28-native-difficulty-calibration.md apps/web/src/ai/learning/performance-monitor.ts apps/web/src/ai/learning/difficulty-perception.ts apps/web/src/ai/learning/__tests__/difficulty-perception.test.ts apps/web/src/ai/learning/__tests__/performance-monitor.native-feedback.test.ts
  git commit -m "feat: calibrate daily difficulty from native feedback"
  ```
