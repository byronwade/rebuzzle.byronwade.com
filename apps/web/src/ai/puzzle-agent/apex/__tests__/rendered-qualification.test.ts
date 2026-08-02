const recognizePuzzleBoard = jest.fn();
const simulatePlayerSolve = jest.fn();

jest.mock("../../visual/critique-board", () => ({ recognizePuzzleBoard }));
jest.mock("../player-sim", () => ({
  applyPlayerSimHeuristics: jest.fn(),
  playerSimPublishBlockers: jest.fn(() => []),
  simulatePlayerSolve,
}));

import { INK_PICTOGRAM_EXAMPLE_KEY } from "../../visual/style";
import { qualifyRenderedCandidate } from "../rendered-qualification";
import type { ApexCandidate } from "../types";

function candidate(): ApexCandidate {
  return {
    id: "finalist",
    rebusPuzzle: "door over door",
    answer: "door to door",
    difficulty: 5,
    difficultyLevel: "Hard",
    explanation: "Two doors are positioned one above the other to form the phrase.",
    category: "phrases",
    hints: ["Look at position.", "Read both objects.", "It is a phrase."],
    techniqueId: "positional_phrase",
    visual: {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "stack",
      unicodeFallback: "door\ndoor",
      layers: [
        {
          kind: "pictogram",
          concept: "door",
          emojiFallback: "door",
          svg: INK_PICTOGRAM_EXAMPLE_KEY,
        },
      ],
    },
    fingerprint: "fingerprint-finalist",
    uniquenessScore: 90,
    calibratedDifficulty: 5,
    inBand: true,
    isUnique: true,
    solvable: true,
    qualityOverall: 88,
    funScore: 82,
    publishable: true,
    rejectReasons: [],
  };
}

describe("rendered finalist qualification", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects an unrecognized board before spending on player simulation", async () => {
    recognizePuzzleBoard.mockResolvedValue({
      ok: false,
      reason: "Rendered board objects not recognized: door",
      perceptions: [],
      conceptVotes: {},
      textVotes: {},
      operatorVotes: {},
      profileResults: [],
    });

    const result = await qualifyRenderedCandidate(candidate());

    expect(result.publishable).toBe(false);
    expect(result.rejectReasons).toContain("Rendered board objects not recognized: door");
    expect(simulatePlayerSolve).not.toHaveBeenCalled();
  });
});
