# AI Puzzle Craft Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development task-by-task with tests and independent review. Standing user approval permits implementation and release without repeated confirmation.

**Goal:** Let AI design stronger puzzle mechanisms and grounded hints rather than decorate frozen templates.
**Architecture:** Add a bounded validated mechanism plan before authoritative composition, reuse existing host composition and independent qualification, and give critique the complete structural board. Improve diagnostic evaluation without weakening gates.
**Tech Stack:** TypeScript, Zod, Vercel AI SDK, existing Jest/renderer/benchmark tools.
**Spec:** docs/superpowers/specs/2026-10-26-ai-puzzle-craft-design.md

## Global constraints
- Fixed answer, reviewed catalog assets, native-supported visuals, existing novelty and independent rendered gates.
- One bounded planning call per candidate; at most the existing one repair. No silent retries or extra daily publications.
- Preserve published dates and exclude all internal plans/solutions from public payloads.
- No claimed quality uplift without evidence; live pilot results must include rejections.

## Review focus
- Unapproved layout drift after planning: preserve authoritative structure tests.
- A plan with arbitrary/unsupported symbols: reject before asset/render expenditure.
- Early hint answer leaks or duplicate hints: reject/rebuild, never silently pad.
- Reviewer cannot see spacing/size: include structured layout in critique input.
- Benchmark creates daily rows or leaks secrets: no publication path; capture artifacts and only sanitized failures.

### Task 1: Approved mechanism design
Files: new apex/mechanism-plan.ts and tests; run-generation.ts, generation params/schema, existing preflight integration tests.
- [x] Write failing tests for distinct approved arrangements, answer lock, catalog grounding, unsupported plans and later structure drift.
- [x] Implement typed bounded plan with visible cue-to-deduction mapping and three hints. Compose host-side and retain immutable approved board. Allow bounded critique re-planning while preserving answer.
- [x] Run focused integration tests and review failure paths/budgets.

### Task 2: Board-aware critique and useful hints
Files: apex/critique.ts/tests; tool-impl.ts hint function/tests, mechanism-plan adapter if needed.
- [x] Reproduce critique losing layout/emphasis; pass sanitized structured board and require actionable cue-specific objections.
- [x] Reproduce supplied specific hints being diluted by boilerplate. Preserve validated three-stage hints; reject repetition/answer leakage rather than padding.
- [x] Run critique, hint, and rendered finalist tests.

### Task 3: Diagnostic evaluation and release
Files: benchmark-live-generator.ts and generator-canary.ts/tests as needed; release evidence docs.
- [x] Capture full accepted candidate data and independent daily admission results; record every rejection. Add explicit daily-target pilot option without changing existing four-tier evaluation semantics.
- [x] Run bounded live diagnostic calls if existing credentials work; report auth/network blockers honestly. A paired baseline comparison is a separate benchmark, not implied by this pilot. No claim of statistically established uplift from a small pilot.
- [x] Run full tests, typecheck, lint, render representative new candidates and obtain independent review.
- [x] Publish checked backend changes, verify live daily unchanged, and update release evidence.

## Execution ledger

- Task 1: mechanism planner and host integration implemented. Live calls exposed oneOf provider incompatibility and coincident text; both fixed with regressions. Seed ingredients are now inspiration for approved plans, preserving fixed answer and independent gates. Explicit negative examples distinguish real interacting deductions from joining labels.
- Task 2: board-aware critique and authored hint validation implemented; tool contract integration and focused tests complete.
- Task 3: complete candidate/rejection diagnostics and guards for training capture, asset quarantine, and Elo writes implemented. Research cache is memory-only. Initial live pilots rejected easy candidates; provider call/rendering verified. Full suite passed 945 tests before the seed-inspiration refinement. No measured quality-uplift claim.
- Existing published daily and unrelated release notes remain preserved.

- Live trials exposed a reviewed-icon admission mismatch (heart/clock): generated shape-count heuristics blocked them before recognition. Catalog/human-approved assets retain integrity and independent pixel recognition; generated assets retain structural heuristics.
- Added 48-hour, versioned preference after explicitly classified early score/difficulty failures. Missing evidence/provider errors do not update it; deferred rendered failures remain outside this narrow feedback scope.

- Final pre-release verification: 169 suites / 972 tests, typecheck, and lint pass (existing warnings). Independent review cleared final deltas. Live heart/clock recognition succeeds; final two-candidate target8 pilot accepted0 and recorded both failures. No measured quality-uplift claim.

- Production source `2b4ca66071ab0a3522d6c1eff11571fdd8cd33b5` deployed as `dpl_2frUdPiw71PiVjD8mJkYkT8LhK8j` (READY). Custom domain responds successfully; published puzzle id/date/deadline preserved and private planning/solution fields absent. PR206 remains open for remaining hosted checks; no native binary changed.
