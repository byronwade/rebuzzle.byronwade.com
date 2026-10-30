import { buildPuzzleSolveBenchmarkCorpus } from "../benchmark/puzzle-corpus";
import { DEMANDING_RESERVE_PUZZLES } from "../demanding-reserve-puzzles";
import { DEMANDING_RESERVE_SEASON_TWO } from "../demanding-reserve-season-two";
import type { PuzzleNoveltyArchiveEntry } from "../novelty";
import { normalizeAnswerKey } from "../quality";
import { selectReservePuzzle } from "../reserve-puzzles";
import { PuzzleVisualSchema } from "../visual/composition";
import { estimateTextFontScale } from "../visual/layout-plan";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../visual/presentation";
import { ReasoningEvidenceSchema } from "../visual/reasoning-evidence";

const SEASON_TWO_IDS = new Set(DEMANDING_RESERVE_SEASON_TWO.map((puzzle) => puzzle.id));
const SEASON_ONE_IDS = new Set(
  DEMANDING_RESERVE_PUZZLES.filter((puzzle) => !SEASON_TWO_IDS.has(puzzle.id)).map(
    (puzzle) => puzzle.id
  )
);

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

  it("keeps every text line legible on the narrowest player boards", () => {
    const tooWide: string[] = [];
    for (const puzzle of DEMANDING_RESERVE_PUZZLES) {
      for (const layer of puzzle.visual.layers) {
        if (layer.kind !== "text") continue;
        for (const profile of PUZZLE_BOARD_RECOGNITION_PROFILES) {
          const availableWidth = profile.viewportWidth - profile.padding * 2;
          const scale = estimateTextFontScale(layer, availableWidth, profile.size);
          if (scale < 0.6) tooWide.push(`${puzzle.id} ${profile.id}: ${layer.content}`);
        }
      }
    }
    expect(tooWide).toEqual([]);
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

it("serves the entire demanding corpus, one unused answer per day, before running dry", async () => {
  const usedAnswerKeys = new Set<string>();
  const recentPuzzles: PuzzleNoveltyArchiveEntry[] = [];
  for (let day = 0; day < DEMANDING_RESERVE_PUZZLES.length; day++) {
    const now = new Date(Date.UTC(2027, 0, 1 + day, 12));
    const selected = await selectReservePuzzle({
      dateString: now.toISOString().slice(0, 10),
      usedAnswerKeys,
      recentPuzzles,
      now: () => now,
    });
    const key = normalizeAnswerKey(selected.puzzle.answer);
    expect(usedAnswerKeys.has(key)).toBe(false);
    usedAnswerKeys.add(key);
    recentPuzzles.push({ ...selected.puzzle, createdAt: now });
  }
  expect(usedAnswerKeys.size).toBe(DEMANDING_RESERVE_PUZZLES.length);
  expect(DEMANDING_RESERVE_PUZZLES.length).toBeGreaterThanOrEqual(70);
});

it("keeps every demanding text line short enough that size cues are not auto-shrunk", () => {
  for (const puzzle of DEMANDING_RESERVE_PUZZLES) {
    for (const layer of puzzle.visual.layers) {
      if (layer.kind !== "text" || layer.emphasis === "stacked") continue;
      const limit = layer.emphasis === "large" ? 8 : 12;
      if (!puzzle.id.startsWith("demanding:") || layer.content.length <= limit) continue;
      // Season one predates this guard; hold every new board to it.
      expect(SEASON_ONE_IDS.has(puzzle.id)).toBe(true);
    }
  }
});
