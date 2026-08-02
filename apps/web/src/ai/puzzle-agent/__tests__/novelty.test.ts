import {
  buildPuzzleNoveltySignature,
  createInMemoryPuzzleNoveltyArchive,
  createPuzzleNoveltyModule,
  type PuzzleNoveltyArchive,
  type PuzzleNoveltyArchiveEntry,
  type PuzzleNoveltyCandidate,
} from "../novelty";
import { INK_PICTOGRAM_STYLE_ID } from "../visual/style";

const NOW = new Date("2026-08-01T12:00:00.000Z");

function candidate(
  answer: string,
  concepts: string[],
  options: { techniqueId?: string; layout?: "row" | "stack" | "grid" | "overlay" } = {}
): PuzzleNoveltyCandidate {
  return {
    answer,
    category: "phrases",
    techniqueId: options.techniqueId ?? "compound-charade",
    rebusPuzzle: concepts.join(" + "),
    visual: {
      styleId: INK_PICTOGRAM_STYLE_ID,
      mode: "composed",
      layout: options.layout ?? "row",
      layers: concepts.map((concept) => ({
        kind: "pictogram" as const,
        concept,
        emojiFallback: "❓",
      })),
      unicodeFallback: concepts.join(" + "),
    },
  };
}

function archived(
  id: string,
  puzzle: PuzzleNoveltyCandidate,
  createdAt = new Date("2026-07-31T12:00:00.000Z")
): PuzzleNoveltyArchiveEntry {
  return { id, createdAt, ...puzzle };
}

function evaluator(entries: PuzzleNoveltyArchiveEntry[]) {
  return createPuzzleNoveltyModule({
    archive: createInMemoryPuzzleNoveltyArchive(entries),
    now: () => NOW,
  });
}

describe("structural puzzle novelty", () => {
  it("rejects a different answer that repeats the exact visual mechanism", async () => {
    const existing = archived("p-1", candidate("car pool", ["car", "water"]));
    const result = await evaluator([existing]).evaluate(candidate("road water", ["car", "water"]));

    expect(result.isUnique).toBe(false);
    expect(result.blockers.join(" ")).toContain("Structural composition repeats");
    expect(result.conflicts[0]?.structuralSimilarity).toBe(1);
  });

  it("distinguishes cue order while retaining a strong similarity penalty", async () => {
    const existing = archived("p-1", candidate("car pool", ["car", "water"]));
    const result = await evaluator([existing]).evaluate(candidate("water car", ["water", "car"]));

    expect(result.isUnique).toBe(true);
    expect(result.evidence.closestStructuralSimilarity).toBeGreaterThan(0.8);
    expect(result.conflicts[0]?.reasons).toEqual([]);
    expect(result.score).toBeLessThan(70);
  });

  it("passes a genuinely different cue set and topology", async () => {
    const existing = archived("p-1", candidate("car pool", ["car", "water"]));
    const result = await evaluator([existing]).evaluate(
      candidate("brain storm", ["brain", "cloud"], {
        layout: "stack",
        techniqueId: "spatial-positioning",
      })
    );

    expect(result.isUnique).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("blocks the third use of a mechanism family in seven days", async () => {
    const entries = [
      archived("p-1", candidate("alpha", ["car"])),
      archived("p-2", candidate("beta", ["brain", "cloud"])),
    ];
    const result = await evaluator(entries).evaluate(candidate("gamma", ["key", "moon", "fish"]));

    expect(result.isUnique).toBe(false);
    expect(result.evidence.recentMechanismFamilyUses).toBe(2);
    expect(result.blockers.join(" ")).toContain("Mechanism family already used 2 times");
  });

  it("blocks the fourth use of a visual topology in seven days", async () => {
    const entries = [
      archived("p-1", candidate("alpha", ["car"], { techniqueId: "one" })),
      archived("p-2", candidate("beta", ["brain"], { techniqueId: "two" })),
      archived("p-3", candidate("gamma", ["key"], { techniqueId: "three" })),
    ];
    const result = await evaluator(entries).evaluate(
      candidate("delta", ["moon"], { techniqueId: "four" })
    );

    expect(result.isUnique).toBe(false);
    expect(result.evidence.recentTopologyUses).toBe(3);
    expect(result.blockers.join(" ")).toContain("Visual topology already used 3 times");
  });

  it("rejects an answer found outside the structural lookback window", async () => {
    const old = archived(
      "old-puzzle",
      candidate("car pool", ["car", "water"]),
      new Date("2020-01-01T00:00:00.000Z")
    );
    const result = await evaluator([old]).evaluate(candidate("car pool", ["brain", "cloud"]));

    expect(result.isUnique).toBe(false);
    expect(result.blockers.join(" ")).toContain("Answer already exists");
  });

  it("canonicalizes catalog aliases before comparing cue combinations", () => {
    const car = buildPuzzleNoveltySignature(candidate("one", ["car"]));
    const automobile = buildPuzzleNoveltySignature(candidate("two", ["automobile"]));

    expect(car.cueCombinationKey).toBe(automobile.cueCombinationKey);
    expect(car.orderedCueKey).toBe(automobile.orderedCueKey);
  });

  it("includes text emphasis in the topology signature", () => {
    const normal = candidate("one", ["car"]);
    normal.visual!.layers = [{ kind: "text", content: "cycle", emphasis: "normal" }];
    const struck = candidate("two", ["car"]);
    struck.visual!.layers = [{ kind: "text", content: "cycle", emphasis: "strike" }];

    expect(buildPuzzleNoveltySignature(normal).topologyKey).not.toBe(
      buildPuzzleNoveltySignature(struck).topologyKey
    );
  });

  it("fingerprints image tiles by their recognition concept rather than mutable alt copy", () => {
    const first = candidate("one", ["car"]);
    first.visual!.mode = "hybrid";
    first.visual!.layers = [
      {
        kind: "image",
        concept: "car",
        prompt: "one red car on a plain background",
        alt: "a bright red automobile",
      },
    ];
    const second = candidate("two", ["car"]);
    second.visual!.mode = "hybrid";
    second.visual!.layers = [
      {
        kind: "image",
        concept: "car",
        prompt: "simple vehicle illustration",
        alt: "transportation picture",
      },
    ];

    expect(buildPuzzleNoveltySignature(first).cueCombinationKey).toBe(
      buildPuzzleNoveltySignature(second).cueCombinationKey
    );
  });

  it("falls back deterministically for legacy unicode puzzles", () => {
    const legacy = { answer: "before", category: "phonetic", rebusPuzzle: "🐝 + 4" };

    expect(buildPuzzleNoveltySignature(legacy)).toEqual(buildPuzzleNoveltySignature(legacy));
    expect(buildPuzzleNoveltySignature(legacy).layout).toBe("legacy");
  });

  it("fails closed when the archive cannot be read", async () => {
    const archive: PuzzleNoveltyArchive = {
      async findExactAnswer() {
        throw new Error("archive unavailable");
      },
      async listRecent() {
        return [];
      },
    };

    await expect(
      createPuzzleNoveltyModule({ archive, now: () => NOW }).evaluate(candidate("alpha", ["car"]))
    ).rejects.toThrow("archive unavailable");
  });
});
