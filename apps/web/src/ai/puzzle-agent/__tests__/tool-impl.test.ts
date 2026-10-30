jest.mock("../../client", () => ({
  generateAIObject: jest.fn(),
  withRetry: jest.fn(),
}));
jest.mock("../visual/compose-visual", () => ({
  composePuzzleVisual: jest.fn(),
}));
jest.mock("../visual/generate-image-tile", () => ({
  generateImageTile: jest.fn(),
}));
jest.mock("../visual/generate-pictogram", () => ({
  generatePictogram: jest.fn(),
}));

import { calculateDifficultyProfile } from "../../services/difficulty-profile";
import { craftHintLadder, stressTestSolvability } from "../tool-impl";
import { INK_PICTOGRAM_STYLE_ID } from "../visual/style";

describe("craftHintLadder", () => {
  const base = {
    answer: "bell bottom",
    explanation: "A small BELL sits at the bottom of the board, making the phrase bell bottom.",
    rebusPuzzle: "BELL",
    targetDifficulty: 7,
  };

  it("keeps all three distinct authored stages exactly as supplied", () => {
    const hints = [
      "Look at where the bell sits on the board.",
      "The bell's low position contributes one part of the phrase.",
      "Read the pictured object, then name its position.",
    ];
    const result = craftHintLadder({ ...base, existingHints: hints });
    expect(result.hints).toEqual(hints);
    expect(result.issues).toEqual([]);
  });

  it("rejects repeated and answer-revealing authored hints without padding", () => {
    const hints = ["Look at the low bell.", "Look at the low bell!", "The answer is bell bottom."];
    const result = craftHintLadder({ ...base, existingHints: hints });
    expect(result.hints).toEqual(hints);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/duplicate/i),
        expect.stringMatching(/full answer/i),
      ])
    );
  });

  it("requires authored hints instead of inventing generic answer clues", () => {
    const result = craftHintLadder(base);
    expect(result.hints).toEqual([]);
    expect(result.issues).toEqual(expect.arrayContaining([expect.stringMatching(/authored/i)]));
  });
});

describe("calculateDifficultyProfile", () => {
  it("derives the legacy weighted fields from a modern agent candidate", () => {
    expect(
      calculateDifficultyProfile({
        rebusPuzzle: "👁️ + SCREAM",
        answer: "ice cream",
        explanation: "The eye represents an I sound, followed by a scream sound.",
        category: "phonetic",
      })
    ).toEqual(
      expect.objectContaining({
        visualAmbiguity: expect.any(Number),
        cognitiveSteps: expect.any(Number),
        culturalKnowledge: expect.any(Number),
        vocabularyLevel: expect.any(Number),
        patternNovelty: expect.any(Number),
      })
    );
  });
});

describe("stressTestSolvability", () => {
  it("counts semantic visual layers instead of unicode fallback code points", () => {
    const result = stressTestSolvability({
      rebusPuzzle: "👁️ + LAND",
      answer: "island",
      difficulty: 5,
      targetDifficulty: 5,
      explanation:
        "The eye is read aloud as I, followed by LAND, producing the spoken word island.",
      category: "wordplay",
      hints: ["Think about sounds.", "Say the picture aloud.", "Join that sound to the word LAND."],
      techniqueId: "single_homophone",
      visual: {
        styleId: INK_PICTOGRAM_STYLE_ID,
        mode: "composed",
        layout: "row",
        layers: [
          { kind: "pictogram", concept: "eye", emojiFallback: "👁️" },
          { kind: "operator", symbol: "+" },
          { kind: "text", content: "LAND", emphasis: "large" },
        ],
        unicodeFallback: "👁️ + LAND",
      },
    });

    expect(result.blockers).not.toContain("Too dense for Hard: have 6 parts, want ≤ 4");
    expect(result.passes).toContain("Component budget OK for tier");
  });
});
