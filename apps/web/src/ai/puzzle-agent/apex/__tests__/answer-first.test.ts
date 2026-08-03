import { answerFirstSeedKey, selectAnswerFirstSeed } from "../answer-first";
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
        techniqueId: "simple_compound",
        usedAnswerKeys: ["moonlight"],
      })?.answer
    ).toBe("under the weather");
  });

  it("falls back to a fresh answer when no technique-specific seed exists", () => {
    expect(
      selectAnswerFirstSeed({
        entries,
        techniqueId: "idiom_as_picture",
      })?.answer
    ).toBe("moonlight");
  });

  it("returns no seed when the inventory is exhausted", () => {
    expect(
      selectAnswerFirstSeed({
        entries,
        usedAnswerKeys: ["moonlight", "under-the-weather"],
      })
    ).toBeUndefined();
  });

  it("normalizes the answer for collision tracking", () => {
    expect(answerFirstSeedKey(entries[2])).toBe("undertheweather");
  });
});
