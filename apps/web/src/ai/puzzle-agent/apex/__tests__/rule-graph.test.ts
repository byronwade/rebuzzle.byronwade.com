import { composeRuleGraph, defaultLayoutForTechnique, isRuleGraphTechnique } from "../rule-graph";

describe("rule-graph composer", () => {
  it("recognizes the high-coverage technique set", () => {
    expect(isRuleGraphTechnique("simple_compound")).toBe(true);
    expect(isRuleGraphTechnique("obvious_emoji_sum")).toBe(true);
    expect(isRuleGraphTechnique("basic_positional")).toBe(true);
    expect(isRuleGraphTechnique("spatial_preposition_play")).toBe(true);
    expect(isRuleGraphTechnique("math_symbol_wordplay")).toBe(true);
    expect(isRuleGraphTechnique("false_lead_visual")).toBe(false);
  });

  it("inserts + joiners for simple_compound when omitted", () => {
    const result = composeRuleGraph({
      techniqueId: "simple_compound",
      answer: "sunflower",
      cues: [
        { kind: "catalog", concept: "sun", role: "word-part" },
        { kind: "catalog", concept: "flower", role: "word-part" },
      ],
    });

    expect(result.applied).toBe(true);
    expect(result.layout).toBe("row");
    expect(result.layers.map((layer) => layer.kind)).toEqual([
      "pictogram",
      "operator",
      "pictogram",
    ]);
    expect(result.layers[1]).toEqual({ kind: "operator", symbol: "+" });
  });

  it("stacks positional techniques and strips joiners", () => {
    const result = composeRuleGraph({
      techniqueId: "basic_positional",
      answer: "rainfall",
      cues: [
        { kind: "text", content: "RAIN", role: "word-part" },
        { kind: "operator", symbol: "+", role: "structural-anchor" },
        { kind: "text", content: "FALL", role: "word-part" },
      ],
    });

    expect(result.layout).toBe("stack");
    expect(defaultLayoutForTechnique("basic_positional")).toBe("stack");
    expect(result.layers.map((layer) => layer.kind)).toEqual(["text", "text"]);
    expect(result.rules.some((rule) => rule.includes("strip"))).toBe(true);
  });

  it("applies size/case contrast on text cues", () => {
    const result = composeRuleGraph({
      techniqueId: "size_or_case_semantics",
      answer: "big deal",
      cues: [
        { kind: "text", content: "DEAL", role: "word-part" },
        { kind: "text", content: "DEAL", role: "word-part" },
      ],
    });

    expect(result.layout).toBe("row");
    expect(result.layers[0]).toEqual(expect.objectContaining({ kind: "text", emphasis: "large" }));
    expect(result.layers[1]).toEqual(expect.objectContaining({ kind: "text", emphasis: "small" }));
  });

  it("stacks spatial preposition play like other positional techniques", () => {
    const result = composeRuleGraph({
      techniqueId: "spatial_preposition_play",
      answer: "under the weather",
      cues: [
        { kind: "text", content: "WEATHER", role: "word-part" },
        { kind: "operator", symbol: "+", role: "structural-anchor" },
        { kind: "text", content: "CLOUD", role: "word-part" },
      ],
    });
    expect(result.layout).toBe("stack");
    expect(result.layers.map((layer) => layer.kind)).toEqual(["text", "text"]);
  });

  it("inserts a math operator for math_symbol_wordplay when omitted", () => {
    const result = composeRuleGraph({
      techniqueId: "math_symbol_wordplay",
      answer: "split decision",
      cues: [
        { kind: "text", content: "DECISION", role: "word-part" },
        { kind: "text", content: "DECISION", role: "word-part" },
      ],
    });
    expect(result.layout).toBe("row");
    expect(result.layers.map((layer) => layer.kind)).toEqual(["text", "operator", "text"]);
    expect(result.layers[1]).toEqual({ kind: "operator", symbol: "/" });
  });

  it("joins obvious_emoji_sum like simple_compound", () => {
    const result = composeRuleGraph({
      techniqueId: "obvious_emoji_sum",
      answer: "rainbow",
      cues: [
        { kind: "catalog", concept: "rain", role: "word-part" },
        { kind: "catalog", concept: "bow", role: "word-part" },
      ],
    });
    expect(result.applied).toBe(true);
    expect(result.layers.map((layer) => layer.kind)).toEqual([
      "pictogram",
      "operator",
      "pictogram",
    ]);
  });

  it("passes through unknown techniques as a flat row", () => {
    const result = composeRuleGraph({
      techniqueId: "false_lead_visual",
      cues: [{ kind: "text", content: "HOT", role: "word-part" }],
    });
    expect(result.applied).toBe(false);
    expect(result.layout).toBe("row");
    expect(result.layers).toHaveLength(1);
  });
});
