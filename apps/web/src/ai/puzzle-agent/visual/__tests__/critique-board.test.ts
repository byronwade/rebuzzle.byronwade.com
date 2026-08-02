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
    { kind: "text", content: "GO", emphasis: "normal" },
    { kind: "pictogram", concept: "key", emojiFallback: "🔑" },
  ],
};

function perception(
  model: string,
  objects: string[],
  options: { visibleText?: string[]; visibleOperators?: string[] } = {}
) {
  return {
    model,
    objects: objects.map((label) => ({ label, confidence: 0.9 })),
    visibleText: options.visibleText ?? ["GO"],
    visibleOperators: options.visibleOperators ?? ["+"],
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
    expect(result.textVotes).toEqual({ GO: 2 });
    expect(result.operatorVotes).toEqual({ "+": 2 });
  });

  it("rejects a board when required text is not independently visible", () => {
    const result = evaluateBoardPerceptionConsensus({
      visual,
      perceptions: [
        perception("vision-a", ["car", "key"], { visibleText: [] }),
        perception("vision-b", ["car", "key"], { visibleText: [] }),
      ],
      requiredVotes: 2,
      minConfidence: 0.68,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("text not recognized: GO");
    expect(result.textVotes).toEqual({ GO: 0 });
  });

  it("rejects a board when an operator is missing or misread", () => {
    const result = evaluateBoardPerceptionConsensus({
      visual,
      perceptions: [
        perception("vision-a", ["car", "key"], { visibleOperators: [] }),
        perception("vision-b", ["car", "key"], { visibleOperators: ["-"] }),
      ],
      requiredVotes: 2,
      minConfidence: 0.68,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("operators not recognized: +");
    expect(result.operatorVotes).toEqual({ "+": 0 });
  });

  it("normalizes stacked text and common operator names without fuzzy substring credit", () => {
    const stackedVisual: PuzzleVisual = {
      ...visual,
      layers: [
        { kind: "text", content: "BACK", emphasis: "stacked" },
        { kind: "operator", symbol: "→" },
      ],
    };
    const result = evaluateBoardPerceptionConsensus({
      visual: stackedVisual,
      perceptions: [
        perception("vision-a", [], { visibleText: ["B A C K"], visibleOperators: ["arrow"] }),
        perception("vision-b", [], { visibleText: ["BACK"], visibleOperators: ["right arrow"] }),
      ],
      requiredVotes: 2,
      minConfidence: 0.68,
    });

    expect(result.ok).toBe(true);
    expect(result.textVotes).toEqual({ BACK: 2 });
    expect(result.operatorVotes).toEqual({ "→": 2 });
  });

  it("does not treat a short text cue as a substring of a different word", () => {
    const result = evaluateBoardPerceptionConsensus({
      visual,
      perceptions: [
        perception("vision-a", ["car", "key"], { visibleText: ["GOLD"] }),
        perception("vision-b", ["car", "key"], { visibleText: ["GONE"] }),
      ],
      requiredVotes: 2,
      minConfidence: 0.68,
    });

    expect(result.ok).toBe(false);
    expect(result.textVotes).toEqual({ GO: 0 });
  });

  it("requires repeated object, text, and operator cues at their visible multiplicity", () => {
    const repeatedVisual: PuzzleVisual = {
      ...visual,
      layers: [
        { kind: "pictogram", concept: "car", emojiFallback: "🚗" },
        { kind: "pictogram", concept: "car", emojiFallback: "🚗" },
        { kind: "text", content: "GO", emphasis: "normal" },
        { kind: "text", content: "GO", emphasis: "normal" },
        { kind: "operator", symbol: "+" },
        { kind: "operator", symbol: "+" },
      ],
    };
    const undercounted = evaluateBoardPerceptionConsensus({
      visual: repeatedVisual,
      perceptions: [perception("vision-a", ["car"]), perception("vision-b", ["car"])],
      requiredVotes: 2,
      minConfidence: 0.68,
    });
    const complete = evaluateBoardPerceptionConsensus({
      visual: repeatedVisual,
      perceptions: [
        perception("vision-a", ["car", "automobile"], {
          visibleText: ["GO", "GO"],
          visibleOperators: ["plus", "+"],
        }),
        perception("vision-b", ["automobile", "car"], {
          visibleText: ["GO GO"],
          visibleOperators: ["+", "+"],
        }),
      ],
      requiredVotes: 2,
      minConfidence: 0.68,
    });

    expect(undercounted.ok).toBe(false);
    expect(undercounted.reason).toContain("car ×2");
    expect(complete.ok).toBe(true);
    expect(complete.conceptVotes).toEqual({ car: 2 });
    expect(complete.textVotes).toEqual({ GO: 2 });
    expect(complete.operatorVotes).toEqual({ "+": 2 });
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
