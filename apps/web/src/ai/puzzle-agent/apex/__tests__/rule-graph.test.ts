import { composeRuleGraph, defaultLayoutForTechnique, isRuleGraphTechnique } from "../rule-graph";

describe("rule-graph composer", () => {
  it("recognizes the full named technique set", () => {
    expect(isRuleGraphTechnique("simple_compound")).toBe(true);
    expect(isRuleGraphTechnique("obvious_emoji_sum")).toBe(true);
    expect(isRuleGraphTechnique("basic_positional")).toBe(true);
    expect(isRuleGraphTechnique("spatial_preposition_play")).toBe(true);
    expect(isRuleGraphTechnique("math_symbol_wordplay")).toBe(true);
    expect(isRuleGraphTechnique("false_lead_visual")).toBe(true);
    expect(isRuleGraphTechnique("idiom_as_picture")).toBe(true);
    expect(isRuleGraphTechnique("nested_homophone")).toBe(true);
    expect(isRuleGraphTechnique("multi_layer_phonetic")).toBe(true);
    expect(isRuleGraphTechnique("triple_layer_composition")).toBe(true);
    expect(isRuleGraphTechnique("rare_but_fair_idiom")).toBe(true);
    expect(isRuleGraphTechnique("recursive_visual_pun")).toBe(true);
    expect(isRuleGraphTechnique("cultural_common_knowledge_plus_twist")).toBe(true);
    expect(isRuleGraphTechnique("not_a_real_technique")).toBe(false);
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

  it("joins multi_emoji_compound parts in a row", () => {
    const result = composeRuleGraph({
      techniqueId: "multi_emoji_compound",
      answer: "moonwalk",
      cues: [
        { kind: "catalog", concept: "moon", role: "word-part" },
        { kind: "catalog", concept: "footprints", role: "word-part" },
      ],
    });
    expect(result.layout).toBe("row");
    expect(result.layers.some((layer) => layer.kind === "operator")).toBe(true);
  });

  it("keeps idiom_as_picture as a left-to-right row", () => {
    const result = composeRuleGraph({
      techniqueId: "idiom_as_picture",
      answer: "piece of cake",
      cues: [
        { kind: "text", content: "PIECE", role: "word-part" },
        { kind: "catalog", concept: "cake", role: "word-part" },
      ],
    });
    expect(result.applied).toBe(true);
    expect(result.layout).toBe("row");
    expect(result.layers.map((layer) => layer.kind)).toEqual(["text", "operator", "pictogram"]);
  });

  it("uses stack/overlay for false_lead_visual and strips joiners", () => {
    const result = composeRuleGraph({
      techniqueId: "false_lead_visual",
      answer: "dog eat dog",
      cues: [
        { kind: "catalog", concept: "dog", role: "word-part" },
        { kind: "operator", symbol: "+", role: "structural-anchor" },
        { kind: "text", content: "EAT", role: "word-part" },
        { kind: "catalog", concept: "dog", role: "word-part" },
      ],
    });
    expect(result.layout).toBe("overlay");
    expect(result.layers.every((layer) => layer.kind !== "operator")).toBe(true);
  });

  it("keeps nested / multi-layer phonetic chains as rows without forced joiners", () => {
    const result = composeRuleGraph({
      techniqueId: "nested_homophone",
      answer: "wait for it",
      cues: [
        { kind: "text", content: "WEIGHT", role: "phonetic-anchor" },
        { kind: "catalog", concept: "4", role: "phonetic-anchor" },
        { kind: "text", content: "IT", role: "word-part" },
      ],
    });
    expect(result.applied).toBe(true);
    expect(result.layout).toBe("row");
    expect(result.layers.every((layer) => layer.kind !== "operator")).toBe(true);
    expect(result.rules.some((rule) => /phonetic/i.test(rule))).toBe(true);
  });

  it("grids triple_layer_composition when three semantic parts are present", () => {
    const result = composeRuleGraph({
      techniqueId: "triple_layer_composition",
      answer: "read between the lines",
      cues: [
        { kind: "text", content: "READ", role: "word-part" },
        { kind: "text", content: "LINE", role: "word-part" },
        { kind: "text", content: "LINE", role: "word-part" },
      ],
    });
    expect(result.layout).toBe("grid");
    expect(result.layers.some((layer) => layer.kind === "operator")).toBe(true);
  });

  it("overlays recursive_visual_pun and strips joiners", () => {
    const result = composeRuleGraph({
      techniqueId: "recursive_visual_pun",
      answer: "picture in picture",
      cues: [
        { kind: "catalog", concept: "frame", role: "semantic-anchor" },
        { kind: "operator", symbol: "+", role: "structural-anchor" },
        { kind: "catalog", concept: "frame", role: "semantic-anchor" },
      ],
    });
    expect(result.layout).toBe("overlay");
    expect(result.layers.every((layer) => layer.kind !== "operator")).toBe(true);
  });

  it("rows rare / cultural idiom boards with joiners", () => {
    const rare = composeRuleGraph({
      techniqueId: "rare_but_fair_idiom",
      answer: "kick the bucket",
      cues: [
        { kind: "catalog", concept: "boot", role: "word-part" },
        { kind: "catalog", concept: "bucket", role: "word-part" },
      ],
    });
    expect(rare.applied).toBe(true);
    expect(rare.layout).toBe("row");
    expect(rare.layers.map((layer) => layer.kind)).toEqual(["pictogram", "operator", "pictogram"]);

    const cultural = composeRuleGraph({
      techniqueId: "cultural_common_knowledge_plus_twist",
      answer: "break a leg",
      cues: [
        { kind: "text", content: "BREAK", role: "word-part" },
        { kind: "catalog", concept: "leg", role: "word-part" },
      ],
    });
    expect(cultural.layout).toBe("row");
    expect(cultural.applied).toBe(true);
  });

  it("passes through unknown techniques as a flat row", () => {
    const result = composeRuleGraph({
      techniqueId: "not_a_real_technique",
      cues: [{ kind: "text", content: "HOT", role: "word-part" }],
    });
    expect(result.applied).toBe(false);
    expect(result.layout).toBe("row");
    expect(result.layers).toHaveLength(1);
  });
});
