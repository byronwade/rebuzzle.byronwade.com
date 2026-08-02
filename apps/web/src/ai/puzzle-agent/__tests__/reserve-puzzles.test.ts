import { buildPuzzleSolveBenchmarkCorpus } from "../benchmark/puzzle-corpus";
import type { PuzzleNoveltyArchiveEntry } from "../novelty";
import { normalizeAnswerKey } from "../quality";
import {
  RESERVE_PUZZLES,
  ReservePuzzleExhaustedError,
  selectReservePuzzle,
  validateReservePuzzleCorpus,
} from "../reserve-puzzles";
import { PuzzleVisualSchema } from "../visual/composition";

function dateAt(day: number): Date {
  return new Date(Date.UTC(2026, 7, 1 + day, 12));
}

describe("validated reserve puzzle inventory", () => {
  it("ships 60+ unique, catalog-grounded, schema-valid puzzles", () => {
    expect(RESERVE_PUZZLES.length).toBeGreaterThanOrEqual(60);
    expect(validateReservePuzzleCorpus()).toEqual([]);
    for (const puzzle of RESERVE_PUZZLES) {
      expect(PuzzleVisualSchema.safeParse(puzzle.visual).success).toBe(true);
      expect(puzzle.visual.layers.some((layer) => layer.kind === "image")).toBe(false);
    }
  });

  it("keeps the production reserve disjoint from the evaluator holdout corpus", () => {
    const benchmarkAnswers = new Set(
      buildPuzzleSolveBenchmarkCorpus().map((puzzle) => normalizeAnswerKey(puzzle.answer))
    );
    const overlap = RESERVE_PUZZLES.filter((puzzle) =>
      benchmarkAnswers.has(normalizeAnswerKey(puzzle.answer))
    ).map((puzzle) => puzzle.answer);

    expect(overlap).toEqual([]);
  });

  it("selects deterministically for the same archive snapshot and date", async () => {
    const input = {
      dateString: "2026-08-01",
      usedAnswerKeys: new Set<string>(),
      recentPuzzles: [] as PuzzleNoveltyArchiveEntry[],
      now: () => dateAt(0),
    };

    const first = await selectReservePuzzle(input);
    const second = await selectReservePuzzle(input);
    expect(first.puzzle.id).toBe(second.puzzle.id);
    expect(first.noveltyEvidence.score).toBeGreaterThanOrEqual(50);
    expect(first.noveltyEvidence.version).toBe("structural-v1");
  });

  it("never chooses an answer already present anywhere in the archive", async () => {
    const baseline = await selectReservePuzzle({
      dateString: "2026-08-01",
      usedAnswerKeys: new Set(),
      recentPuzzles: [],
      now: () => dateAt(0),
    });
    const usedAnswerKeys = new Set([normalizeAnswerKey(baseline.puzzle.answer)]);
    const replacement = await selectReservePuzzle({
      dateString: "2026-08-01",
      usedAnswerKeys,
      recentPuzzles: [],
      now: () => dateAt(0),
    });

    expect(replacement.puzzle.answer).not.toBe(baseline.puzzle.answer);
    expect(usedAnswerKeys.has(normalizeAnswerKey(replacement.puzzle.answer))).toBe(false);
  });

  it("skips an unused answer when its visual composition is already archived", async () => {
    const usedAnswerKeys = new Set(
      RESERVE_PUZZLES.slice(2).map((puzzle) => normalizeAnswerKey(puzzle.answer))
    );
    const baseline = await selectReservePuzzle({
      dateString: "2026-08-01",
      usedAnswerKeys,
      recentPuzzles: [],
      now: () => dateAt(0),
    });
    const recentConflict: PuzzleNoveltyArchiveEntry = {
      ...baseline.puzzle,
      id: "recent-conflict",
      answer: "a different archived answer",
      createdAt: dateAt(-1),
    };
    const replacement = await selectReservePuzzle({
      dateString: "2026-08-01",
      usedAnswerKeys,
      recentPuzzles: [recentConflict],
      now: () => dateAt(0),
    });

    expect(replacement.puzzle.id).not.toBe(baseline.puzzle.id);
  });

  it("supports a full month of unique degraded service under novelty limits", async () => {
    const usedAnswerKeys = new Set<string>();
    const recentPuzzles: PuzzleNoveltyArchiveEntry[] = [];
    const selectedIds = new Set<string>();

    for (let day = 0; day < 30; day += 1) {
      const now = dateAt(day);
      const selection = await selectReservePuzzle({
        dateString: now.toISOString().slice(0, 10),
        usedAnswerKeys,
        recentPuzzles,
        now: () => now,
      }).catch((error: unknown) => {
        throw new Error(`Reserve failed on day ${day + 1}`, { cause: error });
      });
      expect(selectedIds.has(selection.puzzle.id)).toBe(false);
      selectedIds.add(selection.puzzle.id);
      usedAnswerKeys.add(normalizeAnswerKey(selection.puzzle.answer));
      recentPuzzles.push({ ...selection.puzzle, createdAt: now });
    }

    expect(selectedIds.size).toBe(30);
  });

  it("fails closed instead of recycling after the reserve is exhausted", async () => {
    const usedAnswerKeys = new Set(
      RESERVE_PUZZLES.map((puzzle) => normalizeAnswerKey(puzzle.answer))
    );

    await expect(
      selectReservePuzzle({
        dateString: "2026-08-01",
        usedAnswerKeys,
        recentPuzzles: [],
        now: () => dateAt(0),
      })
    ).rejects.toBeInstanceOf(ReservePuzzleExhaustedError);
  });
});
