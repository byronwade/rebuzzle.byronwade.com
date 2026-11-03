# Canonical Daily Board Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure each human-reviewed daily candidate is persisted and delivered as the same verified responsive board image used during playtesting.

**Architecture:** Compile the candidate visual before human review and store it with the private candidate. Use a compare-and-set payload update for old candidates that are still waiting to be submitted. Before publication, recompile from source, reject any existing artifact that differs, and persist/return the verified visual. The existing serializer, API gate, and iOS `CanonicalBoardView` complete the path to the player.

**Tech Stack:** TypeScript, Sharp, Mongo repository, Jest, existing Swift `CanonicalBoard` decoder and SwiftUI board view.

**Spec:** `docs/superpowers/specs/2026-11-02-canonical-daily-board-design.md`

## Global Constraints

- Do not change the shared board geometry or recognition profiles in this task.
- Never trust an incoming canonical raster; rebuild it from the source visual before first playtest submission.
- Only replace candidate payloads while status is `reviewing` and no playtest submission exists.
- A reviewed candidate with a changed canonical image cannot be published.
- Keep legacy published rows renderable through the existing SwiftUI fallback.

## Review Focus

1. A new candidate must store and submit the same compiled visual; cover this in the queue test.
2. A retry of an unsubmitted candidate must persist the compiled visual before submission; cover this with the repository compare-and-set test.
3. A candidate already submitted for review must not be silently changed; cover this in the queue test.
4. A reviewed candidate with an artifact that does not match its source must not publish; cover this in the publisher test.
5. A successful publication must preserve mobile profile rasters through persistence and public serialization; cover this in publisher/serializer tests.

---

### Task 1: Canonicalize candidates before human playtesting

**Files:**
- Modify: `apps/web/src/lib/game/queue-daily-puzzle-candidate.ts`
- Modify: `apps/web/src/lib/game/daily-puzzle-candidate-repository.ts`
- Modify: `apps/web/src/lib/game/__tests__/queue-daily-puzzle-candidate.test.ts`
- Modify: repository tests for `daily-puzzle-candidate-repository.ts`

**Interface:**
- Add `replacePayloadForReview({ id, expectedStatusVersion, payload, updatedAt })`, guarded by `status: "reviewing"`, matching `statusVersion`, and absent `playtestSubmittedAt`.
- Queueing compiles `payload.visual`, stores the returned `canonicalBoard` before submission, and submits that exact stored visual to playtest.

- [x] Add tests proving a new candidate is persisted with canonical variants before playtest receives it.
- [x] Add tests proving a pending unsubmitted candidate is updated through the guarded repository operation, while a submitted candidate remains untouched.
- [x] Run the focused queue/repository tests and confirm the new assertions fail for missing canonicalization/update behavior.
- [x] Implement compilation and compare-and-set persistence, preserving retry behavior when compilation or review submission fails.
- [x] Re-run focused queue/repository tests.
- [x] Commit: `Compile daily boards before human review`.

### Task 2: Publish only the reviewed canonical board

**Files:**
- Modify: `apps/web/src/lib/game/publish-reviewed-daily-puzzle.ts`
- Modify: `apps/web/src/lib/game/__tests__/publish-reviewed-daily-puzzle.test.ts`
- Test: `apps/web/src/lib/game/__tests__/public-visual.test.ts`

**Interface:**
- Before persistence, compile the candidate's source visual again.
- If a stored canonical board exists and differs from the fresh result, reject the candidate with a recorded reason and continue to another eligible candidate.
- Persist and return the fresh canonical visual so the first API response matches the Mongo row.

- [x] Add tests for successful persistence/response with all profile variants and for rejecting a mismatched stored artifact.
- [x] Run focused publisher/serializer tests and confirm the new assertions fail.
- [x] Implement source/artifact verification and canonical return data without changing admission thresholds.
- [x] Re-run focused publisher/serializer tests and the full touched Jest suites.
- [x] Commit: `Publish the reviewed canonical daily board`.

### Task 3: Verify the production path

**Files:** all files in Tasks 1–2.

- [x] Run the complete relevant web test suites and typecheck.
- [x] Confirm existing canonical renderer tests prove byte parity between the source renderer and compiled profile PNGs.
- [ ] Run `git diff --check`, review the full diff, and push the verified branch to PR #219.
