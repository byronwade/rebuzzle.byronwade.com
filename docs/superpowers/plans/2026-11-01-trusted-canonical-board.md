# Trusted Canonical Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every AI daily candidate, reserve and published daily carries a verified `canonicalBoard`, so players on web and iOS see the exact pixels that passed the blind-solve, playtest and recognition checks. This is PR A of `docs/superpowers/specs/2026-10-31-puzzle-visual-tricks-design.md`.

**Architecture:**
- `compileCanonicalBoard` stays the only producer of boards. It gains trust helpers: a source fingerprint, `hasTrustedCanonicalBoard`, `ensureTrustedCanonicalBoard`, and the `canonical-board-failed` reason.
- Each pipeline point calls these helpers through an injectable function, so tests stub them the way `verifyAssets` is already stubbed:
  - the daily candidate queue, when it inserts a candidate
  - reserve selection, which skips a reserve that won't compile
  - the reviewed-daily publisher, which validates the board or compiles one
  - a Mongo backfill service behind a thin script
- The rendered blind-solve already rasterises through `renderPuzzleVisualProfile`, the same function the compiler uses. A byte-parity test locks that equality in.
- iOS decodes `caption` and shows it only under the fallback board. The canonical PNG already contains the caption.

**Tech Stack:** TypeScript (Next.js 16 server code), zod 4, sharp, MongoDB driver, Jest with ts-jest (`apps/web/jest.config.js`, which maps `server-only` to `src/test/server-only.ts`), tsx for scripts, Swift 6 and SwiftUI, and XCTest in the `apps/ios/Core` Swift package.

---

## Verified facts and spec corrections

I checked these against the `feat/puzzle-visual-tricks` checkout on 2026-11-01:

1. **Correct: AI and reserve dailies lack `canonicalBoard`.**
   - `compileCanonicalBoard` is called only from `lib/ugc/eve-review.ts:495`.
   - `persistReservePuzzle` (`app/actions/puzzleGenerationActions.ts:69`) and the queue never compile one.
2. **Partly correct: where candidates are enqueued.** The spec's line references point at the call site (`puzzleGenerationActions.ts:528–553` and `:271–286`). The insert itself happens in `createDailyPuzzleCandidateQueue().enqueue` (`lib/game/queue-daily-puzzle-candidate.ts`). The plan compiles there, so both call sites are covered without touching the action.
3. **Partly correct: the solve check's renderer.**
   - `player-sim.ts` renders with `renderPuzzleVisualProfiles` (lines 97 and 125). That calls `renderPuzzleVisualProfile`, the same function `compileCanonicalBoard` rasterises with.
   - I compiled the six playtest controls in a scratch run. In all 24 cases (6 controls × 4 profiles) the canonical PNG bytes were identical to the render-path pixels, both with and without the board attached.
   - So `player-sim.ts` needs no code change. The deliverable is the byte-parity test (Task 2).
4. **New finding: two reserves fail to compile today.**
   - `demanding:tall-order` and `demanding:rising-star` (2 of 70) fail zod validation: `profileVariants.*.height` and `height` are not integers ("expected int, received number").
   - `render-board.ts` passes fractional SVG heights from tall stacked layouts.
   - Task 2 fixes this by rounding the board size up to whole pixels. Without the fix, AI boards with tall stacked text would be rejected with `canonical-board-failed`.
5. **Spec deviation: where the iOS caption is shown.**
   - `renderPuzzleVisualProfile` draws `visual.caption` into the PNG, and the existing test asserts that a different caption changes the hash.
   - The web shows the caption only in its layer-render branch (`PuzzleVisualBoard.tsx:568`). The canonical branch returns early at line 433.
   - So iOS shows the caption only under `VisualBoard`, the fallback. Under `CanonicalBoardView` it would appear twice. This still meets the spec's "no behavior change when a board is present".
6. **Types.** The `db/models` `PuzzleVisual` type can't be assigned to the zod output type (`emphasis` is optional in the DB type). It can be assigned to the schema's input type. Task 1 widens the compiler's parameter to `PuzzleVisualInput`. It must not parse first, because parsing would strip the unknown keys that the compiler deliberately rejects.
7. **Scripts.** Plain `tsx` throws on `canonical-board.ts` because of `import "server-only"`. `tsx --conditions=react-server` works.

## Commands used throughout

From the repo root `/Users/byronwade/ios-work/rebuzzle-prestige`:
- **One Jest file:** `pnpm --filter @rebuzzle/web exec jest <path relative to apps/web>`
- **Typecheck:** `pnpm --filter @rebuzzle/web typecheck`. `tsconfig` excludes `__tests__`; ts-jest type-checks the tests when they run.
- **Lint:** `pnpm --filter @rebuzzle/web lint`. Biome only checks `src/**`.
- **iOS Core:** `cd apps/ios/Core && swift test`
- The "Unsupported engine (node 24.x)" pnpm warning is expected locally and harmless.

## File structure

| File | Change | Responsibility |
| --- | --- | --- |
| `apps/web/src/ai/puzzle-agent/visual/composition.ts` | modify | Export `PuzzleVisualInput` (the schema's input type). |
| `apps/web/src/ai/puzzle-agent/visual/canonical-board.ts` | modify | Widen the compiler's input. Add `CANONICAL_BOARD_FAILED`, `canonicalSourceFingerprint`, `hasTrustedCanonicalBoard` and `ensureTrustedCanonicalBoard`. |
| `apps/web/src/ai/puzzle-agent/visual/__tests__/canonical-board.test.ts` | modify | Tests for fingerprint, trust and recompile. |
| `apps/web/src/ai/puzzle-agent/visual/render-board.ts` | modify | Round board width and height up to whole pixels, so tall stacked boards compile. |
| `apps/web/src/ai/puzzle-agent/visual/__tests__/canonical-solve-parity.test.ts` | create | Byte-parity test: on the six controls and two tall reserves, the solve-check renders equal the canonical board. |
| `apps/web/src/lib/game/queue-daily-puzzle-candidate.ts` | modify | Compile at insert. A compile failure inserts a `rejected` row with reason `canonical-board-failed`. |
| `apps/web/src/lib/game/__tests__/queue-daily-puzzle-candidate.test.ts` | modify | Stub the compiler, and add tests for rejection and a real compile. |
| `apps/web/src/ai/puzzle-agent/reserve-puzzles.ts` | modify | `selectReservePuzzle` accepts `excludeIds`. |
| `apps/web/src/ai/puzzle-agent/__tests__/reserve-puzzles.test.ts` | modify | Exclusion test. |
| `apps/web/src/ai/puzzle-agent/mongo-reserve-puzzles.ts` | modify | Pass `excludeIds` through. |
| `apps/web/src/ai/puzzle-agent/reserve-canonical-board.ts` | create | Bounded loop that selects, compiles, and skips reserves that fail. |
| `apps/web/src/ai/puzzle-agent/__tests__/reserve-canonical-board.test.ts` | create | Tests for skip, log and exhaustion. |
| `apps/web/src/app/actions/puzzleGenerationActions.ts` | modify | `persistReservePuzzle` uses the reserve loop. |
| `apps/web/src/lib/game/publish-reviewed-daily-puzzle.ts` | modify | Validate the board or compile one before `persist`. A failure calls `skip` with `canonical-board-failed`. |
| `apps/web/src/lib/game/__tests__/publish-reviewed-daily-puzzle.test.ts` | modify | Tests for compiling a missing board and for rejecting on failure. |
| `apps/web/src/lib/game/canonical-board-backfill.ts` | create | Backfill service: idempotent, supports dry runs, reports failures. |
| `apps/web/src/lib/game/__tests__/canonical-board-backfill.test.ts` | create | Backfill tests. |
| `apps/web/src/lib/game/mongo-canonical-board-backfill-source.ts` | create | Mongo reads and guarded writes for `puzzles` and `dailyPuzzleCandidates`. |
| `apps/web/scripts/backfill-canonical-boards.ts` | create | Thin CLI: `--dry-run`, `--limit=N`, JSON report, non-zero exit on failures. |
| `apps/web/package.json` | modify | `db:backfill-canonical-boards` script. |
| `apps/ios/Core/Sources/RebuzzleCore/Models.swift` | modify | `PuzzleVisual.caption` decode and encode. |
| `apps/ios/Core/Tests/RebuzzleCoreTests/CanonicalBoardTests.swift` | modify | Test decoding a puzzle with a board and a caption, and the cache round trip. |
| `apps/ios/Rebuzzle/Features/TodayView.swift` | modify | Caption in secondary text under the fallback `VisualBoard`. |

Not changed (and why):
- `ai/puzzle-agent/apex/player-sim.ts` already judges the same bytes (fact 3).
- `lib/ugc/eve-review.ts` already compiles. The wider parameter type stays compatible.
- `puzzlePlaytestCandidates` rows are immutable snapshots. Their IDs hash the visual, so the backfill never touches them.

---

### Task 0: Baseline

**Files:** none

- [ ] **Step 1: Confirm branch and clean tree**

Run: `cd /Users/byronwade/ios-work/rebuzzle-prestige && git status --short && git branch --show-current`
Expected: no output from status, then `feat/puzzle-visual-tricks`.

- [ ] **Step 2: Record the baseline for touched suites**

Run: `pnpm --filter @rebuzzle/web exec jest src/ai/puzzle-agent/visual src/lib/game src/ai/puzzle-agent/__tests__/reserve-puzzles.test.ts src/ai/puzzle-agent/apex/__tests__/player-sim-hinted.integration.test.ts 2>&1 | tail -15`
Expected: all suites pass. If any fail, write their names down; those failures are not caused by this plan. Don't commit anything for this task.

---

### Task 1: Canonical trust helpers

**Files:**
- Modify: `apps/web/src/ai/puzzle-agent/visual/composition.ts`
- Modify: `apps/web/src/ai/puzzle-agent/visual/canonical-board.ts`
- Test: `apps/web/src/ai/puzzle-agent/visual/__tests__/canonical-board.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to the end of `apps/web/src/ai/puzzle-agent/visual/__tests__/canonical-board.test.ts`:

```ts
test("trusts an intact board compiled from the same source and recompiles stale ones", async () => {
  const board = await compiler.compileCanonicalBoard(visual);
  expect(compiler.canonicalSourceFingerprint(visual)).toBe(board.sourceFingerprint);

  const boarded = { ...visual, canonicalBoard: board };
  await expect(compiler.hasTrustedCanonicalBoard(boarded)).resolves.toBe(true);
  await expect(compiler.ensureTrustedCanonicalBoard(boarded)).resolves.toBe(boarded);

  const stale = { ...visual, caption: "Different", canonicalBoard: board };
  await expect(compiler.hasTrustedCanonicalBoard(stale)).resolves.toBe(false);
  const refreshed = await compiler.ensureTrustedCanonicalBoard(stale);
  expect(refreshed.canonicalBoard.sourceFingerprint).toBe(
    compiler.canonicalSourceFingerprint(stale)
  );
  expect(refreshed.canonicalBoard.sha256).not.toBe(board.sha256);

  const legacy = { ...visual, canonicalBoard: { ...board, profileVariants: undefined } };
  await expect(compiler.hasTrustedCanonicalBoard(legacy)).resolves.toBe(false);
  const tampered = { ...visual, canonicalBoard: { ...board, sha256: "0".repeat(64) } };
  await expect(compiler.hasTrustedCanonicalBoard(tampered)).resolves.toBe(false);
  await expect(compiler.hasTrustedCanonicalBoard(visual)).resolves.toBe(false);
}, 30_000);

test("ensureTrustedCanonicalBoard fails closed when the source cannot compile", async () => {
  expect(compiler.CANONICAL_BOARD_FAILED).toBe("canonical-board-failed");
  await expect(
    compiler.ensureTrustedCanonicalBoard({ ...visual, mode: "unicode" })
  ).rejects.toThrow();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @rebuzzle/web exec jest src/ai/puzzle-agent/visual/__tests__/canonical-board.test.ts`
Expected: FAIL. ts-jest reports `Property 'canonicalSourceFingerprint' does not exist` (or `... is not a function`) for the new tests.

- [ ] **Step 3: Export the schema input type**

In `apps/web/src/ai/puzzle-agent/visual/composition.ts`, after the line `export type PuzzleVisual = z.infer<typeof PuzzleVisualSchema>;`, add:

```ts
/** Pre-parse shape (defaults optional); stored DB visuals satisfy it. */
export type PuzzleVisualInput = z.input<typeof PuzzleVisualSchema>;
```

- [ ] **Step 4: Widen the compiler input and add the trust helpers**

In `apps/web/src/ai/puzzle-agent/visual/canonical-board.ts`:

Replace the import line:

```ts
import { type PuzzleVisual, PuzzleVisualSchema } from "./composition";
```

with:

```ts
import { type PuzzleVisualInput, PuzzleVisualSchema } from "./composition";
```

Replace the signature line:

```ts
export async function compileCanonicalBoard(input: PuzzleVisual): Promise<CanonicalBoard> {
```

with:

```ts
export async function compileCanonicalBoard(input: PuzzleVisualInput): Promise<CanonicalBoard> {
```

Append to the end of the file:

```ts
/** Stable reason recorded when a candidate or reserve cannot produce its checked board. */
export const CANONICAL_BOARD_FAILED = "canonical-board-failed";

/** Fingerprint of the hydrated source a canonical board must have been compiled from. */
export function canonicalSourceFingerprint(input: PuzzleVisualInput): string {
  const { canonicalBoard: _untrusted, ...source } = input;
  return hash(JSON.stringify(PuzzleVisualSchema.parse(source)));
}

/** True only for an intact, all-profile board compiled from exactly this source. */
export async function hasTrustedCanonicalBoard(input: PuzzleVisualInput): Promise<boolean> {
  const board = input.canonicalBoard;
  if (!board) return false;
  try {
    for (const profile of PUZZLE_BOARD_RECOGNITION_PROFILES) {
      if (profile.id !== "desktop-768" && !board.profileVariants?.[profile.id]) return false;
      await validateCanonicalBoard(canonicalBoardForProfile(board, profile.id));
    }
    return board.sourceFingerprint === canonicalSourceFingerprint(input);
  } catch {
    return false;
  }
}

/** Keep a trusted board; otherwise compile a fresh one. Throws when the source cannot compile. */
export async function ensureTrustedCanonicalBoard<T extends PuzzleVisualInput>(
  visual: T
): Promise<T & { canonicalBoard: CanonicalBoard }> {
  if (await hasTrustedCanonicalBoard(visual)) {
    return visual as T & { canonicalBoard: CanonicalBoard };
  }
  return { ...visual, canonicalBoard: await compileCanonicalBoard(visual) };
}
```

(`hash`, `validateCanonicalBoard`, `canonicalBoardForProfile` and `PUZZLE_BOARD_RECOGNITION_PROFILES` are already imported in this file. `canonicalSourceFingerprint` gives the same value as the compiler's own `hash(JSON.stringify(visual))`, because both hash the parsed source with the board removed.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @rebuzzle/web exec jest src/ai/puzzle-agent/visual/__tests__/canonical-board.test.ts`
Expected: PASS (all tests, including the four existing ones).

- [ ] **Step 6: Typecheck the widened signature**

Run: `pnpm --filter @rebuzzle/web typecheck`
Expected: exit 0. `lib/ugc/eve-review.ts` passes the parsed `PuzzleVisual`, which can be assigned to `PuzzleVisualInput`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/ai/puzzle-agent/visual/composition.ts apps/web/src/ai/puzzle-agent/visual/canonical-board.ts apps/web/src/ai/puzzle-agent/visual/__tests__/canonical-board.test.ts
git commit -m "feat(puzzles): trust canonical boards only when they match their source" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Solve checks judge the canonical bytes (byte-parity test and integer board size)

**Files:**
- Create: `apps/web/src/ai/puzzle-agent/visual/__tests__/canonical-solve-parity.test.ts`
- Modify: `apps/web/src/ai/puzzle-agent/visual/render-board.ts`

- [ ] **Step 1: Write the parity test**

Create `apps/web/src/ai/puzzle-agent/visual/__tests__/canonical-solve-parity.test.ts`:

```ts
/**
 * The rendered blind-solve (player-sim), editorial review and the human playtest renderer all
 * rasterise through renderPuzzleVisualProfile(s). Players see the compiled canonical PNG.
 * Byte equality here is what makes "the solve check judged the board players see" true.
 * Compared within one run (no golden hashes) because font rasterisation varies by machine.
 */
import { DEMANDING_RESERVE_PUZZLES } from "../../demanding-reserve-puzzles";
import { buildPuzzlePlaytestControlCorpus } from "../../review/puzzle-playtest-controls";
import { compileCanonicalBoard } from "../canonical-board";
import { canonicalBoardForProfile, validateCanonicalBoard } from "../canonical-contract";
import type { PuzzleVisual } from "../composition";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../presentation";
import { renderPuzzleVisualProfiles } from "../render-board";

async function expectSolveRendersMatchBoard(visual: PuzzleVisual) {
  const board = await compileCanonicalBoard(visual);
  const [unboarded, boarded] = await Promise.all([
    renderPuzzleVisualProfiles(visual),
    renderPuzzleVisualProfiles({ ...visual, canonicalBoard: board }),
  ]);
  const profileIds = PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => profile.id);
  expect(unboarded.map((rendered) => rendered.profileId)).toEqual(profileIds);
  expect(boarded.map((rendered) => rendered.profileId)).toEqual(profileIds);
  for (const [index, profileId] of profileIds.entries()) {
    const canonical = Buffer.from(
      await validateCanonicalBoard(canonicalBoardForProfile(board, profileId))
    );
    // .toBe(true) instead of toEqual keeps a mismatch from dumping two PNGs into the log.
    expect(Buffer.from(unboarded[index]!.pixels).equals(canonical)).toBe(true);
    expect(Buffer.from(boarded[index]!.pixels).equals(canonical)).toBe(true);
  }
}

const controls = buildPuzzlePlaytestControlCorpus();

test("the playtest control corpus is the six frozen controls", () => {
  expect(controls).toHaveLength(6);
});

test.each(controls.map((control) => [control.id, control.visual] as const))(
  "solve-check renders of %s are the canonical board bytes",
  async (_id, visual) => {
    await expectSolveRendersMatchBoard(visual);
  },
  30_000
);

test.each(["demanding:tall-order", "demanding:rising-star"])(
  "tall stacked reserve %s compiles to a board the solve check matches",
  async (id) => {
    const reserve = DEMANDING_RESERVE_PUZZLES.find((puzzle) => puzzle.id === id);
    expect(reserve).toBeDefined();
    await expectSolveRendersMatchBoard(reserve!.visual);
  },
  30_000
);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @rebuzzle/web exec jest src/ai/puzzle-agent/visual/__tests__/canonical-solve-parity.test.ts`
Expected: FAIL. The corpus test and all six control tests pass (parity already holds). The two `demanding:*` tests fail with a ZodError that includes `"expected int, received number"` on a `height` path.

- [ ] **Step 3: Round the board size up to whole pixels**

In `apps/web/src/ai/puzzle-agent/visual/render-board.ts`, inside `renderPuzzleVisualProfile`, replace:

```ts
  const width = layout.width;
  const height = Math.max(size.tile + profile.padding * 2, layout.height + captionHeight);
```

with:

```ts
  // PNG rasters and the canonical contract are integer-sized; never emit a fractional SVG.
  const width = Math.ceil(layout.width);
  const height = Math.ceil(
    Math.max(size.tile + profile.padding * 2, layout.height + captionHeight)
  );
```

- [ ] **Step 4: Run the parity test and the existing render tests**

Run: `pnpm --filter @rebuzzle/web exec jest src/ai/puzzle-agent/visual/__tests__/canonical-solve-parity.test.ts src/ai/puzzle-agent/visual/__tests__/render-board.test.ts src/ai/puzzle-agent/visual/__tests__/canonical-board.test.ts`
Expected: PASS.

If only the `boarded` assertion fails for a reserve, that reserve's canonical raster width differs from the profile's viewport, and the playtest renderer is rescaling it. Stop and report it. Don't loosen the test.

- [ ] **Step 5: Confirm player-sim needs no change**

Run: `grep -n "renderPuzzleVisualProfiles" apps/web/src/ai/puzzle-agent/apex/player-sim.ts`
Expected: lines 97 and 125 only, both on the render path the parity test covers. Don't edit `player-sim.ts`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/ai/puzzle-agent/visual/render-board.ts apps/web/src/ai/puzzle-agent/visual/__tests__/canonical-solve-parity.test.ts
git commit -m "test(puzzles): prove solve-check renders equal canonical board bytes" -m "Rounds board dimensions up to whole pixels so tall stacked boards compile." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Compile the board when a candidate is queued

**Files:**
- Modify: `apps/web/src/lib/game/queue-daily-puzzle-candidate.ts`
- Test: `apps/web/src/lib/game/__tests__/queue-daily-puzzle-candidate.test.ts`

- [ ] **Step 1: Update the existing tests and add failing ones**

In `apps/web/src/lib/game/__tests__/queue-daily-puzzle-candidate.test.ts`:

Add this import as the first import line:

```ts
import {
  type CanonicalBoard,
  validateCanonicalBoard,
} from "@/ai/puzzle-agent/visual/canonical-contract";
```

After the `payload` constant, add:

```ts
const compiledBoard: CanonicalBoard = {
  version: 1,
  pngDataUrl: "data:image/png;base64,iVBORw0KGgo=",
  sha256: "a".repeat(64),
  width: 1,
  height: 1,
  sourceFingerprint: "b".repeat(64),
};
```

Replace the `let queue` declaration and the `beforeEach` block:

```ts
  let queue: ReturnType<typeof createDailyPuzzleCandidateQueue>;

  beforeEach(() => {
    memory = memoryRepository();
    submitCandidate = jest.fn().mockResolvedValue(undefined);
    queue = createDailyPuzzleCandidateQueue(memory.repository, { submitCandidate }, () => now);
  });
```

with:

```ts
  let queue: ReturnType<typeof createDailyPuzzleCandidateQueue>;
  let compileBoard: jest.Mock;

  beforeEach(() => {
    memory = memoryRepository();
    submitCandidate = jest.fn().mockResolvedValue(undefined);
    compileBoard = jest.fn().mockResolvedValue(compiledBoard);
    queue = createDailyPuzzleCandidateQueue(
      memory.repository,
      { submitCandidate },
      () => now,
      compileBoard
    );
  });
```

In the test `"stores the complete puzzle privately and submits its exact board to blind review"`, replace the line `      visual,` inside the `toHaveBeenCalledWith({...})` object with:

```ts
      visual: { ...visual, canonicalBoard: compiledBoard },
```

and add this as the last line of that test:

```ts
    expect(compileBoard).toHaveBeenCalledWith(visual);
```

At the end of the test `"returns an existing generation-date candidate without creating or re-submitting it"`, add:

```ts
    expect(compileBoard).toHaveBeenCalledTimes(1);
```

At the end of the test `"refuses to queue a daily rebus without the exact composed visual board"`, add:

```ts
    expect(compileBoard).not.toHaveBeenCalled();
```

Add these two tests before the closing `});` of the `describe` block:

```ts
  it("rejects a candidate whose board cannot compile instead of sending it to playtest", async () => {
    compileBoard.mockRejectedValueOnce(new Error("Unsupported canonical pictogram"));

    const candidate = await queue.enqueue({ generationKey: "2026-10-29", payload });

    expect(candidate).toMatchObject({
      status: "rejected",
      rejectionReason: "canonical-board-failed",
    });
    expect(candidate.payload.visual?.canonicalBoard).toBeUndefined();
    expect(submitCandidate).not.toHaveBeenCalled();
    await expect(queue.retryPending()).resolves.toEqual({
      attempted: 0,
      submitted: 0,
      failed: 0,
    });
  });

  it("compiles the real checked board at queue time by default", async () => {
    const realQueue = createDailyPuzzleCandidateQueue(
      memory.repository,
      { submitCandidate },
      () => now
    );

    const candidate = await realQueue.enqueue({ generationKey: "2026-10-30", payload });

    const board = candidate.payload.visual?.canonicalBoard;
    expect(board).toBeDefined();
    await expect(validateCanonicalBoard(board)).resolves.toBeTruthy();
    expect(submitCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ visual: expect.objectContaining({ canonicalBoard: board }) })
    );
  }, 30_000);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @rebuzzle/web exec jest src/lib/game/__tests__/queue-daily-puzzle-candidate.test.ts`
Expected: FAIL.
- ts-jest reports `Expected 2-3 arguments, but got 4`.
- Once that is fixed in Step 3, the old code would leave `status: "reviewing"` and no `canonicalBoard`, so the new tests fail.

- [ ] **Step 3: Implement compiling at queue time**

In `apps/web/src/lib/game/queue-daily-puzzle-candidate.ts`:

Replace the import block at the top:

```ts
import { randomUUID } from "node:crypto";
import type { DailyPuzzleCandidate } from "@/db/models";
import type { DailyPuzzleCandidateRepository } from "./daily-puzzle-candidate-repository";
```

with:

```ts
import { randomUUID } from "node:crypto";
import {
  CANONICAL_BOARD_FAILED,
  compileCanonicalBoard,
} from "@/ai/puzzle-agent/visual/canonical-board";
import type { CanonicalBoard } from "@/ai/puzzle-agent/visual/canonical-contract";
import type { DailyPuzzleCandidate } from "@/db/models";
import type { DailyPuzzleCandidateRepository } from "./daily-puzzle-candidate-repository";

type CandidateVisual = NonNullable<DailyPuzzleCandidate["payload"]["visual"]>;

/** Compiles the checked board shown to playtesters and players. Throws when it cannot. */
export type DailyCandidateBoardCompiler = (visual: CandidateVisual) => Promise<CanonicalBoard>;
```

Replace the factory's opening (signature through `return {`):

```ts
export function createDailyPuzzleCandidateQueue(
  repository: QueueRepository,
  playtest: DailyPuzzleCandidatePlaytestSubmitter,
  now: () => Date = () => new Date()
) {
  return {
```

with:

```ts
export function createDailyPuzzleCandidateQueue(
  repository: QueueRepository,
  playtest: DailyPuzzleCandidatePlaytestSubmitter,
  now: () => Date = () => new Date(),
  compileBoard: DailyCandidateBoardCompiler = compileCanonicalBoard
) {
  // Compile before insert so playtesters and players see the same pixels. A board that
  // cannot compile is recorded as rejected; the date then falls back to the reserve path.
  async function insertWithCanonicalBoard(
    generationKey: string,
    payload: DailyPuzzleCandidate["payload"],
    visual: CandidateVisual
  ): Promise<DailyPuzzleCandidate> {
    const canonicalBoard = await compileBoard(visual).catch(() => null);
    const createdAt = now();
    const base = {
      id: randomUUID(),
      generationKey,
      policyVersion: "human-reviewed-daily-v1" as const,
      statusVersion: 0,
      createdAt,
      updatedAt: createdAt,
    };
    return repository.insert(
      canonicalBoard
        ? {
            ...base,
            status: "reviewing",
            payload: { ...payload, visual: { ...visual, canonicalBoard } },
          }
        : { ...base, status: "rejected", rejectionReason: CANONICAL_BOARD_FAILED, payload }
    );
  }

  return {
```

Inside `enqueue`, replace:

```ts
      if (input.payload.puzzleType !== "rebus" || !input.payload.visual) {
        throw new Error("Daily candidate requires a validated visual board");
      }

      const candidate =
        (await repository.findByGenerationKey(input.generationKey)) ??
        (await repository.insert({
          id: randomUUID(),
          generationKey: input.generationKey,
          policyVersion: "human-reviewed-daily-v1",
          status: "reviewing",
          statusVersion: 0,
          payload: input.payload,
          createdAt: now(),
          updatedAt: now(),
        }));
```

with:

```ts
      const visual = input.payload.visual;
      if (input.payload.puzzleType !== "rebus" || !visual) {
        throw new Error("Daily candidate requires a validated visual board");
      }

      const candidate =
        (await repository.findByGenerationKey(input.generationKey)) ??
        (await insertWithCanonicalBoard(input.generationKey, input.payload, visual));
```

The line `if (candidate.status !== "reviewing" || candidate.playtestSubmittedAt) return candidate;` already returns a rejected row without submitting it. Leave it unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @rebuzzle/web exec jest src/lib/game/__tests__/queue-daily-puzzle-candidate.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @rebuzzle/web typecheck`
Expected: exit 0. Both call sites in `puzzleGenerationActions.ts` still pass three arguments.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/game/queue-daily-puzzle-candidate.ts apps/web/src/lib/game/__tests__/queue-daily-puzzle-candidate.test.ts
git commit -m "feat(puzzles): compile the canonical board when a daily candidate is queued" -m "Candidates whose board cannot compile are stored as rejected with reason canonical-board-failed and never reach playtesters." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Reserve selection can exclude reserves

**Files:**
- Modify: `apps/web/src/ai/puzzle-agent/reserve-puzzles.ts`
- Modify: `apps/web/src/ai/puzzle-agent/mongo-reserve-puzzles.ts`
- Test: `apps/web/src/ai/puzzle-agent/__tests__/reserve-puzzles.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the end of `apps/web/src/ai/puzzle-agent/__tests__/reserve-puzzles.test.ts`:

```ts
describe("reserve exclusions", () => {
  it("never returns an excluded reserve id", async () => {
    const baseline = await selectReservePuzzle({
      dateString: "2026-08-01",
      usedAnswerKeys: new Set(),
      recentPuzzles: [],
      now: () => dateAt(0),
    });
    const replacement = await selectReservePuzzle({
      dateString: "2026-08-01",
      usedAnswerKeys: new Set(),
      recentPuzzles: [],
      now: () => dateAt(0),
      excludeIds: new Set([baseline.puzzle.id]),
    });

    expect(replacement.puzzle.id).not.toBe(baseline.puzzle.id);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @rebuzzle/web exec jest src/ai/puzzle-agent/__tests__/reserve-puzzles.test.ts -t "reserve exclusions"`
Expected: FAIL. ts-jest reports `Object literal may only specify known properties, and 'excludeIds' does not exist`.

- [ ] **Step 3: Add `excludeIds` to `selectReservePuzzle`**

In `apps/web/src/ai/puzzle-agent/reserve-puzzles.ts`, in the `selectReservePuzzle` input type, replace:

```ts
  now?: () => Date;
  corpus?: readonly ReservePuzzle[];
}): Promise<SelectedReservePuzzle> {
```

with:

```ts
  now?: () => Date;
  corpus?: readonly ReservePuzzle[];
  /** Reserve ids already rejected this request (for example, their board failed to compile). */
  excludeIds?: ReadonlySet<string>;
}): Promise<SelectedReservePuzzle> {
```

and replace:

```ts
  const available = corpus.filter(
    (puzzle) =>
      !input.usedAnswerKeys.has(normalizeAnswerKey(puzzle.answer)) &&
```

with:

```ts
  const available = corpus.filter(
    (puzzle) =>
      !input.excludeIds?.has(puzzle.id) &&
      !input.usedAnswerKeys.has(normalizeAnswerKey(puzzle.answer)) &&
```

- [ ] **Step 4: Pass it through in Mongo selection**

In `apps/web/src/ai/puzzle-agent/mongo-reserve-puzzles.ts`, replace:

```ts
export async function selectMongoReservePuzzle(input: {
  dateString: string;
  now?: Date;
}): Promise<SelectedReservePuzzle> {
```

with:

```ts
export async function selectMongoReservePuzzle(input: {
  dateString: string;
  now?: Date;
  excludeIds?: ReadonlySet<string>;
}): Promise<SelectedReservePuzzle> {
```

and replace:

```ts
  return selectReservePuzzle({
    dateString: input.dateString,
    usedAnswerKeys,
    recentPuzzles,
    now: () => now,
  });
```

with:

```ts
  return selectReservePuzzle({
    dateString: input.dateString,
    usedAnswerKeys,
    recentPuzzles,
    now: () => now,
    excludeIds: input.excludeIds,
  });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @rebuzzle/web exec jest src/ai/puzzle-agent/__tests__/reserve-puzzles.test.ts`
Expected: PASS (whole file).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/ai/puzzle-agent/reserve-puzzles.ts apps/web/src/ai/puzzle-agent/mongo-reserve-puzzles.ts apps/web/src/ai/puzzle-agent/__tests__/reserve-puzzles.test.ts
git commit -m "feat(puzzles): let reserve selection exclude rejected reserves" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Reserves compile a board or are skipped

**Files:**
- Create: `apps/web/src/ai/puzzle-agent/reserve-canonical-board.ts`
- Create: `apps/web/src/ai/puzzle-agent/__tests__/reserve-canonical-board.test.ts`
- Modify: `apps/web/src/app/actions/puzzleGenerationActions.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/ai/puzzle-agent/__tests__/reserve-canonical-board.test.ts`:

```ts
import { selectReserveWithCanonicalBoard } from "../reserve-canonical-board";
import { ReservePuzzleExhaustedError, selectReservePuzzle } from "../reserve-puzzles";
import type { CanonicalBoard } from "../visual/canonical-contract";

const board: CanonicalBoard = {
  version: 1,
  pngDataUrl: "data:image/png;base64,iVBORw0KGgo=",
  sha256: "a".repeat(64),
  width: 1,
  height: 1,
  sourceFingerprint: "b".repeat(64),
};

const select = jest.fn((excludeIds: ReadonlySet<string>) =>
  selectReservePuzzle({
    dateString: "2026-11-02",
    usedAnswerKeys: new Set(),
    recentPuzzles: [],
    now: () => new Date("2026-11-02T12:00:00.000Z"),
    excludeIds,
  })
);

describe("reserve canonical boards", () => {
  beforeEach(() => {
    select.mockClear();
  });

  it("attaches the compiled board to the selected reserve", async () => {
    const compileBoard = jest.fn().mockResolvedValue(board);

    const selected = await selectReserveWithCanonicalBoard({ select, compileBoard });

    expect(selected.puzzle.visual.canonicalBoard).toBe(board);
    expect(selected.skippedReserves).toEqual([]);
    expect(compileBoard).toHaveBeenCalledTimes(1);
  });

  it("logs and skips a reserve whose board fails to compile", async () => {
    const first = await selectReservePuzzle({
      dateString: "2026-11-02",
      usedAnswerKeys: new Set(),
      recentPuzzles: [],
      now: () => new Date("2026-11-02T12:00:00.000Z"),
    });
    const compileBoard = jest
      .fn()
      .mockRejectedValueOnce(new Error("Unsupported canonical pictogram"))
      .mockResolvedValue(board);
    const onSkip = jest.fn();

    const selected = await selectReserveWithCanonicalBoard({ select, compileBoard, onSkip });

    expect(selected.puzzle.id).not.toBe(first.puzzle.id);
    expect(selected.puzzle.visual.canonicalBoard).toBe(board);
    expect(selected.skippedReserves).toEqual([
      { reserveId: first.puzzle.id, error: "Unsupported canonical pictogram" },
    ]);
    expect(onSkip).toHaveBeenCalledWith({
      reserveId: first.puzzle.id,
      error: "Unsupported canonical pictogram",
    });
    expect(select.mock.calls[1]?.[0].has(first.puzzle.id)).toBe(true);
  });

  it("fails closed after the attempt budget instead of publishing an unchecked reserve", async () => {
    const compileBoard = jest
      .fn()
      .mockRejectedValue(new Error("Canonical layers exceed board bounds"));

    await expect(
      selectReserveWithCanonicalBoard({ select, compileBoard, maxAttempts: 2 })
    ).rejects.toBeInstanceOf(ReservePuzzleExhaustedError);
    expect(compileBoard).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @rebuzzle/web exec jest src/ai/puzzle-agent/__tests__/reserve-canonical-board.test.ts`
Expected: FAIL with `Cannot find module '../reserve-canonical-board'`.

- [ ] **Step 3: Implement the reserve loop**

Create `apps/web/src/ai/puzzle-agent/reserve-canonical-board.ts`:

```ts
import {
  type ReservePuzzle,
  ReservePuzzleExhaustedError,
  type SelectedReservePuzzle,
} from "./reserve-puzzles";
import { compileCanonicalBoard } from "./visual/canonical-board";
import type { CanonicalBoard } from "./visual/canonical-contract";

/** Bounded: each retry reloads the answer archive, so a broken corpus cannot stall the play path. */
export const RESERVE_BOARD_MAX_ATTEMPTS = 5;

export type ReserveBoardSkip = { reserveId: string; error: string };

export type SelectedReserveWithBoard = Omit<SelectedReservePuzzle, "puzzle"> & {
  puzzle: ReservePuzzle & {
    visual: ReservePuzzle["visual"] & { canonicalBoard: CanonicalBoard };
  };
  skippedReserves: ReserveBoardSkip[];
};

/** Select a reserve whose checked board compiles; skip (never publish) any that do not. */
export async function selectReserveWithCanonicalBoard(input: {
  select: (excludeIds: ReadonlySet<string>) => Promise<SelectedReservePuzzle>;
  compileBoard?: (visual: ReservePuzzle["visual"]) => Promise<CanonicalBoard>;
  maxAttempts?: number;
  onSkip?: (skip: ReserveBoardSkip) => void;
}): Promise<SelectedReserveWithBoard> {
  const compileBoard = input.compileBoard ?? compileCanonicalBoard;
  const maxAttempts = input.maxAttempts ?? RESERVE_BOARD_MAX_ATTEMPTS;
  const excludeIds = new Set<string>();
  const skippedReserves: ReserveBoardSkip[] = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const selected = await input.select(excludeIds);
    let canonicalBoard: CanonicalBoard;
    try {
      canonicalBoard = await compileBoard(selected.puzzle.visual);
    } catch (error) {
      const skip = {
        reserveId: selected.puzzle.id,
        error: (error instanceof Error ? error.message : String(error)).slice(0, 300),
      };
      skippedReserves.push(skip);
      input.onSkip?.(skip);
      excludeIds.add(selected.puzzle.id);
      continue;
    }
    return {
      ...selected,
      puzzle: {
        ...selected.puzzle,
        visual: { ...selected.puzzle.visual, canonicalBoard },
      },
      skippedReserves,
    };
  }
  throw new ReservePuzzleExhaustedError(
    "No reserve board compiled within the attempt budget",
    skippedReserves.map((skip) => `${skip.reserveId}: ${skip.error}`)
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @rebuzzle/web exec jest src/ai/puzzle-agent/__tests__/reserve-canonical-board.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Use it in `persistReservePuzzle`**

In `apps/web/src/app/actions/puzzleGenerationActions.ts`:

After the line `import { selectMongoReservePuzzle } from "@/ai/puzzle-agent/mongo-reserve-puzzles";`, add:

```ts
import { selectReserveWithCanonicalBoard } from "@/ai/puzzle-agent/reserve-canonical-board";
```

In `persistReservePuzzle`, replace:

```ts
  const selected = await selectMongoReservePuzzle({ dateString });
```

with:

```ts
  // Reserves ship the same checked board as reviewed dailies; one that cannot compile is skipped.
  const selected = await selectReserveWithCanonicalBoard({
    select: (excludeIds) => selectMongoReservePuzzle({ dateString, excludeIds }),
    onSkip: (skip) =>
      logger.warn("Reserve board failed to compile; skipping reserve", {
        dateString,
        reserveId: skip.reserveId,
        error: skip.error,
      }),
  });
```

No other change is needed. `const reserve = selected.puzzle;` now holds the boarded visual. `persistDailyPuzzle({ visual: reserve.visual, ... })` stores it, and the returned `{ ...reserve, ... }` object includes it.

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm --filter @rebuzzle/web typecheck && pnpm --filter @rebuzzle/web lint`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/ai/puzzle-agent/reserve-canonical-board.ts apps/web/src/ai/puzzle-agent/__tests__/reserve-canonical-board.test.ts apps/web/src/app/actions/puzzleGenerationActions.ts
git commit -m "feat(puzzles): compile canonical boards for reserves and skip ones that fail" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Validate the board or compile one at publish time

**Files:**
- Modify: `apps/web/src/lib/game/publish-reviewed-daily-puzzle.ts`
- Test: `apps/web/src/lib/game/__tests__/publish-reviewed-daily-puzzle.test.ts`

- [ ] **Step 1: Write the failing tests**

In `apps/web/src/lib/game/__tests__/publish-reviewed-daily-puzzle.test.ts`:

Add these imports directly **before** the existing `import type { PublicationAssetCheck } ...` line (Biome sorts them there):

```ts
import { canonicalSourceFingerprint } from "@/ai/puzzle-agent/visual/canonical-board";
import { validateCanonicalBoard } from "@/ai/puzzle-agent/visual/canonical-contract";
```

Add this import after the existing `import type { DailyPuzzleCandidateRepository } ...` line:

```ts
import type { PersistDailyPuzzleInput } from "../persist-daily-puzzle";
```

Add these two tests before the closing `});` of the `describe("publishing human-reviewed daily puzzles", ...)` block:

```ts
  it("compiles a missing canonical board before publishing an older candidate", async () => {
    const { repository } = memoryRepository([makeCandidate()]);

    await publishReviewedDailyPuzzle({ dateString, repository, reviewService, persist });

    const published = persist.mock.calls[0]?.[0] as PersistDailyPuzzleInput;
    const board = published.visual?.canonicalBoard;
    expect(board).toBeDefined();
    await expect(validateCanonicalBoard(board)).resolves.toBeTruthy();
    expect(board?.sourceFingerprint).toBe(canonicalSourceFingerprint(payload.visual!));
    expect(payload.visual?.canonicalBoard).toBeUndefined();
  }, 30_000);

  it("rejects a candidate whose board cannot compile instead of publishing it", async () => {
    const { repository, rows } = memoryRepository([makeCandidate()]);
    const ensureCanonicalBoard = jest
      .fn()
      .mockRejectedValue(new Error("Unsupported canonical pictogram"));

    const result = await publishReviewedDailyPuzzle({
      dateString,
      repository,
      reviewService,
      persist,
      ensureCanonicalBoard,
    });

    expect(result).toBeNull();
    expect(persist).not.toHaveBeenCalled();
    expect(rows[0]).toMatchObject({
      status: "rejected",
      rejectionReason: "canonical-board-failed",
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @rebuzzle/web exec jest src/lib/game/__tests__/publish-reviewed-daily-puzzle.test.ts`
Expected: FAIL.
- The first new test fails because `board` is undefined.
- The second fails at type-check with `'ensureCanonicalBoard' does not exist in type`.

- [ ] **Step 3: Implement validate-or-compile**

In `apps/web/src/lib/game/publish-reviewed-daily-puzzle.ts`:

Directly **before** the existing `import { type PublicationAssetCheck, verifyPublicationAssets } ...` block (Biome's import order), add:

```ts
import {
  CANONICAL_BOARD_FAILED,
  ensureTrustedCanonicalBoard,
} from "@/ai/puzzle-agent/visual/canonical-board";
```

Replace the `VerifyAssets` type:

```ts
type VerifyAssets = (
  visual: NonNullable<DailyPuzzleCandidate["payload"]["visual"]>
) => Promise<PublicationAssetCheck>;
```

with:

```ts
type CandidateVisual = NonNullable<DailyPuzzleCandidate["payload"]["visual"]>;
type VerifyAssets = (visual: CandidateVisual) => Promise<PublicationAssetCheck>;
/** Returns the visual with a trusted canonical board; throws when none can be compiled. */
type EnsureCanonicalBoard = (visual: CandidateVisual) => Promise<CandidateVisual>;
```

In `createReviewedDailyPuzzlePublisher`, replace the input type and the first two lines of the body:

```ts
export function createReviewedDailyPuzzlePublisher(input: {
  repository: DailyPuzzleCandidateRepository;
  reviewService: DailyCandidatePublisherReviewService;
  persist: PersistCandidate;
  verifyAssets?: VerifyAssets;
  now?: () => Date;
}) {
  const now = input.now ?? (() => new Date());
  const verifyAssets = input.verifyAssets ?? verifyPublicationAssets;
```

with:

```ts
export function createReviewedDailyPuzzlePublisher(input: {
  repository: DailyPuzzleCandidateRepository;
  reviewService: DailyCandidatePublisherReviewService;
  persist: PersistCandidate;
  verifyAssets?: VerifyAssets;
  ensureCanonicalBoard?: EnsureCanonicalBoard;
  now?: () => Date;
}) {
  const now = input.now ?? (() => new Date());
  const verifyAssets = input.verifyAssets ?? verifyPublicationAssets;
  // Annotated: without it the generic default widens `visual` to the schema input type.
  const ensureCanonicalBoard: EnsureCanonicalBoard =
    input.ensureCanonicalBoard ?? ensureTrustedCanonicalBoard;
```

In `publishAssignedCandidate`, replace:

```ts
    if (payload.visual) {
      const assets = await verifyAssets(payload.visual);
      if (!assets.ok) {
        await input.repository.releaseAssignment({
          id: candidate.id,
          dateString,
          updatedAt: now(),
        });
        return null;
      }
    }
    let persisted: PersistDailyPuzzleResult;
    try {
      persisted = await input.persist({
        ...payload,
        dateString,
```

with:

```ts
    let visual = payload.visual;
    if (visual) {
      const assets = await verifyAssets(visual);
      if (!assets.ok) {
        await input.repository.releaseAssignment({
          id: candidate.id,
          dateString,
          updatedAt: now(),
        });
        return null;
      }
      // Older candidates were queued before boards were compiled; never publish without one.
      // A board that cannot compile never will, so reject rather than release for retry.
      try {
        visual = await ensureCanonicalBoard(visual);
      } catch {
        await input.repository.skip({
          id: candidate.id,
          reason: CANONICAL_BOARD_FAILED,
          updatedAt: now(),
        });
        return null;
      }
    }
    let persisted: PersistDailyPuzzleResult;
    try {
      persisted = await input.persist({
        ...payload,
        visual,
        dateString,
```

In the same function's success return, replace:

```ts
    return {
      ...payload,
      id: persisted.id,
```

with:

```ts
    return {
      ...payload,
      visual,
      id: persisted.id,
```

In `publishReviewedDailyPuzzle`, add the option to the input type. Replace:

```ts
  persist: PersistCandidate;
  verifyAssets?: VerifyAssets;
  now?: () => Date;
}) {
  return createReviewedDailyPuzzlePublisher(input).publishForDate(input.dateString);
```

with:

```ts
  persist: PersistCandidate;
  verifyAssets?: VerifyAssets;
  ensureCanonicalBoard?: EnsureCanonicalBoard;
  now?: () => Date;
}) {
  return createReviewedDailyPuzzlePublisher(input).publishForDate(input.dateString);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @rebuzzle/web exec jest src/lib/game/__tests__/publish-reviewed-daily-puzzle.test.ts`
Expected: PASS (all 11 tests). The existing tests now run the real compiler on the text-only `TEEF` board. They assert with `objectContaining` and don't pin `visual`, so they stay green.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @rebuzzle/web typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/game/publish-reviewed-daily-puzzle.ts apps/web/src/lib/game/__tests__/publish-reviewed-daily-puzzle.test.ts
git commit -m "feat(puzzles): verify or compile the canonical board before publishing a reviewed daily" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Backfill service

**Files:**
- Create: `apps/web/src/lib/game/canonical-board-backfill.ts`
- Create: `apps/web/src/lib/game/__tests__/canonical-board-backfill.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/game/__tests__/canonical-board-backfill.test.ts`:

```ts
import {
  type CanonicalBoard,
  validateCanonicalBoard,
} from "@/ai/puzzle-agent/visual/canonical-contract";
import type { PuzzleVisual } from "@/db/models";
import {
  type CanonicalBoardBackfillSource,
  type CanonicalBoardBackfillTarget,
  createCanonicalBoardBackfill,
} from "../canonical-board-backfill";

const composed: PuzzleVisual = {
  mode: "composed",
  styleId: "ink-pictogram-v1",
  layout: "row",
  unicodeFallback: "T E E F",
  layers: [{ kind: "text", content: "TEEF", emphasis: "normal" }],
};

const existingBoard: CanonicalBoard = {
  version: 1,
  pngDataUrl: "data:image/png;base64,iVBORw0KGgo=",
  sha256: "a".repeat(64),
  width: 1,
  height: 1,
  sourceFingerprint: "b".repeat(64),
};

function memorySource(targets: CanonicalBoardBackfillTarget[]) {
  const saved: Array<{
    collection: CanonicalBoardBackfillTarget["collection"];
    id: string;
    canonicalBoard: CanonicalBoard;
  }> = [];
  const isSaved = (target: { collection: string; id: string }) =>
    saved.some((row) => row.collection === target.collection && row.id === target.id);
  const source: CanonicalBoardBackfillSource = {
    async listMissingBoards(limit) {
      return targets.filter((target) => !isSaved(target)).slice(0, limit);
    },
    async saveBoard(input) {
      if (isSaved(input)) return false;
      saved.push(input);
      return true;
    },
  };
  return { source, saved };
}

describe("canonical board backfill", () => {
  const now = () => new Date("2026-11-01T00:00:00.000Z");

  it("compiles boards for published puzzles and queued candidates, and a rerun changes nothing", async () => {
    const { source, saved } = memorySource([
      { collection: "puzzles", id: "puzzle-1", visual: composed },
      { collection: "dailyPuzzleCandidates", id: "candidate-1", visual: composed },
    ]);
    const backfill = createCanonicalBoardBackfill(source, undefined, now);

    const first = await backfill.run({ dryRun: false });

    expect(first).toMatchObject({ dryRun: false, scanned: 2, compiled: 2, written: 2, failed: 0 });
    expect(saved.map((row) => `${row.collection}:${row.id}`)).toEqual([
      "puzzles:puzzle-1",
      "dailyPuzzleCandidates:candidate-1",
    ]);
    await expect(validateCanonicalBoard(saved[0]?.canonicalBoard)).resolves.toBeTruthy();

    const second = await backfill.run({ dryRun: false });
    expect(second).toMatchObject({ scanned: 0, compiled: 0, written: 0, failed: 0 });
    expect(saved).toHaveLength(2);
  }, 30_000);

  it("skips puzzles that already have a board and plain-text visuals", async () => {
    const compileBoard = jest.fn();
    const { source, saved } = memorySource([
      {
        collection: "puzzles",
        id: "boarded",
        visual: { ...composed, canonicalBoard: existingBoard },
      },
      { collection: "puzzles", id: "text-only", visual: { ...composed, mode: "unicode" } },
    ]);

    const report = await createCanonicalBoardBackfill(source, compileBoard, now).run({
      dryRun: false,
    });

    expect(report).toMatchObject({ scanned: 2, alreadyBoarded: 1, skippedUnicode: 1, written: 0 });
    expect(compileBoard).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });

  it("reports compile failures without changing those puzzles", async () => {
    const compileBoard = jest.fn(async (visual: PuzzleVisual) => {
      if (visual.unicodeFallback === "BAD") throw new Error("Unsupported canonical pictogram");
      return existingBoard;
    });
    const { source, saved } = memorySource([
      { collection: "puzzles", id: "bad", visual: { ...composed, unicodeFallback: "BAD" } },
      { collection: "puzzles", id: "good", visual: composed },
    ]);

    const report = await createCanonicalBoardBackfill(source, compileBoard, now).run({
      dryRun: false,
    });

    expect(report).toMatchObject({ scanned: 2, compiled: 1, written: 1, failed: 1 });
    expect(report.failures).toEqual([
      { collection: "puzzles", id: "bad", error: "Unsupported canonical pictogram" },
    ]);
    expect(saved.map((row) => row.id)).toEqual(["good"]);
  });

  it("dry run compiles and reports but writes nothing", async () => {
    const compileBoard = jest.fn().mockResolvedValue(existingBoard);
    const { source, saved } = memorySource([
      { collection: "puzzles", id: "puzzle-1", visual: composed },
    ]);

    const report = await createCanonicalBoardBackfill(source, compileBoard, now).run({
      dryRun: true,
    });

    expect(report).toMatchObject({
      dryRun: true,
      compiled: 1,
      written: 0,
      generatedAt: "2026-11-01T00:00:00.000Z",
    });
    expect(saved).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @rebuzzle/web exec jest src/lib/game/__tests__/canonical-board-backfill.test.ts`
Expected: FAIL with `Cannot find module '../canonical-board-backfill'`.

- [ ] **Step 3: Implement the service**

Create `apps/web/src/lib/game/canonical-board-backfill.ts`:

```ts
import { compileCanonicalBoard } from "@/ai/puzzle-agent/visual/canonical-board";
import type { CanonicalBoard } from "@/ai/puzzle-agent/visual/canonical-contract";
import type { PuzzleVisual } from "@/db/models";

export const CANONICAL_BOARD_BACKFILL_DEFAULT_LIMIT = 500;
export const CANONICAL_BOARD_BACKFILL_MAX_LIMIT = 5_000;

export type CanonicalBoardBackfillCollection = "puzzles" | "dailyPuzzleCandidates";

export type CanonicalBoardBackfillTarget = {
  collection: CanonicalBoardBackfillCollection;
  id: string;
  visual: PuzzleVisual;
};

export type CanonicalBoardBackfillSource = {
  /** Composed visuals without a board; `limit` applies per collection. */
  listMissingBoards(limit: number): Promise<CanonicalBoardBackfillTarget[]>;
  /** Writes only if the row still has no board; false when another writer got there first. */
  saveBoard(input: {
    collection: CanonicalBoardBackfillCollection;
    id: string;
    canonicalBoard: CanonicalBoard;
  }): Promise<boolean>;
};

export type CanonicalBoardBackfillFailure = {
  collection: CanonicalBoardBackfillCollection;
  id: string;
  error: string;
};

export type CanonicalBoardBackfillReport = {
  dryRun: boolean;
  scanned: number;
  alreadyBoarded: number;
  skippedUnicode: number;
  compiled: number;
  written: number;
  raced: number;
  failed: number;
  failures: CanonicalBoardBackfillFailure[];
  generatedAt: string;
};

/** Idempotent one-off: compile missing boards; failures are reported and left untouched. */
export function createCanonicalBoardBackfill(
  source: CanonicalBoardBackfillSource,
  compileBoard: (visual: PuzzleVisual) => Promise<CanonicalBoard> = compileCanonicalBoard,
  now: () => Date = () => new Date()
) {
  return {
    async run(input: { dryRun: boolean; limit?: number }): Promise<CanonicalBoardBackfillReport> {
      const limit = Math.max(
        1,
        Math.min(
          CANONICAL_BOARD_BACKFILL_MAX_LIMIT,
          input.limit ?? CANONICAL_BOARD_BACKFILL_DEFAULT_LIMIT
        )
      );
      const targets = await source.listMissingBoards(limit);
      const report: CanonicalBoardBackfillReport = {
        dryRun: input.dryRun,
        scanned: targets.length,
        alreadyBoarded: 0,
        skippedUnicode: 0,
        compiled: 0,
        written: 0,
        raced: 0,
        failed: 0,
        failures: [],
        generatedAt: now().toISOString(),
      };
      for (const target of targets) {
        if (target.visual.canonicalBoard) {
          report.alreadyBoarded++;
          continue;
        }
        if (target.visual.mode === "unicode") {
          report.skippedUnicode++;
          continue;
        }
        let canonicalBoard: CanonicalBoard;
        try {
          canonicalBoard = await compileBoard(target.visual);
        } catch (error) {
          report.failed++;
          report.failures.push({
            collection: target.collection,
            id: target.id,
            error: (error instanceof Error ? error.message : String(error)).slice(0, 300),
          });
          continue;
        }
        report.compiled++;
        if (input.dryRun) continue;
        const written = await source.saveBoard({
          collection: target.collection,
          id: target.id,
          canonicalBoard,
        });
        if (written) report.written++;
        else report.raced++;
      }
      return report;
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @rebuzzle/web exec jest src/lib/game/__tests__/canonical-board-backfill.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/game/canonical-board-backfill.ts apps/web/src/lib/game/__tests__/canonical-board-backfill.test.ts
git commit -m "feat(puzzles): add an idempotent canonical board backfill service" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Backfill Mongo source and script

**Files:**
- Create: `apps/web/src/lib/game/mongo-canonical-board-backfill-source.ts`
- Create: `apps/web/scripts/backfill-canonical-boards.ts`
- Modify: `apps/web/package.json`

This task is wiring only. Its logic is covered by Task 7. Verification here is typecheck, lint and a guarded dry run. It follows the pattern of `mongo-puzzle-playtest-backfill-source.ts`, which has no unit test either.

- [ ] **Step 1: Implement the Mongo source**

Create `apps/web/src/lib/game/mongo-canonical-board-backfill-source.ts`:

```ts
import type { DailyPuzzleCandidate, Puzzle, PuzzleVisual } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import type {
  CanonicalBoardBackfillSource,
  CanonicalBoardBackfillTarget,
} from "./canonical-board-backfill";

/** Queued = not yet published or rejected. Playtest snapshots are immutable and never touched. */
const QUEUED_STATUSES: DailyPuzzleCandidate["status"][] = ["reviewing", "ready", "assigned"];

export function createMongoCanonicalBoardBackfillSource(): CanonicalBoardBackfillSource {
  return {
    async listMissingBoards(limit) {
      const [puzzles, candidates] = await Promise.all([
        getCollection<Puzzle>("puzzles")
          .find({
            visual: { $exists: true },
            "visual.mode": { $ne: "unicode" },
            "visual.canonicalBoard": { $exists: false },
          })
          .sort({ publishedAt: -1, id: 1 })
          .limit(limit)
          .project<{ id: string; visual: PuzzleVisual }>({ _id: 0, id: 1, visual: 1 })
          .toArray(),
        getCollection<DailyPuzzleCandidate>("dailyPuzzleCandidates")
          .find({
            status: { $in: QUEUED_STATUSES },
            "payload.visual": { $exists: true },
            "payload.visual.mode": { $ne: "unicode" },
            "payload.visual.canonicalBoard": { $exists: false },
          })
          .sort({ createdAt: 1, id: 1 })
          .limit(limit)
          .project<{ id: string; payload: { visual: PuzzleVisual } }>({
            _id: 0,
            id: 1,
            "payload.visual": 1,
          })
          .toArray(),
      ]);
      return [
        ...puzzles.map(
          (row): CanonicalBoardBackfillTarget => ({
            collection: "puzzles",
            id: row.id,
            visual: row.visual,
          })
        ),
        ...candidates.map(
          (row): CanonicalBoardBackfillTarget => ({
            collection: "dailyPuzzleCandidates",
            id: row.id,
            visual: row.payload.visual,
          })
        ),
      ];
    },

    async saveBoard({ collection, id, canonicalBoard }) {
      if (collection === "puzzles") {
        const result = await getCollection<Puzzle>("puzzles").updateOne(
          { id, "visual.canonicalBoard": { $exists: false } },
          { $set: { "visual.canonicalBoard": canonicalBoard } }
        );
        return result.modifiedCount === 1;
      }
      const result = await getCollection<DailyPuzzleCandidate>("dailyPuzzleCandidates").updateOne(
        {
          id,
          status: { $in: QUEUED_STATUSES },
          "payload.visual.canonicalBoard": { $exists: false },
        },
        { $set: { "payload.visual.canonicalBoard": canonicalBoard, updatedAt: new Date() } }
      );
      return result.modifiedCount === 1;
    },
  };
}
```

- [ ] **Step 2: Create the script**

Create `apps/web/scripts/backfill-canonical-boards.ts`:

```ts
import { config } from "dotenv";
import { closeConnection } from "@/db/mongodb";
import {
  CANONICAL_BOARD_BACKFILL_DEFAULT_LIMIT,
  createCanonicalBoardBackfill,
} from "@/lib/game/canonical-board-backfill";
import { createMongoCanonicalBoardBackfillSource } from "@/lib/game/mongo-canonical-board-backfill-source";

config({ path: ".env.local", quiet: true });
// A one-off maintenance run must not trigger the application's background index writer.
process.env.REBUZZLE_SKIP_AUTO_INDEXES = "1";

function numericArgument(name: string): number | undefined {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Invalid ${name} value`);
  return value;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const backfill = createCanonicalBoardBackfill(createMongoCanonicalBoardBackfillSource());
  const report = await backfill.run({
    dryRun,
    limit: numericArgument("limit") ?? CANONICAL_BOARD_BACKFILL_DEFAULT_LIMIT,
  });
  console.log(JSON.stringify(report, null, 2));
  // Failures were left unchanged; a non-zero exit makes them impossible to miss in CI or a shell.
  if (report.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeConnection();
  });
```

- [ ] **Step 3: Add the package script**

In `apps/web/package.json`, after the line `"db:backfill-daily-progress": "tsx scripts/backfill-daily-progress.ts",`, add:

```json
    "db:backfill-canonical-boards": "tsx --conditions=react-server scripts/backfill-canonical-boards.ts",
```

(`--conditions=react-server` is required. Without it, `import "server-only"` in `canonical-board.ts` throws under tsx.)

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm --filter @rebuzzle/web typecheck && pnpm --filter @rebuzzle/web lint`
Expected: both exit 0.

Scripts are outside the `tsconfig` and Biome include lists, so this only checks the source module. If the driver's nested-path typing rejects a dotted filter key with "Type instantiation is excessively deep", annotate that filter object as `Filter<Puzzle>` (or `Filter<DailyPuzzleCandidate>`), imported with `import type { Filter } from "mongodb";`. That is the pattern in `daily-puzzle-candidate-repository.ts`.

- [ ] **Step 5: Typecheck the script (do not execute it)**

The script is outside `tsconfig`'s include list. Typecheck it with a temporary config, then delete the config. Don't run the script from this plan. `.env.local` may point at a shared or production database, so the dry run and the real run are rollout steps for a human (Task 11 Step 7).

Run:

```bash
cd /Users/byronwade/ios-work/rebuzzle-prestige/apps/web
printf '{ "extends": "./tsconfig.json", "compilerOptions": { "incremental": false }, "include": ["next-env.d.ts", "scripts/backfill-canonical-boards.ts"], "exclude": [] }\n' > tsconfig.script-check.json
pnpm exec tsc -p tsconfig.script-check.json --noEmit; status=$?
rm tsconfig.script-check.json
exit $status
```

Expected: exit 0, and `git status --short` shows no `tsconfig.script-check.json`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/game/mongo-canonical-board-backfill-source.ts apps/web/scripts/backfill-canonical-boards.ts apps/web/package.json
git commit -m "feat(puzzles): add backfill-canonical-boards script with --dry-run" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: iOS Core decodes `caption`

**Files:**
- Modify: `apps/ios/Core/Sources/RebuzzleCore/Models.swift`
- Test: `apps/ios/Core/Tests/RebuzzleCoreTests/CanonicalBoardTests.swift`

- [ ] **Step 1: Write the failing tests**

In `apps/ios/Core/Tests/RebuzzleCoreTests/CanonicalBoardTests.swift`, add these methods inside `final class CanonicalBoardTests` directly after `testAbsentFieldKeepsLegacyRendering()`:

```swift
    func testDecodesPuzzleWithCanonicalBoardAndCaption() throws {
        let visualObject: [String: Any] = [
            "mode": "composed", "layout": "row", "unicodeFallback": "UP",
            "layers": [["kind": "text", "content": "UP"]],
            "caption": "Look above", "canonicalBoard": artifact()
        ]
        let object: [String: Any] = ["id": "p1", "puzzleType": "rebus", "difficulty": 7, "hints": [String](), "visual": visualObject]
        let puzzle = try JSONDecoder().decode(Puzzle.self, from: JSONSerialization.data(withJSONObject: object))
        let visual = try XCTUnwrap(puzzle.visual)
        XCTAssertEqual(visual.caption, "Look above")
        XCTAssertEqual(visual.canonicalBoard?.pngData, png)
        let restored = try JSONDecoder().decode(PuzzleVisual.self, from: JSONEncoder().encode(visual))
        XCTAssertEqual(restored.caption, "Look above", "The caption must survive local cache encoding")
    }
    func testMissingCaptionDecodesAsNil() throws {
        XCTAssertNil(try visual(nil).caption)
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/byronwade/ios-work/rebuzzle-prestige/apps/ios/Core && swift test --filter CanonicalBoardTests`
Expected: FAIL to compile with `value of type 'PuzzleVisual' has no member 'caption'`.

- [ ] **Step 3: Add the decode**

In `apps/ios/Core/Sources/RebuzzleCore/Models.swift`, replace the `PuzzleVisual` struct:

```swift
public struct PuzzleVisual: Codable, Sendable, Hashable {
    public let mode: String?
    public let layout: String?
    public let unicodeFallback: String?
    public let layers: [VisualLayer]?
    public let canonicalBoard: CanonicalBoard?
    enum CodingKeys: String, CodingKey { case mode, layout, unicodeFallback, layers, canonicalBoard }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        mode = try c.decodeIfPresent(String.self, forKey: .mode)
        layout = try c.decodeIfPresent(String.self, forKey: .layout)
        unicodeFallback = try c.decodeIfPresent(String.self, forKey: .unicodeFallback)
        layers = try c.decodeIfPresent([VisualLayer].self, forKey: .layers)
        // decodeIfPresent would erase an explicit malformed null artifact.
        canonicalBoard = c.contains(.canonicalBoard) ? try c.decode(CanonicalBoard.self, forKey: .canonicalBoard) : nil
    }
}
```

with:

```swift
public struct PuzzleVisual: Codable, Sendable, Hashable {
    public let mode: String?
    public let layout: String?
    public let unicodeFallback: String?
    public let layers: [VisualLayer]?
    public let canonicalBoard: CanonicalBoard?
    /// Shown under the fallback board only; the canonical PNG already contains it.
    public let caption: String?
    enum CodingKeys: String, CodingKey { case mode, layout, unicodeFallback, layers, canonicalBoard, caption }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        mode = try c.decodeIfPresent(String.self, forKey: .mode)
        layout = try c.decodeIfPresent(String.self, forKey: .layout)
        unicodeFallback = try c.decodeIfPresent(String.self, forKey: .unicodeFallback)
        layers = try c.decodeIfPresent([VisualLayer].self, forKey: .layers)
        // decodeIfPresent would erase an explicit malformed null artifact.
        canonicalBoard = c.contains(.canonicalBoard) ? try c.decode(CanonicalBoard.self, forKey: .canonicalBoard) : nil
        // A malformed caption is cosmetic; drop it rather than failing the whole puzzle.
        caption = try? c.decodeIfPresent(String.self, forKey: .caption)
    }
}
```

(Encoding stays synthesized from `CodingKeys`, so `caption` is written to the local cache automatically.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/byronwade/ios-work/rebuzzle-prestige/apps/ios/Core && swift test --filter CanonicalBoardTests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/Core/Sources/RebuzzleCore/Models.swift apps/ios/Core/Tests/RebuzzleCoreTests/CanonicalBoardTests.swift
git commit -m "feat(ios): decode puzzle visual captions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: iOS shows the caption under the fallback board

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

This is a SwiftUI view change with no Core logic. It is verified by building the app. The canonical branch stays untouched because the caption is already part of the reviewed PNG.

- [ ] **Step 1: Add the caption under `VisualBoard`**

In `apps/ios/Rebuzzle/Features/TodayView.swift`, inside `struct PuzzleBoard`, replace:

```swift
                    if let visual, visual.mode != "unicode", let layers = visual.layers, !layers.isEmpty {
                        VisualBoard(visual: visual, layers: layers)
                    } else {
```

with:

```swift
                    if let visual, visual.mode != "unicode", let layers = visual.layers, !layers.isEmpty {
                        VStack(spacing: 8) {
                            VisualBoard(visual: visual, layers: layers)
                            // The canonical PNG already draws the caption; only the fallback needs it.
                            if let caption = visual.caption, !caption.isEmpty {
                                Text(caption)
                                    .font(Theme.font(15, relativeTo: .subheadline))
                                    .foregroundStyle(Theme.secondary)
                                    .multilineTextAlignment(.center)
                            }
                        }
                    } else {
```

The existing `.accessibilityLabel("Puzzle: \(clue)")` on the enclosing `Group` still applies to the whole board.

- [ ] **Step 2: Build the app**

Run: `cd /Users/byronwade/ios-work/rebuzzle-prestige/apps/ios && xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build -quiet`
Expected: exit 0 with no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Rebuzzle/Features/TodayView.swift
git commit -m "feat(ios): show the puzzle caption under the fallback board" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Final verification

**Files:** none (fix forward in the task that owns any failure)

- [ ] **Step 1: Full Jest for touched areas**

Run: `cd /Users/byronwade/ios-work/rebuzzle-prestige && pnpm --filter @rebuzzle/web exec jest src/ai/puzzle-agent src/lib/game src/lib/ugc 2>&1 | tail -20`
Expected: every suite passes, apart from failures already recorded in Task 0. Pay attention to these:
- `canonical-solve-parity` (8 parity cases)
- `queue-daily-puzzle-candidate`
- `publish-reviewed-daily-puzzle`
- `reserve-canonical-board`
- `canonical-board-backfill`
- `player-sim-hinted.integration`, which is unchanged and must still pass
- `demanding-reserve-puzzles`, which must not regress after the integer-size change

- [ ] **Step 2: Whole web suite**

Run: `pnpm --filter @rebuzzle/web test 2>&1 | tail -15`
Expected: the same pass and fail set as Task 0 plus the new tests, all passing.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @rebuzzle/web typecheck`
Expected: exit 0.

- [ ] **Step 4: Lint**

Run: `pnpm --filter @rebuzzle/web lint`
Expected: exit 0. If Biome reports only formatting or import order, run `pnpm --filter @rebuzzle/web lint:fix`, re-run lint, and amend the owning commit with `git commit --amend --no-edit` only if it is the most recent commit. Otherwise make a separate `style:` commit that ends with the same Co-Authored-By trailer.

- [ ] **Step 5: iOS Core**

Run: `cd /Users/byronwade/ios-work/rebuzzle-prestige/apps/ios/Core && swift test`
Expected: all tests pass, including the two new caption tests.

- [ ] **Step 6: Confirm the spec's coverage map**

Run: `cd /Users/byronwade/ios-work/rebuzzle-prestige && git log --oneline main..HEAD && git status --short`
Expected: one commit per task (2–10) after the spec commit, and a clean tree.

- [ ] **Step 7: Record the rollout steps for the PR description (do not run against production here)**

1. Merge and deploy.
2. Run `cd apps/web && pnpm exec tsx --conditions=react-server scripts/backfill-canonical-boards.ts --dry-run` against production env and review `failures`.
3. Run it again without `--dry-run`. Re-run until `scanned` is 0 (the limit is applied per collection).
4. Cached dailies keep serving the board-less JSON until the `daily-puzzle` cache tag expires (`cacheLife("hours")`). Revalidate today's date after the run if it matters.

---

## Self-review against the spec (PR A)

| Spec requirement | Covered by | Notes |
| --- | --- | --- |
| Compile at queue time, store on the candidate | Task 3 | Inside `enqueue`, insert branch only. Existing rows are covered by publish (Task 6) and backfill (Tasks 7–8). |
| Compile failure rejects with `canonical-board-failed`; retry or reserve path takes over | Task 3 | Inserted as `rejected` and never submitted. `getOrGenerateDailyPuzzle` returns `candidateQueueSkipped: "candidate_rejected"`, and the play path falls to `persistReservePuzzle`. |
| `persistReservePuzzle` compiles; failures logged and skipped | Tasks 4–5 | `excludeIds` plus a loop bounded to 5 attempts. The skip is logged with `logger.warn`. If every attempt fails, it throws `ReservePuzzleExhaustedError` (fails closed). |
| Publish verifies with `validateCanonicalBoard`, compiles if missing | Tasks 1, 6 | `hasTrustedCanonicalBoard` validates every profile raster and the source fingerprint. A compile failure calls `skip` (not `release`), so the candidate isn't retried forever. |
| Backfill script: idempotent, `--dry-run`, reports failures, doesn't change failed puzzles | Tasks 7–8 | Writes are guarded by `$exists: false`. Rerun idempotency is tested. Failures are listed in the report, cause exit 1, and are never written. |
| Backfill covers published and queued puzzles | Task 8 | `puzzles` plus `dailyPuzzleCandidates` in reviewing, ready or assigned. Playtest snapshots are deliberately excluded. |
| Solve checks judge the canonical images; identical bytes, with a test | Task 2 | No change to `player-sim.ts` (fact 3). Parity is asserted on the six controls plus two tall reserves, with and without the board attached. Found and fixed the fractional-size bug that broke compiling. |
| iOS: no behavior change with a board present | Task 10 | The canonical branch is untouched. |
| iOS: decode `caption`, show under the board in secondary text | Tasks 9–10 | **Deviation:** shown only under the fallback board, because the canonical PNG already draws it (fact 5). |
| Jest: board at queue, compile-fail rejects, publish compiles missing board, backfill skips boarded and reports failures | Tasks 3, 6, 7 | All present. |
| Jest: byte-for-byte on six controls | Task 2 | Present. |
| iOS Core: decoding with a canonical board and a caption | Task 9 | Decodes a whole `Puzzle`, plus a round trip through the local cache. |
| Rollout: dry-run, then real backfill | Task 11 Step 7 | Documented, not executed. |

**Dry-run check of this plan (2026-11-01).** I applied every code block in this plan to a scratch copy of `apps/web`, with the repo's `node_modules` symlinked in. The repo itself was not touched. Results:
- **Jest:** the touched suites gave 29 suites and 156 tests, all passing. `tsc --noEmit` was clean.
- **Biome:** 0 errors, and the same 12 warnings as the untouched baseline. The import-order and line-wrap fixes it asked for are already folded into the steps above.
- **Swift:** I applied the Swift steps to a scratch copy of `apps/ios/Core`, and `swift test --filter CanonicalBoardTests` passed (11 tests).
- **Not built:** `TodayView.swift` (Task 10). It is verified only by the `xcodebuild` step.
- **Whole web suite:** `npx jest` on the scratch copy gave 242 of 244 suites passing. The 2 failures (`api/cron/generate-puzzles` and `api/cron/reconcile-journey-progress`) read the repo-root `vercel.json`, which the scratch copy didn't include, and both pass in the real repo. No other suite regressed.
- **Script typecheck:** the backfill script typechecks with the Task 8 Step 5 config.

Issues I found in the first draft and fixed inline:
- **Publish default compiler widened the type.** With no annotation, `input.ensureCanonicalBoard ?? ensureTrustedCanonicalBoard` widened `visual` to the schema input type (TS2322 on `persist`). The constant is now annotated as `EnsureCanonicalBoard`.
- **Queue `try` wrapped the insert.** A database error would have produced a phantom `rejected` row. It now uses `compileBoard(visual).catch(() => null)` before the insert, so only compile errors reject.
- **Publish return value spread `payload`.** The first response would have lacked the board. The return now sets `visual`.
- **`persistReservePuzzle` return.** It spreads `reserve`, which now holds the boarded visual, so no extra override is needed.
- **Type mismatch.** The plan uses the schema's input type, verified with a scratch `tsc` probe, instead of a cast. Parsing first would have weakened the compiler's unknown-key rejection.
- **The parity test was only a guard at first.** Its failing step is now real: the two tall reserves fail until the integer-size fix in Task 2.
- **No placeholders.** Every code step has complete code. The one conditional (the `Filter<>` annotation in Task 8 Step 4) gives the exact fix to apply.
