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

import { AIBudgetExceededError } from "../../../errors";
import { INK_PICTOGRAM_EXAMPLE_KEY } from "../../visual/style";
import { runApexGeneration } from "../engine";

function puzzleResult(answer: string) {
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
      answerSeedCuePlan: [
        { kind: "catalog" as const, concept: "key", role: "word-part" as const },
        { kind: "text" as const, content: "BOARD", role: "word-part" as const },
      ],
      thinkingSummary: "test",
    },
    status: "success" as const,
    recommendations: [],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Apex spending-cap behavior", () => {
  it("stops remaining tournament slots after the first hard budget error", async () => {
    buildGenerationBrief.mockResolvedValue({
      targetDifficulty: 5,
      tierLabel: "Medium",
      qualityThreshold: 74,
      minRubricOverall: 78,
      candidateCount: 2,
      preferredTechniques: ["simple_compound"],
      avoidTechniques: [],
      phraseSuggestions: [
        {
          answer: "moonlight",
          category: "compound",
          difficultyHint: 5,
          techniqueAffinity: ["simple_compound"],
          visualCues: [{ kind: "catalog", concept: "moon", role: "word-part" }],
        },
        {
          answer: "under the weather",
          category: "positional",
          difficultyHint: 6,
          techniqueAffinity: ["simple_compound"],
          visualCues: [{ kind: "text", content: "UNDER", role: "structural-anchor" }],
        },
      ],
      diversity: { bannedAnswerKeys: [] },
      briefSummary: "test",
    });
    runPuzzleAgentGeneration.mockRejectedValue(new AIBudgetExceededError());

    await expect(runApexGeneration({ targetDifficulty: 5 })).rejects.toMatchObject({
      code: "AI_BUDGET_EXCEEDED",
    });
    expect(runPuzzleAgentGeneration).toHaveBeenCalledTimes(1);
  });

  it("fails closed before any model call when answer seeds cannot cover the tournament", async () => {
    buildGenerationBrief.mockResolvedValue({
      targetDifficulty: 5,
      tierLabel: "Medium",
      qualityThreshold: 74,
      minRubricOverall: 78,
      candidateCount: 2,
      preferredTechniques: ["simple_compound"],
      avoidTechniques: [],
      phraseSuggestions: [],
      diversity: { bannedAnswerKeys: [] },
      briefSummary: "test",
    });

    await expect(runApexGeneration({ targetDifficulty: 5 })).rejects.toMatchObject({
      code: "APEX_ANSWER_FIRST_SEED_UNAVAILABLE",
      requestedCount: 2,
      selectedCount: 0,
    });
    expect(runPuzzleAgentGeneration).not.toHaveBeenCalled();
  });

  it("runs at most one model-backed critique repair while preserving the original answer", async () => {
    buildGenerationBrief.mockResolvedValue({
      targetDifficulty: 5,
      tierLabel: "Hard",
      qualityThreshold: 74,
      minRubricOverall: 78,
      candidateCount: 2,
      preferredTechniques: ["simple_compound"],
      avoidTechniques: [],
      phraseSuggestions: [
        {
          answer: "moonlight",
          category: "compound",
          difficultyHint: 5,
          techniqueAffinity: ["simple_compound"],
          visualCues: [{ kind: "catalog", concept: "moon", role: "word-part" }],
        },
        {
          answer: "under the weather",
          category: "positional",
          difficultyHint: 6,
          techniqueAffinity: ["simple_compound"],
          visualCues: [{ kind: "text", content: "UNDER", role: "structural-anchor" }],
        },
      ],
      diversity: { bannedAnswerKeys: [] },
      briefSummary: "test",
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
    runPuzzleAgentGeneration
      .mockResolvedValueOnce(puzzleResult("top"))
      .mockResolvedValueOnce(puzzleResult("runner"))
      .mockResolvedValueOnce(puzzleResult("repaired"));
    critiqueCandidate
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        source: "model",
        verdict: "ship",
        summary: "Clear repair",
        strengths: ["Concrete"],
        flaws: [],
        reviseInstructions: [],
        falseLeadQuality: 85,
        ahaPredicted: 86,
        creativityScore: 82,
        iconRecognizability: 90,
        overusedTrope: false,
      });
    qualifyRenderedCandidate.mockImplementation(async (value: unknown) => value);

    const result = await runApexGeneration({ targetDifficulty: 5 });

    expect(result.status).toBe("success");
    expect(result.puzzle.answer).toBe("repaired");
    expect(runPuzzleAgentGeneration).toHaveBeenCalledTimes(3);
    expect(runPuzzleAgentGeneration.mock.calls[2][0]).toMatchObject({
      maxAttempts: 1,
      modelChainLimit: 1,
      repairMode: "critique-locked",
      revisionInstructions: ["Replace the abstract icon with a concrete silhouette"],
      answerSeed: "top",
      answerSeedCuePlan: [
        { kind: "catalog", concept: "key", role: "word-part" },
        { kind: "text", content: "BOARD", role: "word-part" },
      ],
      phraseSeeds: [],
      bannedAnswerKeys: [],
      candidateIndex: undefined,
      candidateCount: undefined,
    });
    expect(critiqueCandidate).toHaveBeenCalledTimes(2);
    expect(qualifyRenderedCandidate).toHaveBeenCalledTimes(1);
  });
});
