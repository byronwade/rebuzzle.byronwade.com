/**
 * Apex revise lane must refuse unlocked repairs (no cue plan) instead of
 * inventing a replacement answer/board.
 */

const runPuzzleAgentGeneration = jest.fn();
const buildGenerationBrief = jest.fn();
const critiqueCandidate = jest.fn();
const qualifyRenderedCandidate = jest.fn();

jest.mock("../../run-generation", () => ({ runPuzzleAgentGeneration }));
jest.mock("../../tool-impl", () => ({
  stableId: jest.fn((...parts: string[]) => parts.join("-")),
}));
jest.mock("../curriculum", () => ({ buildGenerationBrief }));
jest.mock("../critique", () => ({ critiqueCandidate }));
jest.mock("../rendered-qualification", () => ({ qualifyRenderedCandidate }));
jest.mock("../player-sim", () => ({
  applyPlayerSimHeuristics: jest.fn(),
  playerSimPublishBlockers: jest.fn(() => []),
  simulatePlayerSolve: jest.fn(),
}));
jest.mock("../../../learning/answer-registry", () => ({
  isAnswerRegistered: jest.fn(async () => ({ taken: false })),
}));
jest.mock("../../../learning/sim-calibration", () => ({
  loadSimCalibration: jest.fn(async () => ({ adjustment: 0, sampleSize: 0 })),
}));

import { INK_PICTOGRAM_EXAMPLE_KEY } from "../../visual/style";
import { runApexGeneration } from "../engine";

function puzzleResult(answer: string, withCuePlan: boolean) {
  return {
    puzzle: {
      rebusPuzzle: `${answer} visual`,
      answer,
      difficulty: 5,
      difficultyLevel: "Hard" as const,
      explanation: "A clean positional mechanism.",
      category: "phrases",
      hints: ["Look at the layout.", "Read the objects together.", "It is a phrase."],
      techniqueId: "simple_compound" as const,
      visual: {
        styleId: "ink-pictogram-v1" as const,
        mode: "composed" as const,
        layout: "row" as const,
        unicodeFallback: "key",
        layers: [
          {
            kind: "pictogram" as const,
            concept: "key",
            emojiFallback: "🔑",
            source: "catalog" as const,
            assetId: "key",
            svg: INK_PICTOGRAM_EXAMPLE_KEY,
          },
        ],
      },
    },
    metadata: {
      fingerprint: `fingerprint-${answer}`,
      uniquenessScore: 90,
      calibratedDifficulty: 5,
      difficultyLevel: "Hard" as const,
      qualityScore: 92,
      qualityVerdict: "good" as const,
      funScore: 82,
      visualStyleId: "ink-pictogram-v1" as const,
      answerSeed: answer,
      answerSeedCuePlan: withCuePlan
        ? [{ kind: "catalog" as const, concept: "key", role: "word-part" as const }]
        : undefined,
      thinkingSummary: "test",
    },
    status: "success" as const,
    recommendations: [],
  };
}

describe("Apex critique-locked repair integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    buildGenerationBrief.mockResolvedValue({
      targetDifficulty: 5,
      tierLabel: "Hard",
      qualityThreshold: 74,
      minRubricOverall: 78,
      candidateCount: 1,
      preferredTechniques: ["simple_compound"],
      avoidTechniques: [],
      phraseSuggestions: [
        {
          answer: "keyboard",
          category: "compound",
          difficultyHint: 5,
          techniqueAffinity: ["simple_compound"],
          visualCues: [{ kind: "catalog", concept: "key", role: "word-part" }],
        },
      ],
      diversity: { bannedAnswerKeys: [] },
      briefSummary: "test",
      techniqueRates: [],
      learning: {
        enabled: false,
        avoidPatterns: [],
        preferPatterns: [],
        difficultyDriftNotes: [],
        sampleSize: 0,
        targetDifficultyDelta: 0,
        tooEasy: false,
        tooHard: false,
        medianSolveSeconds: null,
        solveRate: null,
      },
      requireNovelty: true,
      minFunScore: 68,
      componentBudget: { min: 1, max: 4 },
      puzzleType: "rebus",
    });
  });

  it("does not call invent when critique asks to revise but cue plan is missing", async () => {
    runPuzzleAgentGeneration.mockResolvedValueOnce(puzzleResult("keyboard", false));
    critiqueCandidate.mockResolvedValue({
      source: "model",
      verdict: "revise",
      summary: "Use a concrete icon",
      strengths: [],
      flaws: ["The cue is abstract"],
      reviseInstructions: ["Replace the abstract icon with a concrete silhouette"],
      falseLeadQuality: 60,
      ahaPredicted: 70,
      creativityScore: 70,
      iconRecognizability: 45,
      overusedTrope: false,
    });
    // Qualification fails so revise is attempted, then still no winner if repair skipped.
    qualifyRenderedCandidate.mockImplementation(async (candidate: { rejectReasons: string[] }) => ({
      ...candidate,
      publishable: false,
      rejectReasons: [...candidate.rejectReasons, "Rendered board objects not recognized: key"],
    }));

    await expect(runApexGeneration({ targetDifficulty: 5 })).rejects.toThrow(
      /no candidate meeting the publish rubric/i
    );

    // Slot invent once; locked repair must not invent a second time without cues.
    expect(runPuzzleAgentGeneration).toHaveBeenCalledTimes(1);
  });
});
