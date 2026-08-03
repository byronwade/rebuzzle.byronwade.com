const generate = jest.fn();
const verifyPublicationAssets = jest.fn();
const checkUniqueness = jest.fn();
const calibratePuzzleDifficulty = jest.fn();
const stressTestSolvability = jest.fn();
const scorePuzzleQuality = jest.fn();
const evaluatePublishGates = jest.fn();

jest.mock("ai", () => ({
  Output: { object: jest.fn(() => ({})) },
  ToolLoopAgent: jest.fn().mockImplementation((options) => ({
    generate: (...args: unknown[]) => generate(options, ...args),
  })),
  stepCountIs: jest.fn(() => () => false),
}));
jest.mock("../../client", () => ({
  assertGatewayAuthConfigured: jest.fn(),
  ensureGatewayKey: jest.fn(),
  getAiGateway: jest.fn(() => jest.fn(() => "mock-model")),
  getGatewayModelChain: jest.fn(() => []),
}));
jest.mock("../../config", () => ({
  AI_CONFIG: {
    puzzleAgent: { qualityThreshold: 74, minFunScore: 68, maxAttempts: 1, maxSteps: 8 },
    generation: { temperature: { creative: 0.7 }, maxTokens: { blog: 1000 } },
    timeouts: { agent: 1000 },
  },
}));
jest.mock("../../errors", () => ({
  isHardAIBudgetError: jest.fn(() => false),
  parseAIError: jest.fn((error) => error),
}));
jest.mock("../../quota-manager", () => ({ enforceQuota: jest.fn(async () => undefined) }));
jest.mock("../authoritative-draft", () => ({
  applyAuthoritativeComposition: jest.fn((puzzle) => puzzle),
}));
jest.mock("../difficulty-levels", () => ({
  getDifficultyLevelForScore: jest.fn(() => ({
    label: "Hard",
    min: 4,
    max: 6,
    target: 5,
    techniques: ["simple_compound"],
    componentBudget: { min: 1, max: 4 },
  })),
}));
jest.mock("../quality", () => ({
  evaluatePublishGates,
  normalizeAnswerKey: (answer: string) => answer.toLowerCase().replace(/[^a-z0-9]/g, ""),
}));
jest.mock("../schemas", () => ({
  normalizePuzzleAgentDraft: jest.fn((output) => output),
  PuzzleAgentDraftSchema: {},
}));
jest.mock("../tool-impl", () => ({
  calibratePuzzleDifficulty,
  checkUniqueness,
  fingerprintCandidate: jest.fn(() => "fingerprint"),
  scorePuzzleQuality,
  stressTestSolvability,
}));
jest.mock("../tools", () => ({ puzzleAgentTools: {} }));
jest.mock("../apex/cue-plan-preflight", () => ({
  preflightComposeAnswerSeedCuePlan: jest.fn(async ({ answer }: { answer: string }) => ({
    ok: true,
    stage: "cue-presence",
    issues: [],
    inspection: { ready: true, issues: [], missingOnBoard: [], layerPlan: [], plan: "" },
    composition: {
      issues: [],
      visual: {
        styleId: "ink-pictogram-v1",
        mode: "composed",
        layout: "row",
        unicodeFallback: "🔑 BOARD",
        layers: [
          {
            kind: "pictogram",
            concept: "key",
            emojiFallback: "🔑",
            svg: "<svg />",
            source: "catalog",
          },
          { kind: "text", content: "BOARD", emphasis: "normal" },
        ],
      },
      // answer echoed for host fallback capture
      answer,
    },
  })),
}));
jest.mock("../visual/composition", () => ({
  PuzzleVisualSchema: { safeParse: jest.fn((visual) => ({ success: true, data: visual })) },
}));
jest.mock("../visual/critique-board", () => ({ recognizePuzzleBoard: jest.fn() }));
jest.mock("../visual/publication-assets", () => ({ verifyPublicationAssets }));

import { PuzzleCandidateRejectedError, runPuzzleAgentGeneration } from "../run-generation";

const visual = {
  styleId: "ink-pictogram-v1",
  mode: "composed",
  layout: "row",
  unicodeFallback: "🔑 + BOARD",
  layers: [
    {
      kind: "pictogram",
      concept: "key",
      emojiFallback: "🔑",
      svg: "<svg />",
      source: "generated",
    },
  ],
};

const draft = {
  puzzle: {
    rebusPuzzle: "🔑 + BOARD",
    answer: "keyboard",
    difficulty: 5,
    difficultyLevel: "Hard",
    explanation: "A key plus board forms the compound answer.",
    category: "phrases",
    hints: ["Think of a compound word.", "The first part is a key.", "It starts with K."],
    techniqueId: "simple_compound",
    visual,
  },
};

describe("runPuzzleAgentGeneration asset gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generate.mockImplementation(
      async (options: { onToolExecutionEnd?: (event: unknown) => void }) => {
        options.onToolExecutionEnd?.({
          toolCall: { toolName: "compose_puzzle_visual", input: { answer: "keyboard" } },
          toolOutput: { type: "tool-result", output: { visual } },
        });
        return { output: draft };
      }
    );
    verifyPublicationAssets.mockResolvedValue({
      ok: false,
      reason: 'Pictogram "key" is not catalog-backed or human-approved',
    });
  });

  it("rejects unapproved artwork before expensive novelty and scoring work", async () => {
    await expect(
      runPuzzleAgentGeneration({ targetDifficulty: 5, maxAttempts: 1, modelChainLimit: 1 })
    ).rejects.toBeInstanceOf(PuzzleCandidateRejectedError);

    expect(verifyPublicationAssets).toHaveBeenCalledTimes(1);
    expect(checkUniqueness).not.toHaveBeenCalled();
    expect(calibratePuzzleDifficulty).not.toHaveBeenCalled();
    expect(stressTestSolvability).not.toHaveBeenCalled();
    expect(scorePuzzleQuality).not.toHaveBeenCalled();
    expect(evaluatePublishGates).not.toHaveBeenCalled();
  });

  it("rejects a semantically mismatched board after asset approval but before judges", async () => {
    verifyPublicationAssets.mockResolvedValue({ ok: true });

    await expect(
      runPuzzleAgentGeneration({ targetDifficulty: 5, maxAttempts: 1, modelChainLimit: 1 })
    ).rejects.toBeInstanceOf(PuzzleCandidateRejectedError);

    expect(verifyPublicationAssets).toHaveBeenCalledTimes(1);
    expect(checkUniqueness).not.toHaveBeenCalled();
    expect(calibratePuzzleDifficulty).not.toHaveBeenCalled();
    expect(stressTestSolvability).not.toHaveBeenCalled();
    expect(scorePuzzleQuality).not.toHaveBeenCalled();
    expect(evaluatePublishGates).not.toHaveBeenCalled();
  });

  it("rejects an answer that violates the Apex answer-first contract before asset checks", async () => {
    await expect(
      runPuzzleAgentGeneration({
        targetDifficulty: 5,
        maxAttempts: 1,
        modelChainLimit: 1,
        answerSeed: "car",
      })
    ).rejects.toBeInstanceOf(PuzzleCandidateRejectedError);

    expect(verifyPublicationAssets).not.toHaveBeenCalled();
    expect(checkUniqueness).not.toHaveBeenCalled();
    expect(evaluatePublishGates).not.toHaveBeenCalled();
  });

  it("rejects an authoritative board that omits a required seed cue before asset checks", async () => {
    await expect(
      runPuzzleAgentGeneration({
        targetDifficulty: 5,
        maxAttempts: 1,
        modelChainLimit: 1,
        answerSeed: "keyboard",
        answerSeedCuePlan: [
          { kind: "catalog", concept: "key", role: "word-part" },
          { kind: "text", content: "BOARD", role: "word-part" },
        ],
      })
    ).rejects.toBeInstanceOf(PuzzleCandidateRejectedError);

    expect(verifyPublicationAssets).not.toHaveBeenCalled();
    expect(checkUniqueness).not.toHaveBeenCalled();
    expect(evaluatePublishGates).not.toHaveBeenCalled();
  });
});
