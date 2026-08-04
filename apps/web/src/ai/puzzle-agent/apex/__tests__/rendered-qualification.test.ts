const recognizePuzzleBoard = jest.fn();
const simulatePlayerSolve = jest.fn();
const applyPlayerSimHeuristics = jest.fn();
const playerSimPublishBlockers = jest.fn(() => [] as string[]);
const evaluateNearMissStress = jest.fn(() => ({ ok: true, issues: [], nearMisses: [] }));

jest.mock("../../visual/critique-board", () => ({ recognizePuzzleBoard }));
jest.mock("../player-sim", () => ({
  applyPlayerSimHeuristics: (...args: unknown[]) => applyPlayerSimHeuristics(...args),
  playerSimPublishBlockers: (...args: unknown[]) => playerSimPublishBlockers(...args),
  simulatePlayerSolve,
}));
jest.mock("../near-miss-stress", () => ({
  evaluateNearMissStress: (...args: unknown[]) => evaluateNearMissStress(...args),
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
  beforeEach(() => {
    jest.clearAllMocks();
    playerSimPublishBlockers.mockReturnValue([]);
    evaluateNearMissStress.mockReturnValue({ ok: true, issues: [], nearMisses: [] });
    applyPlayerSimHeuristics.mockImplementation((sim) => sim);
  });

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

  it("fails closed when blind wrong parses are near-miss cousins of the answer", async () => {
    recognizePuzzleBoard.mockResolvedValue({
      ok: true,
      perceptions: [{ model: "a", overallConfidence: 0.9 }],
      conceptVotes: {},
      textVotes: {},
      operatorVotes: {},
      profileResults: [],
    });
    simulatePlayerSolve.mockResolvedValue({
      firstWrongParses: ["door to doors"],
      likelySolvePath: "ok",
      hintUnlockOrderLooksFair: true,
      unfairReasons: [],
      estimatedSolveRate: 0.5,
      confidence: 0.9,
    });
    evaluateNearMissStress.mockReturnValue({
      ok: false,
      issues: ['Near-miss stress failed: "door to door" collides with close alternate(s): door to doors'],
      nearMisses: ["door to doors"],
    });

    const result = await qualifyRenderedCandidate(candidate());

    expect(evaluateNearMissStress).toHaveBeenCalledWith({
      answer: "door to door",
      extraCandidates: ["door to doors"],
      includePhraseBank: false,
    });
    expect(result.publishable).toBe(false);
    expect(result.rejectReasons.join(" ")).toMatch(/Near-miss stress failed/i);
  });
});
