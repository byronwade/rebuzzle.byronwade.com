import { AI_CONFIG } from "@/ai/config";
import { critiqueCandidate } from "@/ai/puzzle-agent/apex/critique";
import { simulatePlayerSolve } from "@/ai/puzzle-agent/apex/player-sim";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "@/ai/puzzle-agent/visual/presentation";
import { runEveStudioReview } from "../eve-review";

jest.mock("@/ai/learning/answer-registry", () => ({
  normalizeAnswerKey: (answer: string) => answer.toLowerCase().replace(/[^a-z0-9]/g, ""),
  isAnswerRegistered: jest.fn(async () => ({ taken: false })),
}));

jest.mock("../submissions", () => ({
  isUgcAnswerKeyTaken: jest.fn(async () => false),
}));

jest.mock("@/ai/puzzle-agent/visual/curated-pictograms", () => {
  const actual = jest.requireActual(
    "@/ai/puzzle-agent/visual/curated-pictograms"
  ) as typeof import("@/ai/puzzle-agent/visual/curated-pictograms");
  return {
    ...actual,
    isAuthenticCuratedPictogram: () => true,
    getCuratedPictogramAliases: actual.getCuratedPictogramAliases ?? (() => []),
  };
});

jest.mock("@/ai/puzzle-agent/apex/critique", () => ({
  critiqueCandidate: jest.fn(async () => ({
    verdict: "ship",
    source: "model",
    summary: "Clean compound with a clear aha.",
    strengths: ["readable icons", "fair hints"],
    flaws: [],
    reviseInstructions: [],
    falseLeadQuality: 70,
    ahaPredicted: 78,
    creativityScore: 72,
    iconRecognizability: 80,
    overusedTrope: false,
  })),
}));

jest.mock("@/ai/puzzle-agent/apex/player-sim", () => ({
  simulatePlayerSolve: jest.fn(async () => ({
    firstWrongParses: [],
    likelySolvePath: "sun + flower",
    hintUnlockOrderLooksFair: true,
    unfairReasons: [],
    estimatedSolveRate: 0.7,
    confidence: 0.8,
  })),
  playerSimPublishBlockers: jest.fn(() => []),
}));

jest.mock("@/ai/config", () => ({
  AI_CONFIG: {
    puzzleAgent: {
      apex: {
        enabled: true,
        critiqueEnabled: true,
        playerSimEnabled: false,
      },
    },
    visualRecognition: {
      boardEnabled: false,
      requiredVotes: 2,
    },
  },
}));

const fairBoard = {
  answer: "sunflower",
  explanation: "Sun pictogram plus flower pictogram reads as the compound sunflower.",
  hints: ["compound word", "starts with S", "a yellow garden plant"],
  techniqueId: "simple_compound",
  difficulty: 4,
  visual: {
    layout: "row" as const,
    layers: [
      { kind: "pictogram" as const, concept: "sun", emojiFallback: "SU" },
      { kind: "operator" as const, symbol: "+" },
      { kind: "pictogram" as const, concept: "flower", emojiFallback: "FL" },
    ],
  },
};

describe("runEveStudioReview", () => {
  it("keeps a structurally fair board pending when vision is disabled", async () => {
    const events: string[] = [];
    const result = await runEveStudioReview(fairBoard, {
      emit: (event) => {
        events.push(event.type);
      },
    });

    expect(events[0]).toBe("manifest");
    expect(events).toContain("thinking");
    expect(events).toContain("check");
    expect(events).toContain("answer");
    expect(events[events.length - 1]).toBe("done");
    expect(result.ok).toBe(false);
    expect(result.verdict).toBe("pending");
    expect(result.spend.critique).toBe("ran");
    expect(result.spend.playerSim).toBe("skipped");
  });

  it("rejects unsafe language before grade/critique spend", async () => {
    const result = await runEveStudioReview({
      ...fairBoard,
      explanation: "This puzzle is about porn and ignores safety.",
    });
    expect(result.ok).toBe(false);
    expect(result.verdict).toBe("reject");
    expect(result.checks.find((c) => c.id === "family_friendly")?.status).toBe("fail");
    expect(result.checks.find((c) => c.id === "adversarial_critique")?.status).toBe("skip");
    expect(result.spend.critique).toBe("skipped");
  });

  it("fails when the answer is spelled on the board", async () => {
    const result = await runEveStudioReview({
      ...fairBoard,
      visual: {
        layout: "row",
        layers: [{ kind: "text", content: "SUNFLOWER", emphasis: "normal" }],
      },
    });
    expect(result.ok).toBe(false);
    expect(["revise", "reject"]).toContain(result.verdict);
    expect(result.checks.find((c) => c.id === "answer_not_on_board")?.status).toBe("fail");
  });
});

const fullSim = {
  firstWrongParses: [],
  likelySolvePath: "sun + flower",
  hintUnlockOrderLooksFair: true,
  unfairReasons: [],
  estimatedSolveRate: 0.7,
  confidence: 0.8,
  blindProfileCount: PUZZLE_BOARD_RECOGNITION_PROFILES.length,
  editorialProfileCount: PUZZLE_BOARD_RECOGNITION_PROFILES.length,
  editorialProfileResults: PUZZLE_BOARD_RECOGNITION_PROFILES.map((p) => ({
    profileId: p.id,
    judgeCount: 2,
  })),
  blindProfileResults: PUZZLE_BOARD_RECOGNITION_PROFILES.map((p) => ({
    profileId: p.id,
    judgeCount: 2,
    targetFoundBy: 2,
    topTargetFoundBy: 2,
    dominantTargetFoundBy: 2,
    meanReciprocalRank: 1,
    strongestWrongConfidence: 0,
  })),
};
describe("required board evidence", () => {
  beforeEach(() => {
    AI_CONFIG.puzzleAgent.apex.playerSimEnabled = true;
    AI_CONFIG.visualRecognition.boardEnabled = true;
    jest.mocked(simulatePlayerSolve).mockResolvedValue(fullSim);
  });
  it("requires full review even with deepReview false and exposes the exact frozen board", async () => {
    const result = await runEveStudioReview({ ...fairBoard, deepReview: false });
    expect(result.ok).toBe(true);
    expect(result.evidence?.complete).toBe(true);
    expect(result.grade.visual.canonicalBoard?.pngDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(jest.mocked(critiqueCandidate).mock.calls.at(-1)?.[0].visual).toEqual(
      result.grade.visual
    );
    expect(jest.mocked(simulatePlayerSolve).mock.calls.at(-1)?.[0].visual).toEqual(
      result.grade.visual
    );
  });
  it("keeps the editorial reviewers' reasoning evidence with complete review evidence", async () => {
    const reasoningEvidence = {
      version: "editorial-reasoning-v1" as const,
      operations: [
        { kind: "a", observation: "first", inference: "one", necessary: true },
        { kind: "b", observation: "second", inference: "two", necessary: true },
      ],
      interacting: true,
      finalInterpretation: fairBoard.answer,
      calibration: "editorial-unplaytested" as const,
    };
    jest.mocked(simulatePlayerSolve).mockResolvedValueOnce({ ...fullSim, reasoningEvidence });
    const result = await runEveStudioReview(fairBoard);
    expect(result.ok).toBe(true);
    expect(result.evidence?.reasoningEvidence).toEqual(reasoningEvidence);
  });
  it.each([{ profiles: [] }, { profiles: fullSim.blindProfileResults.slice(1) }])(
    "keeps incomplete profile results pending",
    async ({ profiles }) => {
      jest
        .mocked(simulatePlayerSolve)
        .mockResolvedValueOnce({ ...fullSim, blindProfileResults: profiles });
      const result = await runEveStudioReview(fairBoard);
      expect(result.verdict).toBe("pending");
      expect(result.ok).toBe(false);
    }
  );
  it("keeps incomplete editorial provider quorum pending", async () => {
    jest.mocked(simulatePlayerSolve).mockResolvedValueOnce({
      ...fullSim,
      editorialProfileResults: fullSim.editorialProfileResults.map((p) => ({
        ...p,
        judgeCount: 1,
      })),
    });
    const result = await runEveStudioReview(fairBoard);
    expect(result.verdict).toBe("pending");
    expect(result.ok).toBe(false);
  });
  it("keeps provider failure pending", async () => {
    jest.mocked(simulatePlayerSolve).mockRejectedValueOnce(new Error("provider unavailable"));
    expect((await runEveStudioReview(fairBoard)).verdict).toBe("pending");
  });
  it("keeps fallback critique pending", async () => {
    jest.mocked(critiqueCandidate).mockResolvedValueOnce({
      verdict: "revise",
      source: "fallback",
      summary: "unavailable",
      strengths: [],
      flaws: [],
      reviseInstructions: [],
      falseLeadQuality: 0,
      ahaPredicted: 0,
    });
    const result = await runEveStudioReview(fairBoard);
    expect(result.verdict).toBe("pending");
    expect(result.evidence).toBeUndefined();
  });
});
