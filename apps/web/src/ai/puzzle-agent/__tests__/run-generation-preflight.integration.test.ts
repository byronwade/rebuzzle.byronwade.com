/**
 * Host-path integration: cue-plan preflight must fail closed before ToolLoop spend,
 * and successful preflight must seed the prompt + authoritative board fallback.
 */

const generate = jest.fn();
const ToolLoopAgent = jest.fn();
const preflightComposeAnswerSeedCuePlan = jest.fn();
const ensureGatewayKey = jest.fn();
const assertGatewayAuthConfigured = jest.fn();
const enforceQuota = jest.fn(async () => undefined);

jest.mock("ai", () => ({
  Output: { object: jest.fn(() => ({})) },
  ToolLoopAgent: jest.fn().mockImplementation(function MockToolLoopAgent(
    this: unknown,
    options: unknown
  ) {
    ToolLoopAgent(options);
    return {
      generate: (...args: unknown[]) => generate(options, ...args),
    };
  }),
  stepCountIs: jest.fn(() => () => false),
}));
jest.mock("../../client", () => ({
  assertGatewayAuthConfigured: (...args: unknown[]) => assertGatewayAuthConfigured(...args),
  ensureGatewayKey: (...args: unknown[]) => ensureGatewayKey(...args),
  getAiGateway: jest.fn(() => jest.fn(() => "mock-model")),
  getGatewayModelChain: jest.fn(() => []),
}));
jest.mock("../../config", () => ({
  AI_CONFIG: {
    puzzleAgent: {
      model: "test/model",
      qualityThreshold: 74,
      minFunScore: 68,
      maxAttempts: 1,
      maxSteps: 8,
    },
    generation: { temperature: { creative: 0.7 }, maxTokens: { blog: 1000 } },
    timeouts: { agent: 1000 },
  },
}));
jest.mock("../../errors", () => ({
  isHardAIBudgetError: jest.fn(() => false),
  parseAIError: jest.fn((error) => error),
}));
jest.mock("../../quota-manager", () => ({
  enforceQuota: (...args: unknown[]) => enforceQuota(...args),
}));
jest.mock("../authoritative-draft", () => ({
  applyAuthoritativeComposition: jest.fn((puzzle, composition) => ({
    ...puzzle,
    rebusPuzzle: composition.visual.unicodeFallback,
    visual: composition.visual,
  })),
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
  evaluatePublishGates: jest.fn(() => ({
    ok: true,
    reasons: [],
    scores: { overall: 90, fun: 80 },
  })),
  normalizeAnswerKey: (answer: string) => answer.toLowerCase().replace(/[^a-z0-9]/g, ""),
}));
jest.mock("../schemas", () => ({
  normalizePuzzleAgentDraft: jest.fn((output) => output),
  PuzzleAgentDraftSchema: {},
}));
jest.mock("../tool-impl", () => ({
  calibratePuzzleDifficulty: jest.fn(async () => ({
    calibratedDifficulty: 5,
    inBand: true,
    difficultyLevel: "Hard",
  })),
  checkUniqueness: jest.fn(async () => ({ isUnique: true, uniquenessScore: 90 })),
  fingerprintCandidate: jest.fn(() => "fingerprint"),
  scorePuzzleQuality: jest.fn(async () => ({
    scores: { overall: 90, fun: 80 },
    analysis: { strengths: [], weaknesses: [], improvements: [], verdict: "good" },
    detailedFeedback: "ok",
  })),
  stressTestSolvability: jest.fn(() => ({ solvable: true, reasons: [] })),
}));
jest.mock("../tools", () => ({ puzzleAgentTools: { compose_puzzle_visual: {} } }));
jest.mock("../apex/cue-plan-preflight", () => ({
  preflightComposeAnswerSeedCuePlan: (...args: unknown[]) =>
    preflightComposeAnswerSeedCuePlan(...args),
}));
jest.mock("../visual/composition", () => ({
  PuzzleVisualSchema: { safeParse: jest.fn((visual) => ({ success: true, data: visual })) },
}));
jest.mock("../visual/critique-board", () => ({
  recognizePuzzleBoard: jest.fn(async () => ({ ok: true, confidence: 0.9 })),
}));
jest.mock("../visual/publication-assets", () => ({
  verifyPublicationAssets: jest.fn(async () => ({ ok: true })),
}));
jest.mock("../semantic-alignment", () => ({
  evaluateSemanticAlignment: jest.fn(() => ({
    ok: true,
    rule: "ok",
    blockers: [],
    warnings: [],
    score: 1,
  })),
}));
jest.mock("../apex/player-sim", () => ({
  applyPlayerSimHeuristics: jest.fn((sim) => sim),
  playerSimPublishBlockers: jest.fn(() => []),
  simulatePlayerSolve: jest.fn(async () => ({
    firstWrongParses: [],
    likelySolvePath: "ok",
    hintUnlockOrderLooksFair: true,
    unfairReasons: [],
    estimatedSolveRate: 0.5,
    confidence: 0.9,
  })),
}));
jest.mock("../apex/blind-solve-consensus", () => ({
  toPlayabilityEvidence: jest.fn(() => undefined),
}));

import { runPuzzleAgentGeneration } from "../run-generation";

const cuePlan = [
  { kind: "catalog" as const, concept: "key", role: "word-part" as const },
  { kind: "text" as const, content: "BOARD", role: "word-part" as const },
];

const preflightVisual = {
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
};

describe("runPuzzleAgentGeneration cue-plan preflight integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    preflightComposeAnswerSeedCuePlan.mockResolvedValue({
      ok: true,
      stage: "cue-presence",
      issues: [],
      inspection: { ready: true, issues: [], missingOnBoard: [], layerPlan: [], plan: "" },
      composition: { issues: [], visual: preflightVisual },
    });
    generate.mockImplementation(async (_options: unknown, request?: { prompt?: string }) => {
      // Model returns a draft but never calls compose — host preflight board must still win.
      return {
        output: {
          puzzle: {
            rebusPuzzle: "ignored",
            answer: "keyboard",
            difficulty: 5,
            difficultyLevel: "Hard",
            explanation: "key + board",
            category: "compound",
            hints: ["compound", "objects", "starts with K"],
            techniqueId: "simple_compound",
            visual: preflightVisual,
          },
        },
        prompt: request?.prompt,
      };
    });
  });

  it("rejects invalid catalog cues before preflight or invent spend", async () => {
    await expect(
      runPuzzleAgentGeneration({
        targetDifficulty: 5,
        answerSeed: "mystery box",
        answerSeedCuePlan: [{ kind: "catalog", concept: "box", role: "word-part" }],
        maxAttempts: 1,
        modelChainLimit: 1,
      })
    ).rejects.toThrow(/Invalid answer-seed cue contract/i);

    expect(preflightComposeAnswerSeedCuePlan).not.toHaveBeenCalled();
    expect(ToolLoopAgent).not.toHaveBeenCalled();
    expect(ensureGatewayKey).not.toHaveBeenCalled();
  });

  it("fails closed before gateway/ToolLoop when cue-plan preflight rejects", async () => {
    // Cue plan must pass catalog validation first — then host preflight rejects composition.
    preflightComposeAnswerSeedCuePlan.mockResolvedValue({
      ok: false,
      stage: "composition",
      issues: ["Cue-plan composition produced an empty board"],
      inspection: {
        ready: false,
        issues: ["composition failed"],
        missingOnBoard: [],
        layerPlan: [],
        plan: "",
      },
      composition: null,
    });

    await expect(
      runPuzzleAgentGeneration({
        targetDifficulty: 5,
        answerSeed: "keyboard",
        answerSeedCuePlan: cuePlan,
        maxAttempts: 1,
        modelChainLimit: 1,
      })
    ).rejects.toThrow(/Cue-plan preflight failed/i);

    expect(preflightComposeAnswerSeedCuePlan).toHaveBeenCalled();
    expect(ToolLoopAgent).not.toHaveBeenCalled();
    expect(ensureGatewayKey).not.toHaveBeenCalled();
    expect(enforceQuota).not.toHaveBeenCalled();
  });

  it("injects host preflight layers into the invent prompt and uses them as board fallback", async () => {
    const result = await runPuzzleAgentGeneration({
      targetDifficulty: 5,
      answerSeed: "keyboard",
      answerSeedCuePlan: cuePlan,
      preferredTechniques: ["simple_compound"],
      maxAttempts: 1,
      modelChainLimit: 1,
      deferRenderedEvaluation: true,
    });

    expect(preflightComposeAnswerSeedCuePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: "keyboard",
        cues: cuePlan,
      })
    );
    expect(ToolLoopAgent).toHaveBeenCalled();
    const generateArgs = generate.mock.calls[0]?.[1] as { prompt: string };
    expect(generateArgs?.prompt).toMatch(/HOST CUE-PLAN PREFLIGHT/i);
    expect(generateArgs?.prompt).toMatch(/pictogram:key/);
    expect(generateArgs?.prompt).toMatch(/text:BOARD/);
    expect(result.puzzle.answer).toBe("keyboard");
    expect(result.puzzle.visual.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "pictogram", concept: "key" }),
        expect.objectContaining({ kind: "text", content: "BOARD" }),
      ])
    );
  });

  it("still rejects when the model board omits a mandatory cue after preflight", async () => {
    generate.mockImplementation(
      async (options: {
        onToolExecutionEnd?: (event: {
          toolCall: { toolName: string; input: { answer?: string } };
          toolOutput: { type: string; output: { visual: unknown } };
        }) => void;
      }) => {
        options.onToolExecutionEnd?.({
          toolCall: {
            toolName: "compose_puzzle_visual",
            input: { answer: "keyboard" },
          },
          toolOutput: {
            type: "tool-result",
            output: {
              visual: {
                styleId: "ink-pictogram-v1",
                mode: "composed",
                layout: "row",
                unicodeFallback: "🔑",
                layers: [
                  {
                    kind: "pictogram",
                    concept: "key",
                    emojiFallback: "🔑",
                    svg: "<svg />",
                    source: "catalog",
                  },
                ],
              },
            },
          },
        });
        return {
          output: {
            puzzle: {
              rebusPuzzle: "🔑",
              answer: "keyboard",
              difficulty: 5,
              difficultyLevel: "Hard",
              explanation: "key",
              category: "compound",
              hints: ["a", "b", "c"],
              techniqueId: "simple_compound",
              visual: preflightVisual,
            },
          },
        };
      }
    );

    await expect(
      runPuzzleAgentGeneration({
        targetDifficulty: 5,
        answerSeed: "keyboard",
        answerSeedCuePlan: cuePlan,
        maxAttempts: 1,
        modelChainLimit: 1,
      })
    ).rejects.toThrow(/Answer-first visual cue contract failed|Missing text cue BOARD/i);
  });
});
