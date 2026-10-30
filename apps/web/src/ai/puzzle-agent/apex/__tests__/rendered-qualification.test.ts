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
import { selectQualifiedFinalist } from "../finalist-selection";
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
      issues: [
        'Near-miss stress failed: "door to door" collides with close alternate(s): door to doors',
      ],
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
  it("evaluates the runner-up when the top daily finalist lacks reasoning evidence", async () => {
    recognizePuzzleBoard.mockResolvedValue({
      ok: true,
      perceptions: [],
      conceptVotes: {},
      textVotes: {},
      operatorVotes: {},
      profileResults: [],
    });
    const sim = {
      firstWrongParses: [],
      likelySolvePath: "A visible interpretation",
      hintUnlockOrderLooksFair: true,
      unfairReasons: [],
      estimatedSolveRate: 0.5,
      confidence: 0.9,
    };
    simulatePlayerSolve.mockResolvedValueOnce(sim).mockResolvedValueOnce({
      ...sim,
      reasoningEvidence: {
        version: "editorial-reasoning-v1",
        interacting: true,
        calibration: "editorial-unplaytested",
        finalInterpretation: "two left feet",
        operations: [
          {
            kind: "reversal",
            observation: "TEEF reads leftward",
            inference: "left feet",
            necessary: true,
          },
          { kind: "count", observation: "Two copies", inference: "two", necessary: true },
        ],
      },
    });
    const dailyCandidate = (id: string, qualityOverall: number): ApexCandidate => ({
      ...candidate(),
      id,
      qualityOverall,
      answer: "two left feet",
      difficulty: 7,
      visual: {
        mode: "composed",
        layout: "row",
        unicodeFallback: "TEEF TEEF",
        layers: [
          { kind: "text", content: "TEEF", emphasis: "normal" },
          { kind: "text", content: "TEEF", emphasis: "normal" },
        ],
      },
    });
    const evaluated: string[] = [];
    const result = await selectQualifiedFinalist({
      candidates: [dailyCandidate("top", 99), dailyCandidate("runner-up", 80)],
      minRubricOverall: 0,
      canStartEvaluation: () => true,
      evaluate: async (value) => {
        evaluated.push(value.id);
        return qualifyRenderedCandidate(value);
      },
    });
    expect(result.winner?.id).toBe("runner-up");
    expect(evaluated).toEqual(["top", "runner-up"]);
    expect(result.failures.join(" ")).toContain("reviewed evidence");
  });
});
