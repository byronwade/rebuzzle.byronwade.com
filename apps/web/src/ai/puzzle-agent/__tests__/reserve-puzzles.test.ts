import { buildPuzzleSolveBenchmarkCorpus } from "../benchmark/puzzle-corpus";
import { DEMANDING_RESERVE_PUZZLES as RESERVE_PUZZLES } from "../demanding-reserve-puzzles";
import { buildPuzzleNoveltySignature, type PuzzleNoveltyArchiveEntry } from "../novelty";
import { normalizeAnswerKey } from "../quality";
import {
  RESERVE_PUZZLES as LEGACY_RESERVE_PUZZLES,
  ReservePuzzleExhaustedError,
  selectReservePuzzle,
  validateReservePuzzleCorpus,
} from "../reserve-puzzles";
import { PuzzleVisualSchema } from "../visual/composition";

function dateAt(day: number): Date {
  return new Date(Date.UTC(2026, 7, 1 + day, 12));
}

describe("validated reserve puzzle inventory", () => {
  it("ships 30+ unique, catalog-grounded, schema-valid puzzles", () => {
    expect(RESERVE_PUZZLES.length).toBeGreaterThanOrEqual(30);
    expect(validateReservePuzzleCorpus(RESERVE_PUZZLES)).toEqual([]);
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

  it("does not select simple legacy boards even with inflated scores", async () => {
    await expect(
      selectReservePuzzle({
        dateString: "2026-08-01",
        usedAnswerKeys: new Set(),
        recentPuzzles: [],
        corpus: LEGACY_RESERVE_PUZZLES.filter(
          (puzzle) =>
            puzzle.visual.layout === "row" &&
            puzzle.visual.layers.some((layer) => layer.kind === "operator" && layer.symbol === "+")
        ).map((puzzle) => ({ ...puzzle, difficulty: 9 })),
      })
    ).rejects.toBeInstanceOf(ReservePuzzleExhaustedError);
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

  it("waives only weekly quotas when every unused reserve trips one", async () => {
    // Find a reserve whose mechanism family is shared by two other reserves.
    const byFamily = new Map<string, typeof RESERVE_PUZZLES>();
    for (const puzzle of RESERVE_PUZZLES) {
      const family = buildPuzzleNoveltySignature(puzzle).mechanismFamilyKey;
      byFamily.set(family, [...(byFamily.get(family) ?? []), puzzle]);
    }
    const family = [...byFamily.values()].find((members) => members.length >= 3);
    expect(family).toBeDefined();
    const [candidate, ...siblings] = family ?? [];
    const usedAnswerKeys = new Set(
      RESERVE_PUZZLES.filter((puzzle) => puzzle.id !== candidate.id).map((puzzle) =>
        normalizeAnswerKey(puzzle.answer)
      )
    );
    const recentPuzzles: PuzzleNoveltyArchiveEntry[] = siblings
      .slice(0, 2)
      .map((puzzle, index) => ({ ...puzzle, createdAt: dateAt(-1 - index) }));

    const selection = await selectReservePuzzle({
      dateString: "2026-08-01",
      usedAnswerKeys,
      recentPuzzles,
      now: () => dateAt(0),
    });

    expect(selection.puzzle.id).toBe(candidate.id);
    expect(selection.waivedNoveltyLimits?.length).toBeGreaterThan(0);
    expect(
      selection.waivedNoveltyLimits?.every((limit) => /already used \d+ times/.test(limit))
    ).toBe(true);
  });

  it("provides at least three weeks of fresh reserve after the original corpus is exhausted", async () => {
    // Snapshot of the depleted production inventory; never derive this from the expanded corpus.
    const exhaustedAnswers = [
      "firetruck",
      "birdhouse",
      "doghouse",
      "catfish",
      "mailbox",
      "doorbell",
      "handbag",
      "bedtime",
      "moonwalk",
      "hotdog",
      "watchdog",
      "lighthouse",
      "starlight",
      "cookbook",
      "rainforest",
      "campfire",
      "airmail",
      "phonebook",
      "songbird",
      "toolbox",
      "birdbrain",
      "brainchild",
      "sweetheart",
      "heartburn",
      "pizza box",
      "eggplant",
      "treehouse",
      "snowball",
      "eyeball",
      "fireball",
      "clockwork",
      "blackmail",
      "bluebird",
      "newsflash",
      "dead end",
      "deadline",
      "cold feet",
      "baby shower",
      "brain drain",
      "love letter",
      "junk mail",
      "rain check",
      "hot shot",
      "piece of cake",
      "handbook",
      "bookend",
      "housework",
      "daydream",
      "keychain",
      "keyring",
      "gemstone",
      "doorway",
      "rainfall",
      "moonbeam",
      "notebook",
      "textbook",
      "storybook",
      "dreamboat",
      "backdoor",
      "blue moon",
      "black cat",
      "red eye",
      "big fish",
      "small world",
      "little things",
      "tricycle",
      "I understand",
      "life after death",
      "world under water",
    ];
    const usedAnswerKeys = new Set(exhaustedAnswers.map(normalizeAnswerKey));
    const recentPuzzles: PuzzleNoveltyArchiveEntry[] = [];
    for (let day = 0; day < 21; day += 1) {
      const now = dateAt(day);
      const selection = await selectReservePuzzle({
        dateString: now.toISOString().slice(0, 10),
        usedAnswerKeys,
        recentPuzzles,
        now: () => now,
      });
      const key = normalizeAnswerKey(selection.puzzle.answer);
      expect(usedAnswerKeys.has(key)).toBe(false);
      usedAnswerKeys.add(key);
      recentPuzzles.push({ ...selection.puzzle, createdAt: now });
    }
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
