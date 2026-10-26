import { buildPuzzleSolveBenchmarkCorpus } from "../benchmark/puzzle-corpus";
import { DEMANDING_RESERVE_PUZZLES } from "../demanding-reserve-puzzles";
import type { PuzzleNoveltyArchiveEntry } from "../novelty";
import { normalizeAnswerKey } from "../quality";
import { selectReservePuzzle } from "../reserve-puzzles";
import { PuzzleVisualSchema } from "../visual/composition";
import { ReasoningEvidenceSchema } from "../visual/reasoning-evidence";

describe("demanding daily reserve", () => {
  it("can supply a month without repeating answers or borrowing evaluator answers", () => {
    expect(DEMANDING_RESERVE_PUZZLES.length).toBeGreaterThanOrEqual(30);
    const answers = DEMANDING_RESERVE_PUZZLES.map((p) => normalizeAnswerKey(p.answer));
    expect(new Set(answers).size).toBe(answers.length);
    const holdout = new Set(
      buildPuzzleSolveBenchmarkCorpus().map((p) => normalizeAnswerKey(p.answer))
    );
    expect(answers.filter((answer) => holdout.has(answer))).toEqual([]);
  });
  it("publishes schema-valid native-supported boards with progressive hints and explicit reasoning", () => {
    for (const puzzle of DEMANDING_RESERVE_PUZZLES) {
      expect(PuzzleVisualSchema.safeParse(puzzle.visual).success).toBe(true);
      expect(ReasoningEvidenceSchema.safeParse(puzzle.reasoningEvidence).success).toBe(true);
      expect(["row", "stack"]).toContain(puzzle.visual.layout);
      expect(puzzle.hints).toHaveLength(3);
      expect(puzzle.hints.every((hint) => hint.trim().length > 15)).toBe(true);
      expect(puzzle.reasoningEvidence.operations.length).toBeGreaterThanOrEqual(2);
      expect(
        new Set(puzzle.reasoningEvidence.operations.map((step) => step.kind)).size
      ).toBeGreaterThanOrEqual(2);
      expect(normalizeAnswerKey(puzzle.rebusPuzzle)).not.toBe(normalizeAnswerKey(puzzle.answer));
    }
  });
});

it("keeps thirty days of demanding fallback available through the actual novelty selector", async () => {
  const usedAnswerKeys = new Set<string>();
  const recentPuzzles: PuzzleNoveltyArchiveEntry[] = [];
  for (let day = 0; day < 30; day++) {
    const now = new Date(Date.UTC(2026, 10, 1 + day, 12));
    const selected = await selectReservePuzzle({
      dateString: now.toISOString().slice(0, 10),
      usedAnswerKeys,
      recentPuzzles,
      now: () => now,
    });
    expect(selected.puzzle.id.startsWith("demanding:")).toBe(true);
    expect(usedAnswerKeys.has(normalizeAnswerKey(selected.puzzle.answer))).toBe(false);
    usedAnswerKeys.add(normalizeAnswerKey(selected.puzzle.answer));
    recentPuzzles.push({ ...selected.puzzle, createdAt: now });
  }
  expect(usedAnswerKeys.size).toBe(30);
});
