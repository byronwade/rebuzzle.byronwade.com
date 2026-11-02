import { hasTrustedCanonicalBoard } from "@/ai/puzzle-agent/visual/canonical-board";
import {
  type CanonicalBoard,
  validateCanonicalBoard,
} from "@/ai/puzzle-agent/visual/canonical-contract";
import type { PuzzleVisual } from "@/db/models";
import {
  type CanonicalBoardBackfillSource,
  type CanonicalBoardBackfillTarget,
  createCanonicalBoardBackfill,
  parseCanonicalBoardBackfillArgs,
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

type SavedBoard = Parameters<CanonicalBoardBackfillSource["saveBoard"]>[0];

function memorySource(targets: CanonicalBoardBackfillTarget[]) {
  const saved: SavedBoard[] = [];
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
      {
        collection: "dailyPuzzleCandidates",
        id: "candidate-1",
        visual: composed,
        expectedStatusVersion: 3,
      },
    ]);
    const backfill = createCanonicalBoardBackfill(source, undefined, now);

    const first = await backfill.run({ dryRun: false });

    expect(first).toMatchObject({ dryRun: false, scanned: 2, compiled: 2, written: 2, failed: 0 });
    expect(saved.map((row) => `${row.collection}:${row.id}`)).toEqual([
      "puzzles:puzzle-1",
      "dailyPuzzleCandidates:candidate-1",
    ]);
    // Candidate writes carry the version they were read at, so the write is a compare-and-set.
    expect(saved[0]?.expectedStatusVersion).toBeUndefined();
    expect(saved[1]?.expectedStatusVersion).toBe(3);
    await expect(validateCanonicalBoard(saved[0]?.canonicalBoard)).resolves.toBeTruthy();
    // The backfilled board passes the same trust gate the queue and publisher use.
    await expect(
      hasTrustedCanonicalBoard({ ...composed, canonicalBoard: saved[0]?.canonicalBoard })
    ).resolves.toBe(true);

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

  it("counts a lost compare-and-set as raced and does not overwrite the row", async () => {
    const compileBoard = jest.fn().mockResolvedValue(existingBoard);
    const saveBoard = jest.fn().mockResolvedValue(false);
    const source: CanonicalBoardBackfillSource = {
      async listMissingBoards() {
        return [
          {
            collection: "dailyPuzzleCandidates",
            id: "candidate-1",
            visual: composed,
            expectedStatusVersion: 7,
          },
        ];
      },
      saveBoard,
    };

    const report = await createCanonicalBoardBackfill(source, compileBoard, now).run({
      dryRun: false,
    });

    expect(report).toMatchObject({ compiled: 1, written: 0, raced: 1, failed: 0 });
    expect(saveBoard).toHaveBeenCalledWith({
      collection: "dailyPuzzleCandidates",
      id: "candidate-1",
      canonicalBoard: existingBoard,
      expectedStatusVersion: 7,
    });
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

  it("clamps the per-collection limit it passes to the source", async () => {
    const listMissingBoards = jest.fn().mockResolvedValue([]);
    const source: CanonicalBoardBackfillSource = { listMissingBoards, saveBoard: jest.fn() };
    const backfill = createCanonicalBoardBackfill(source, jest.fn(), now);

    await backfill.run({ dryRun: true });
    await backfill.run({ dryRun: true, limit: 0 });
    await backfill.run({ dryRun: true, limit: 1_000_000 });

    expect(listMissingBoards.mock.calls).toEqual([[500], [1], [5_000]]);
  });
});

describe("parseCanonicalBoardBackfillArgs", () => {
  it("is a dry run unless --apply is passed", () => {
    expect(parseCanonicalBoardBackfillArgs([])).toEqual({ dryRun: true });
    expect(parseCanonicalBoardBackfillArgs(["--dry-run"])).toEqual({ dryRun: true });
    expect(parseCanonicalBoardBackfillArgs(["--apply"])).toEqual({ dryRun: false });
  });

  it("rejects --apply together with --dry-run", () => {
    expect(() => parseCanonicalBoardBackfillArgs(["--apply", "--dry-run"])).toThrow(
      "Pass either --apply or --dry-run, not both"
    );
  });

  it("parses --limit and rejects a non-numeric one", () => {
    expect(parseCanonicalBoardBackfillArgs(["--apply", "--limit=25"])).toEqual({
      dryRun: false,
      limit: 25,
    });
    expect(() => parseCanonicalBoardBackfillArgs(["--limit=abc"])).toThrow("Invalid limit value");
    expect(() => parseCanonicalBoardBackfillArgs(["--limit="])).toThrow("Invalid limit value");
  });
});
