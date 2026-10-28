# Studio Complete Puzzle Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bounded AI generation of complete, editable puzzle drafts to Studio.

**Architecture:** Add a dedicated authenticated endpoint that reserves one existing Studio AI credit, generates two candidates sequentially with `runPuzzleAgentGeneration`, and attaches rendered qualification through `qualifyRenderedCandidate`. A narrow adapter returns only puzzle fields and qualification state; a Studio control lets the creator load a selected draft into the current editor, where existing save and Eve review gates continue to apply.

**Tech Stack:** TypeScript, Next.js route handlers, Zod, MongoDB quota updates, Vercel AI SDK, React, Tailwind, Jest.

**Spec:** `docs/superpowers/specs/2026-10-28-studio-puzzle-drafts-design.md`

## Global Constraints

- Generate two candidates sequentially, with one bounded generation attempt per candidate.
- Accept a topic/brief (2–180 characters), an optional fixed answer (2–80 characters), and a difficulty from 1–10.
- Reuse the three-per-account Studio AI quota shared by image tiles and full-puzzle drafts; a successful candidate set uses one credit, and an unsuccessful request restores it.
- Run actual rendered-board recognition and player-simulation qualification before claiming a candidate passed.
- Candidate generation and selection never save, submit, publish, or schedule a daily puzzle.
- Continue to use the existing draft, grading, Eve review, and publication flow.
- Do not call the full daily `runApexGeneration` path or write its daily research, memory, training, or tournament records.
- Keep provider prompts, internal research, learning data, and provider errors out of the returned DTO.
- Follow the workbench grammar at `design.thorbis.com` while retaining Rebuzzle's current theme tokens and puzzle artwork.
- Leave all changes local and uncommitted; do not push, deploy, or create a TestFlight build.

## Review Focus

- Invalid or oversized JSON must not spend quota or call a model; cover malformed JSON, field lengths, and difficulty bounds in the route test.
- Missing authentication or Studio entitlement must stop before quota access and generation; cover 401 and 403 route paths.
- Quota exhaustion or concurrent reservation must not start generation; cover a failed atomic reservation and refund only a reserved unsuccessful request.
- Image tiles and full-puzzle generation share one atomic reservation path; cover reservation before image-provider work and refunds without exposing provider diagnostics.
- Partial generation and qualification outages must preserve usable candidates and report `pending` or `needs_review` accurately; cover a first-slot success/second-slot failure and a qualification exception.
- Selecting a candidate must populate editable fields without saving or retaining the previous draft ID; inspect the actual Studio flow at desktop and phone widths and typecheck the state wiring.

---

### Task 1: Safe Studio candidate adapter

**Files:**
- Create: `apps/web/src/ai/puzzle-agent/studio-drafts.ts`
- Create: `apps/web/src/ai/puzzle-agent/studio-draft-contract.ts`
- Test: `apps/web/src/ai/puzzle-agent/__tests__/studio-drafts.test.ts`
- Test: `apps/web/src/ai/puzzle-agent/__tests__/studio-draft-contract.test.ts`

**Interfaces:**
- Consumes: `PuzzleAgentResult`, `ApexCandidate`, and `PuzzleVisual` from the existing puzzle-agent modules.
- Produces: server adapter `toStudioApexCandidate(result: PuzzleAgentResult, slot: number): ApexCandidate` in `studio-drafts.ts`; client-safe `toStudioPuzzleDraft(candidate: ApexCandidate, qualification: StudioQualification): StudioPuzzleDraft` and `toStudioEditorValues(draft: StudioPuzzleDraft): StudioPuzzleEditorValues` in `studio-draft-contract.ts`.
- `StudioQualification` is `{ status: "passed" | "needs_review" | "pending"; issues: string[] }`.
- `StudioPuzzleDraft` exposes only `id`, `answer`, `explanation`, `hints`, `techniqueId`, `difficulty`, `visual`, and `{ status, issues }`.
- `StudioPuzzleEditorValues` returns blank title, undefined `draftId`, the candidate details, layout, and layers for the existing editor.

- [ ] **Step 1: Write failing candidate-adapter tests** for mapping a successful result, retaining a known technique, falling back to a safe technique when the identifier is unknown, and using an opaque slot ID that does not expose the answer or fingerprint.
- [ ] **Step 2: Write failing draft-contract tests** for bounding qualification issues, omitting provider/research/internal metadata from the public DTO, and mapping selection to editor values with no previous draft ID.
- [ ] **Step 3: Run both focused tests** from `apps/web`: `PATH=/Users/byronwade/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/jest --runInBand src/ai/puzzle-agent/__tests__/studio-drafts.test.ts src/ai/puzzle-agent/__tests__/studio-draft-contract.test.ts`. Confirm the candidate test fails on the exposed internal ID and the contract test fails because its module is missing.
- [ ] **Step 4: Implement `toStudioApexCandidate`** in `studio-drafts.ts`, using the same initial candidate defaults as Apex's existing `toCandidate` and an opaque per-response slot ID. Keep it server-only and free of imports from `tool-impl`.
- [ ] **Step 5: Implement `toStudioPuzzleDraft` and `toStudioEditorValues`** in the client-safe `studio-draft-contract.ts`; whitelist public fields and cap issue count and length.
- [ ] **Step 6: Re-run both focused tests** and confirm candidate mapping, editor reset, and data-boundary cases pass.

### Task 2: Reversible AI credit reservation

**Files:**
- Modify: `apps/web/src/lib/ugc/studio-ai-quota.ts`
- Create: `apps/web/src/lib/ugc/__tests__/studio-ai-quota.test.ts`

**Interfaces:**
- Consumes: existing `consumeStudioAiGeneration(userId)` atomic reservation.
- Produces: `refundStudioAiGeneration(userId: string): Promise<void>` that decrements only a positive `studioAiGenerationsUsed` value.

- [ ] **Step 1: Write failing tests** for a refund decrementing one reserved credit and for the Mongo update filter refusing to decrement below zero.
- [ ] **Step 2: Run the focused quota test** from `apps/web`: `env PATH=/Users/byronwade/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/jest --runInBand src/lib/ugc/__tests__/studio-ai-quota.test.ts`. Confirm it fails because the refund helper is missing.
- [ ] **Step 3: Implement `refundStudioAiGeneration`** with one guarded `$inc: { studioAiGenerationsUsed: -1 }` update on the `users` collection.
- [ ] **Step 4: Re-run the quota test** and confirm both cases pass.

### Task 3: Bounded puzzle-generation endpoint

**Files:**
- Create: `apps/web/src/app/api/studio/puzzles/generate/route.ts`
- Create: `apps/web/src/app/api/studio/puzzles/generate/__tests__/route.test.ts`
- Consumes: server adapter from Task 1, client-safe draft contract from Task 1, and quota reservation/refund from Task 2.

**Interfaces:**
- `POST /api/studio/puzzles/generate` accepts `{ prompt: string; answer?: string; difficulty: number }`.
- Success returns `{ candidates: StudioPuzzleDraft[]; partial: boolean; used: number; limit: number; remaining: number }`.
- Errors return a bounded user-facing `error`; unsuccessful requests refund the reserved credit.

- [ ] **Step 1: Write failing route tests** for authentication and entitlement gates; malformed/oversized requests and all field bounds; quota exhaustion; sequential two-slot generation with the optional locked answer; rejecting a result that changes the fixed answer; rendered qualification statuses; per-IP rate limiting; partial success; qualification outage as `pending`; and a no-candidate provider failure returning the reserved credit without exposing provider details.
- [ ] **Step 2: Run the focused route test** from `apps/web`: `env PATH=/Users/byronwade/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/jest --runInBand src/app/api/studio/puzzles/generate/__tests__/route.test.ts`. Confirm it fails because the route is missing.
- [ ] **Step 3: Implement the route** using `getAuthenticatedUser`, `requireStudioUser`, the existing per-IP `rateLimit`, a small request-size limit, and Zod validation. Set `maxDuration = 300`. Reserve one credit before provider work. Run two candidate slots sequentially via `runPuzzleAgentGeneration` with `maxAttempts: 1`, `candidateIndex`, `candidateCount: 2`, the requested difficulty/topic, optional `answerSeed`, and `deferRenderedEvaluation: true`. Convert each successful candidate with Task 1, run `qualifyRenderedCandidate`, and serialize only the allowlisted draft DTO. If qualification throws, retain that candidate as `pending`; if one generation slot fails, return the successful partial set; if both fail, refund the reservation and return a recoverable 502.
- [ ] **Step 4: Re-run the focused route test** and confirm all request, quota, privacy, and partial-result cases pass.

### Task 4: Full-puzzle generator control

**Files:**
- Create: `apps/web/src/components/studio/StudioPuzzleGenerator.tsx`
- Create: `apps/web/src/components/studio/__tests__/StudioPuzzleGenerator.test.ts`
- Consumes: `StudioPuzzleDraft` from `studio-draft-contract.ts`, route DTO, and shared Studio quota.
- Produces: an `onUseDraft(draft: StudioPuzzleDraft)` callback for the parent Studio editor.

- [ ] **Step 1: Write a server-rendered component test** that verifies the topic, optional answer, difficulty, shared-credit explanation, and stable **Generate 2 ideas** action are present in the initial form without requiring a new DOM-testing dependency.
- [ ] **Step 2: Run the focused component test** from `apps/web`: `env PATH=/Users/byronwade/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/jest --runInBand src/components/studio/__tests__/StudioPuzzleGenerator.test.ts`. Confirm it fails because the component is missing.
- [ ] **Step 3: Implement the generator form and result states**: topic, optional fixed answer, difficulty 1–10, stable **Generate 2 ideas** action, shared-credit copy, pending status, recoverable errors, and candidate qualification wording. Keep entered values when a request fails.
- [ ] **Step 4: Implement the compact vertical candidate list** with the rendered board first, then answer/explanation/difficulty/check state and a **Use this draft** action. Use existing theme tokens, the recessed field and raised commit treatment, visible keyboard focus, and reduced-motion-safe behavior; avoid gradients, decorative color badges, and a new page shell.
- [ ] **Step 5: Wire response data** so shared quota updates from the server, one successful candidate remains usable when the other slot fails, and qualification errors display as pending rather than passed.
- [ ] **Step 6: Re-run the focused component test** and confirm the form contract is present.

### Task 5: Integrate with the existing Studio editor

**Files:**
- Modify: `apps/web/src/components/studio/PuzzleStudio.tsx`

- [x] **Step 1: Add the two-mode AI selector** inside the current AI tab, preserving the existing image-tile generator and making the shared three-credit limit clear.
- [x] **Step 2: Connect `StudioPuzzleGenerator`** to current quota state and the editor setters.
- [x] **Step 3: Import `toStudioEditorValues` from the client-safe contract and on selection load the answer, explanation, three hints, technique, difficulty, visual layout, and layers; clear `draftId` so selecting a generated puzzle cannot overwrite the previous draft; return to the board step and focus the board. Do not call the save or submit endpoints.**
- [x] **Step 4: Verify the current content-fingerprint effect clears grade/Eve review state after the generated content loads.**
- [ ] **Step 5: Inspect the Studio at desktop and 390px widths** for scroll position, keyboard focus, visible errors, and the two-candidate selection path.

### Task 6: Make image-tile generation use atomic shared credits

**Files:**
- Modify: `apps/web/src/app/api/studio/generate/route.ts`
- Test: `apps/web/src/app/api/studio/generate/__tests__/route.test.ts`

- [x] **Step 1: Write failing route tests** for reservation-before-provider order, exhausted quota, provider failures and exceptions, safe error output, and invalid concepts.
- [x] **Step 2: Run the focused route test** and confirm it fails on the current consume-after-provider flow and leaked provider diagnostics.
- [x] **Step 3: Reserve before generation;** return the existing 403 quota contract when exhausted, refund on failed/throwing generation, refresh quota after a refund, and keep provider diagnostics out of the response.
- [x] **Step 4: Re-run the focused route tests** and confirm all reservation and refund paths pass.

### Task 7: Final verification and review

**Files:**
- Verify: `apps/web/src/ai/puzzle-agent/studio-drafts.ts`
- Verify: `apps/web/src/lib/ugc/studio-ai-quota.ts`
- Verify: `apps/web/src/app/api/studio/puzzles/generate/route.ts`
- Verify: `apps/web/src/app/api/studio/generate/route.ts`
- Verify: `apps/web/src/components/studio/StudioPuzzleGenerator.tsx`
- Verify: `apps/web/src/components/studio/PuzzleStudio.tsx`

- [x] **Step 1: Run focused tests** for the adapters, quota helper, both generation endpoints, generator component, and Studio selection flow.
- [x] **Step 2: Run web typecheck and Biome** on the changed TypeScript files using the installed binaries with Node 24 on `PATH`; do not run pnpm install or alter `node_modules`.
- [x] **Step 3: Run `git diff --check`** and inspect the full diff for interactions with pre-existing dirty work.
- [x] **Step 4: Perform an independent code review** of authorization order, credit refund paths, sequential generation, allowlisted response fields, no-daily-side-effect boundary, and existing Studio save/review behavior.
- [x] **Step 5: Record the result as local-only.** Do not commit, push, deploy, or create an App Store/TestFlight build.
