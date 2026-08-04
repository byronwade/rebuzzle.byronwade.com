/**
 * Progressive-hint vision wiring inside simulatePlayerSolve:
 * spend only after blind dominance fails; honor skip flag; block unlock misses.
 */

const generateAIObjectFromImage = jest.fn();
const renderPuzzleVisualProfiles = jest.fn();
const runPuzzleEditorialTournament = jest.fn();

jest.mock("../../../client", () => ({
  generateAIObjectFromImage: (...args: unknown[]) => generateAIObjectFromImage(...args),
}));
jest.mock("../../../config", () => ({
  AI_CONFIG: {
    visualRecognition: {
      models: ["judge-a", "judge-b"],
      minConfidence: 0.68,
      requiredVotes: 2,
      boardEnabled: true,
    },
  },
}));
jest.mock("../../visual/render-board", () => ({
  renderPuzzleVisualProfiles: (...args: unknown[]) => renderPuzzleVisualProfiles(...args),
}));
jest.mock("../../visual/editorial-review", () => ({
  runPuzzleEditorialTournament: (...args: unknown[]) => runPuzzleEditorialTournament(...args),
}));
jest.mock("../../visual/editorial-consensus", () => ({
  editorialReviewPublishBlockers: jest.fn(() => []),
  summarizeEditorialReviewAttempts: jest.fn(() => ({
    profileCount: 0,
    acceptedProfiles: 0,
    confidence: 1,
    failureKinds: [],
    reasons: [],
  })),
}));

import { playerSimPublishBlockers, simulatePlayerSolve } from "../player-sim";

const visual = {
  styleId: "ink-pictogram-v1" as const,
  mode: "composed" as const,
  layout: "row" as const,
  unicodeFallback: "🔑 BOARD",
  layers: [
    {
      kind: "pictogram" as const,
      concept: "key",
      emojiFallback: "🔑",
      svg: "<svg />",
      source: "catalog" as const,
    },
    { kind: "text" as const, content: "BOARD", emphasis: "normal" as const },
  ],
};

function visionResult(answer: string, confidence = 0.9) {
  return {
    visibleElements: ["key", "BOARD"],
    relationships: ["side by side"],
    hypotheses: [
      { answer, confidence, rationale: "from board" },
      { answer: "decoy", confidence: Math.max(0.1, confidence - 0.4), rationale: "noise" },
    ],
    confidence,
  };
}

describe("simulatePlayerSolve progressive-hint integration", () => {
  const prevSkip = process.env.REBUZZLE_SKIP_HINTED_VISION;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REBUZZLE_SKIP_HINTED_VISION;
    renderPuzzleVisualProfiles.mockResolvedValue([
      {
        profileId: "compact-320",
        viewportWidth: 320,
        tileSize: 44,
        pixels: new Uint8Array([1]),
      },
      {
        profileId: "mobile-375",
        viewportWidth: 375,
        tileSize: 72,
        pixels: new Uint8Array([2]),
      },
      {
        profileId: "desktop-768",
        viewportWidth: 768,
        tileSize: 72,
        pixels: new Uint8Array([3]),
      },
    ]);
    runPuzzleEditorialTournament.mockResolvedValue([]);
  });

  afterAll(() => {
    if (prevSkip === undefined) delete process.env.REBUZZLE_SKIP_HINTED_VISION;
    else process.env.REBUZZLE_SKIP_HINTED_VISION = prevSkip;
  });

  it("does not spend hinted vision when blind dominance already passes", async () => {
    generateAIObjectFromImage.mockImplementation(async () => visionResult("keyboard", 0.95));

    const result = await simulatePlayerSolve({
      rebusPuzzle: "🔑 BOARD",
      answer: "keyboard",
      explanation: "key + board",
      hints: ["compound word", "starts with K", "keyboard"],
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual,
    });

    const hintedCalls = generateAIObjectFromImage.mock.calls.filter(
      (call) => (call[0] as { operation?: string }).operation === "vision-hinted-solve"
    );
    expect(hintedCalls).toHaveLength(0);
    expect(result.hintedAttempted).toBe(false);
    expect(result.blindProfilesWithDominantTarget).toBeGreaterThanOrEqual(2);
  });

  it("spends hinted vision after blind failure and blocks unlock misses", async () => {
    generateAIObjectFromImage.mockImplementation(async (args: { operation?: string }) => {
      if (args.operation === "vision-hinted-solve") {
        return visionResult("lockboard", 0.85);
      }
      return visionResult("lockboard", 0.9);
    });

    const result = await simulatePlayerSolve({
      rebusPuzzle: "🔑 BOARD",
      answer: "keyboard",
      explanation: "key + board",
      hints: ["compound word", "starts with K", "keyboard"],
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual,
    });

    const hintedCalls = generateAIObjectFromImage.mock.calls.filter(
      (call) => (call[0] as { operation?: string }).operation === "vision-hinted-solve"
    );
    expect(hintedCalls.length).toBeGreaterThan(0);
    const hintedSystem = String(
      (hintedCalls[0]?.[0] as { system?: string } | undefined)?.system ?? ""
    );
    expect(hintedSystem).toMatch(/DESCRIPTION/);
    expect(hintedSystem).toMatch(/RELATIONS/);
    expect(hintedSystem).toMatch(/PROGRAM/);
    expect(result.hintedAttempted).toBe(true);
    expect(result.hintedUnlocksVisualSolve).toBe(false);
    expect(playerSimPublishBlockers(result).join(" ")).toMatch(/Progressive-hint vision failed/i);
  });

  it("honors REBUZZLE_SKIP_HINTED_VISION to avoid spend", async () => {
    process.env.REBUZZLE_SKIP_HINTED_VISION = "1";
    generateAIObjectFromImage.mockImplementation(async () => visionResult("lockboard", 0.9));

    const result = await simulatePlayerSolve({
      rebusPuzzle: "🔑 BOARD",
      answer: "keyboard",
      explanation: "key + board",
      hints: ["compound word", "starts with K", "keyboard"],
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual,
    });

    const hintedCalls = generateAIObjectFromImage.mock.calls.filter(
      (call) => (call[0] as { operation?: string }).operation === "vision-hinted-solve"
    );
    expect(hintedCalls).toHaveLength(0);
    expect(result.hintedAttempted).toBe(false);
  });
});
