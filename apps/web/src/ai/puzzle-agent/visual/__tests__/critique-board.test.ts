import {
  type BoardProfileRecognitionResult,
  evaluateBoardPerceptionConsensus,
  evaluateBoardProfileConsensus,
} from "../board-consensus";
import type { PuzzleVisual } from "../composition";

const visual: PuzzleVisual = {
  styleId: "ink-pictogram-v1",
  mode: "composed",
  layout: "row",
  unicodeFallback: "🚗 + 🔑",
  layers: [
    { kind: "pictogram", concept: "car", emojiFallback: "🚗" },
    { kind: "operator", symbol: "+" },
    { kind: "pictogram", concept: "key", emojiFallback: "🔑" },
  ],
};

function perception(model: string, objects: string[]) {
  return {
    model,
    objects: objects.map((label) => ({ label, confidence: 0.9 })),
    visibleText: [],
    relationships: ["two objects separated by a plus sign"],
    hasClipping: false,
    hasAccidentalOverlap: false,
    unreadableElements: [],
    overallConfidence: 0.9,
  };
}

function profile(
  profileId: string,
  result: ReturnType<typeof evaluateBoardPerceptionConsensus>
): BoardProfileRecognitionResult {
  return {
    ...result,
    profileId,
    viewportWidth: profileId === "compact-320" ? 320 : 768,
    tileSize: profileId === "compact-320" ? 36 : 72,
    width: profileId === "compact-320" ? 320 : 768,
    height: 120,
    wrappedRows: 1,
  };
}

describe("board perception consensus", () => {
  it("accepts only when every pictogram is independently recognized", () => {
    const result = evaluateBoardPerceptionConsensus({
      visual,
      perceptions: [
        perception("vision-a", ["automobile", "key"]),
        perception("vision-b", ["car", "key"]),
      ],
      requiredVotes: 2,
      minConfidence: 0.68,
    });

    expect(result.ok).toBe(true);
    expect(result.conceptVotes).toEqual({ car: 2, key: 2 });
  });

  it("rejects a board when an expected object is misread", () => {
    const result = evaluateBoardPerceptionConsensus({
      visual,
      perceptions: [
        perception("vision-a", ["shoe", "key"]),
        perception("vision-b", ["unclear", "key"]),
      ],
      requiredVotes: 2,
      minConfidence: 0.68,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("car");
  });

  it("does not count duplicate responses from one board model", () => {
    const result = evaluateBoardPerceptionConsensus({
      visual,
      perceptions: [perception("vision-a", ["car", "key"]), perception("vision-a", ["car", "key"])],
      requiredVotes: 2,
      minConfidence: 0.68,
    });

    expect(result.ok).toBe(false);
    expect(result.perceptions).toHaveLength(1);
    expect(result.reason).toContain("Not enough independent");
  });

  it("rejects clipping even when object naming succeeds", () => {
    const clipped = perception("vision-a", ["car", "key"]);
    clipped.hasClipping = true;
    const result = evaluateBoardPerceptionConsensus({
      visual,
      perceptions: [clipped, perception("vision-b", ["car", "key"])],
      requiredVotes: 2,
      minConfidence: 0.68,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("clipped");
  });

  it("rejects when any required production profile fails", () => {
    const passing = evaluateBoardPerceptionConsensus({
      visual,
      perceptions: [perception("a", ["car", "key"]), perception("b", ["car", "key"])],
      requiredVotes: 2,
      minConfidence: 0.68,
    });
    const failing = evaluateBoardPerceptionConsensus({
      visual,
      perceptions: [perception("a", ["shoe", "key"]), perception("b", ["shoe", "key"])],
      requiredVotes: 2,
      minConfidence: 0.68,
    });
    const result = evaluateBoardProfileConsensus({
      visual,
      profileResults: [
        profile("compact-320", failing),
        profile("mobile-375", passing),
        profile("desktop-768", passing),
      ],
      expectedProfileIds: ["compact-320", "mobile-375", "desktop-768"],
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("compact-320");
  });

  it("fails closed when a production profile was skipped", () => {
    const passing = evaluateBoardPerceptionConsensus({
      visual,
      perceptions: [perception("a", ["car", "key"]), perception("b", ["car", "key"])],
      requiredVotes: 2,
      minConfidence: 0.68,
    });
    const result = evaluateBoardProfileConsensus({
      visual,
      profileResults: [profile("mobile-375", passing), profile("desktop-768", passing)],
      expectedProfileIds: ["compact-320", "mobile-375", "desktop-768"],
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Missing profiles: compact-320");
  });
});
