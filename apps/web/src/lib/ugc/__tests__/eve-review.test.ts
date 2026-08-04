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
  it("emits manifest, thinking, checks, and ships a fair board", async () => {
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
    expect(result.ok).toBe(true);
    expect(result.verdict).toBe("ship");
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
