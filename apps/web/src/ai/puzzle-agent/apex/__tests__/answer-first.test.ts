import {
  AnswerFirstSeedUnavailableError,
  answerFirstSeedKey,
  selectAnswerFirstSeed,
  selectAnswerFirstSeeds,
} from "../answer-first";
import type { PhraseBankEntry } from "../types";

const entries: PhraseBankEntry[] = [
  {
    answer: "sunflower",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound"],
    overused: true,
  },
  {
    answer: "moonlight",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound"],
  },
  {
    answer: "under the weather",
    category: "positional",
    difficultyHint: 6,
    techniqueAffinity: ["spatial_preposition_play"],
  },
];

describe("answer-first seed selection", () => {
  it("prefers a fresh seed compatible with the slot technique", () => {
    expect(
      selectAnswerFirstSeed({
        entries,
        techniqueId: "spatial_preposition_play",
      })?.answer
    ).toBe("under the weather");
  });

  it("skips overused and already-consumed answers", () => {
    expect(
      selectAnswerFirstSeed({
        entries,
        techniqueId: "spatial_preposition_play",
        usedAnswerKeys: ["moonlight"],
      })?.answer
    ).toBe("under the weather");
  });

  it("fails closed when no technique-specific seed exists", () => {
    expect(
      selectAnswerFirstSeed({
        entries,
        techniqueId: "idiom_as_picture",
      })?.answer
    ).toBeUndefined();
  });

  it("returns no seed when the inventory is exhausted", () => {
    expect(
      selectAnswerFirstSeed({
        entries,
        techniqueId: "simple_compound",
        usedAnswerKeys: ["moonlight", "under-the-weather"],
      })
    ).toBeUndefined();
  });

  it("normalizes the answer for collision tracking", () => {
    expect(answerFirstSeedKey(entries[2])).toBe("undertheweather");
  });

  it("reserves distinct seeds for every tournament slot", () => {
    expect(
      selectAnswerFirstSeeds({
        entries,
        techniqueIds: ["simple_compound", "spatial_preposition_play"],
        count: 2,
      }).map((entry) => entry.answer)
    ).toEqual(["moonlight", "under the weather"]);
  });

  it("exposes a typed fail-closed error when inventory cannot cover the tournament", () => {
    const error = new AnswerFirstSeedUnavailableError({ requestedCount: 2, selectedCount: 1 });
    expect(error).toMatchObject({
      code: "APEX_ANSWER_FIRST_SEED_UNAVAILABLE",
      requestedCount: 2,
      selectedCount: 1,
    });
  });

  it("stops reservation when a slot has no compatible seed", () => {
    expect(
      selectAnswerFirstSeeds({
        entries,
        techniqueIds: ["idiom_as_picture", "simple_compound"],
        count: 2,
      })
    ).toEqual([]);
  });

  it("fails closed when no technique schedule is provided", () => {
    expect(
      selectAnswerFirstSeeds({
        entries,
        techniqueIds: [],
        count: 1,
      })
    ).toEqual([]);
  });

  it("can require a host-owned visual cue plan for strict generation", () => {
    expect(
      selectAnswerFirstSeed({
        entries,
        techniqueId: "simple_compound",
        requireVisualCuePlan: true,
      })
    ).toBeUndefined();

    expect(
      selectAnswerFirstSeed({
        entries: [
          {
            ...entries[1],
            visualCues: [{ kind: "catalog", concept: "moon", role: "word-part" }],
          },
        ],
        techniqueId: "simple_compound",
        requireVisualCuePlan: true,
      })?.answer
    ).toBe("moonlight");
  });
});

describe("complete tournament allocation", () => {
  const flexible: PhraseBankEntry = {
    answer: "flexible",
    category: "test",
    difficultyHint: 7,
    techniqueAffinity: ["simple_compound", "spatial_preposition_play"],
  };
  const constrained: PhraseBankEntry = {
    answer: "compound only",
    category: "test",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound"],
  };
  it("reassigns a flexible seed instead of falsely reporting exhausted inventory", () => {
    const selected = selectAnswerFirstSeeds({
      entries: [flexible, constrained],
      techniqueIds: ["simple_compound", "spatial_preposition_play"],
      count: 2,
    });
    expect(selected.map((s) => s.answer)).toEqual(["compound only", "flexible"]);
  });
  it("handles a chain of reassignments", () => {
    const bank: PhraseBankEntry[] = [
      {
        ...flexible,
        answer: "first",
        techniqueAffinity: ["simple_compound", "spatial_preposition_play"],
      },
      {
        ...flexible,
        answer: "second",
        techniqueAffinity: ["spatial_preposition_play", "idiom_as_picture"],
      },
      { ...flexible, answer: "third", techniqueAffinity: ["simple_compound"] },
    ];
    expect(
      selectAnswerFirstSeeds({
        entries: bank,
        techniqueIds: ["simple_compound", "spatial_preposition_play", "idiom_as_picture"],
        count: 3,
      }).map((s) => s.answer)
    ).toEqual(["third", "first", "second"]);
  });
  it("does not count spelling variants as separate available answers", () => {
    expect(
      selectAnswerFirstSeeds({
        entries: [flexible, { ...flexible, answer: "FLEX-IBLE" }],
        techniqueIds: ["simple_compound"],
        count: 2,
      })
    ).toHaveLength(1);
  });
  it("ranks fresh compatible seeds by target difficulty without changing the bank", () => {
    const bank = [constrained, flexible];
    expect(
      selectAnswerFirstSeed({ entries: bank, techniqueId: "simple_compound", targetDifficulty: 8 })
        ?.answer
    ).toBe("flexible");
    expect(
      selectAnswerFirstSeeds({
        entries: bank,
        techniqueIds: ["simple_compound"],
        count: 1,
        targetDifficulty: 8,
      })[0]?.answer
    ).toBe("flexible");
    expect(bank[0]).toBe(constrained);
  });
  it.each([NaN, Infinity, -1, 1.5])("rejects an invalid slot count %s", (count) => {
    expect(
      selectAnswerFirstSeeds({ entries: [flexible], techniqueIds: ["simple_compound"], count })
    ).toEqual([]);
  });
  it("respects used answers and cue-plan requirements during reassignment", () => {
    expect(
      selectAnswerFirstSeeds({
        entries: [flexible, constrained],
        techniqueIds: ["simple_compound", "spatial_preposition_play"],
        count: 2,
        usedAnswerKeys: ["flexible"],
      })
    ).toEqual([constrained]);
    expect(
      selectAnswerFirstSeeds({
        entries: [flexible, constrained],
        techniqueIds: ["simple_compound"],
        count: 1,
        requireVisualCuePlan: true,
      })
    ).toEqual([]);
  });
});

it("finds a full assignment for every feasible three-slot compatibility graph", () => {
  const techniques = ["simple_compound", "spatial_preposition_play", "idiom_as_picture"] as const;
  // Compare the planner with an independent exhaustive oracle across all 512 graphs.
  for (let mask = 0; mask < 512; mask++) {
    const bank: PhraseBankEntry[] = [0, 1, 2].map((entry) => ({
      answer: `answer ${entry}`,
      category: "test",
      difficultyHint: 7,
      techniqueAffinity: techniques.filter((_, slot) => Boolean(mask & (1 << (entry * 3 + slot)))),
    }));
    const feasible = (slot: number, used: Set<number>): boolean =>
      slot === 3 ||
      bank.some(
        (entry, index) =>
          !used.has(index) &&
          entry.techniqueAffinity.includes(techniques[slot]!) &&
          feasible(slot + 1, new Set([...used, index]))
      );
    const result = selectAnswerFirstSeeds({ entries: bank, techniqueIds: techniques, count: 3 });
    expect(result.length === 3).toBe(feasible(0, new Set()));
    expect(new Set(result.map((entry) => answerFirstSeedKey(entry))).size).toBe(result.length);
    result.forEach((entry, slot) => expect(entry.techniqueAffinity).toContain(techniques[slot]));
  }
});

describe("recent quality failure preferences", () => {
  const entries: PhraseBankEntry[] = [
    {
      answer: "history repeating itself",
      category: "meta",
      difficultyHint: 8,
      techniqueAffinity: ["triple_layer_composition", "recursive_visual_pun"],
    },
    {
      answer: "growing concern",
      category: "typography",
      difficultyHint: 7,
      techniqueAffinity: ["triple_layer_composition"],
    },
  ];
  const preferences = {
    recentFailedPairs: new Set(["historyrepeatingitself:triple_layer_composition"]),
  };

  it("prefers a fresh compatible pair over a failed closer difficulty match", () => {
    expect(
      selectAnswerFirstSeed({
        entries,
        techniqueId: "triple_layer_composition",
        targetDifficulty: 8,
        ...preferences,
      })?.answer
    ).toBe("growing concern");
    expect(
      selectAnswerFirstSeeds({
        entries,
        techniqueIds: ["triple_layer_composition"],
        count: 1,
        targetDifficulty: 8,
        ...preferences,
      }).map((p) => p.answer)
    ).toEqual(["growing concern"]);
  });

  it("keeps failed pairs eligible when fresh alternatives are exhausted and never revives used answers", () => {
    expect(
      selectAnswerFirstSeed({
        entries,
        techniqueId: "triple_layer_composition",
        usedAnswerKeys: ["growing concern"],
        ...preferences,
      })?.answer
    ).toBe("history repeating itself");
    expect(
      selectAnswerFirstSeed({ entries, techniqueId: "recursive_visual_pun", ...preferences })
        ?.answer
    ).toBe("history repeating itself");
  });
});
