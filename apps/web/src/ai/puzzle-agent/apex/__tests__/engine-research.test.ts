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
const screenAnswerSeedsWithResearch = jest.fn();
jest.mock("../answer-research", () => ({ screenAnswerSeedsWithResearch }));
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

const stored = {
  version: 1 as const,
  answer: "moonlight",
  status: "researched" as const,
  verdict: "use" as const,
  verdictReasons: [],
  familiarity: "everyday" as const,
  meaning: "Light from the moon.",
  variants: ["moon light"],
  facts: [
    {
      statement: "Light from the moon.",
      kind: "meaning",
      support: "verified" as const,
      sourceIds: ["S1"],
    },
  ],
  sources: [
    {
      id: "S1",
      url: "https://www.merriam-webster.com/dictionary/moonlight",
      title: "Moonlight",
      domain: "merriam-webster.com",
      tier: "reference" as const,
    },
  ],
  researchedAt: "2026-10-25T00:00:00.000Z",
};

const seedEntry = (answer: string) => ({
  answer,
  category: "compound",
  difficultyHint: 5,
  techniqueAffinity: ["simple_compound"],
  visualCues: [{ kind: "catalog", concept: "moon", role: "word-part" }],
});

function brief(candidateCount: number) {
  return {
    targetDifficulty: 5,
    tierLabel: "Hard",
    qualityThreshold: 74,
    minRubricOverall: 78,
    candidateCount,
    preferredTechniques: ["simple_compound"],
    avoidTechniques: [],
    phraseSuggestions: [seedEntry("moonlight"), seedEntry("keyboard")],
    diversity: { bannedAnswerKeys: [] },
    briefSummary: "test",
    techniqueRates: [],
    answerEloByKey: new Map(),
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
  };
}

const shipCritique = {
  source: "model",
  verdict: "ship",
  summary: "Clear",
  strengths: [],
  flaws: [],
  reviseInstructions: [],
  falseLeadQuality: 85,
  ahaPredicted: 86,
  creativityScore: 82,
  iconRecognizability: 90,
  overusedTrope: false,
};

describe("Apex research wiring", () => {
  it("hands the research brief to generation and critique and persists it", async () => {
    buildGenerationBrief.mockResolvedValue(brief(2));
    screenAnswerSeedsWithResearch.mockResolvedValue({
      seeds: [
        { entry: seedEntry("moonlight"), research: stored, brief: "RESEARCH BRIEF moonlight" },
      ],
      rejected: [{ answer: "keystone", reasons: ["obscure"] }],
      researched: 2,
      inventoryShort: false,
    });
    runPuzzleAgentGeneration.mockResolvedValueOnce(puzzleResult("moonlight"));
    critiqueCandidate.mockResolvedValue(shipCritique);
    qualifyRenderedCandidate.mockImplementation(async (value: unknown) => value);

    const result = await runApexGeneration({ targetDifficulty: 5 });

    // The research-shortened tournament runs one slot instead of failing.
    expect(runPuzzleAgentGeneration).toHaveBeenCalledTimes(1);
    expect(runPuzzleAgentGeneration.mock.calls[0][0]).toMatchObject({
      answerSeed: "moonlight",
      answerResearch: "RESEARCH BRIEF moonlight",
      candidateCount: 1,
    });
    expect(critiqueCandidate.mock.calls[0][0]).toMatchObject({
      answerResearch: "RESEARCH BRIEF moonlight",
    });
    expect(result.metadata.answerResearch).toEqual(stored);
    expect(result.metadata.thinkingSummary).toContain("research use (1 sources)");
  });

  it("still fails closed when the phrase inventory is short", async () => {
    buildGenerationBrief.mockResolvedValue(brief(2));
    screenAnswerSeedsWithResearch.mockResolvedValue({
      seeds: [{ entry: seedEntry("moonlight") }],
      rejected: [],
      researched: 0,
      inventoryShort: true,
    });

    await expect(runApexGeneration({ targetDifficulty: 5 })).rejects.toMatchObject({
      code: "APEX_ANSWER_FIRST_SEED_UNAVAILABLE",
    });
    expect(runPuzzleAgentGeneration).not.toHaveBeenCalled();
  });
});
