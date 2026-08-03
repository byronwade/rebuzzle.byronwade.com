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
});
