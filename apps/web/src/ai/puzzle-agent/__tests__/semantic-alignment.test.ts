import { evaluateSemanticAlignment } from "../semantic-alignment";
import type { PuzzleVisual, VisualLayer } from "../visual/composition";
import { resolveCuratedPictogram } from "../visual/curated-pictograms";

function pictogram(concept: string): VisualLayer {
  const asset = resolveCuratedPictogram(concept)!;
  return {
    kind: "pictogram",
    concept,
    emojiFallback: "◼️",
    svg: asset.svg,
    assetId: asset.assetId,
    source: "catalog",
  };
}

function text(
  content: string,
  emphasis: Extract<VisualLayer, { kind: "text" }>["emphasis"] = "normal"
): VisualLayer {
  return { kind: "text", content, emphasis };
}

function visual(layers: VisualLayer[], layout: PuzzleVisual["layout"] = "row"): PuzzleVisual {
  return {
    styleId: "ink-pictogram-v1",
    mode: "composed",
    layout,
    layers,
    unicodeFallback: "board",
  };
}

describe("evaluateSemanticAlignment", () => {
  it("requires ordered visible parts to form a simple compound", () => {
    const passing = evaluateSemanticAlignment({
      answer: "keyboard",
      techniqueId: "simple_compound",
      visual: visual([pictogram("key"), { kind: "operator", symbol: "+" }, text("BOARD")]),
    });
    expect(passing.ok).toBe(true);
    expect(passing.cues.map((cue) => cue.matchedVariant)).toEqual(["key", "board"]);

    const wrong = evaluateSemanticAlignment({
      answer: "keyboard",
      techniqueId: "simple_compound",
      visual: visual([pictogram("car"), { kind: "operator", symbol: "+" }, text("BOARD")]),
    });
    expect(wrong.ok).toBe(false);
    expect(wrong.blockers[0]).toContain("do not form the answer");
  });

  it("allows curated rebus readings such as clock → time", () => {
    const result = evaluateSemanticAlignment({
      answer: "bedtime",
      techniqueId: "simple_compound",
      visual: visual([pictogram("bed"), { kind: "operator", symbol: "+" }, pictogram("clock")]),
    });
    expect(result.ok).toBe(true);
    expect(result.cues.map((cue) => cue.matchedVariant)).toEqual(["bed", "time"]);
  });

  it("requires phonetic techniques to explain the sound or letter mapping", () => {
    const passing = evaluateSemanticAlignment({
      answer: "before",
      techniqueId: "single_homophone",
      explanation: "The letter B plus four, said aloud, sounds like before.",
      visual: visual([text("B"), { kind: "operator", symbol: "+" }, text("4")]),
    });
    expect(passing.ok).toBe(true);

    const missingMapping = evaluateSemanticAlignment({
      answer: "before",
      techniqueId: "single_homophone",
      explanation: "The two visible parts make the answer.",
      visual: visual([text("B"), { kind: "operator", symbol: "+" }, text("4")]),
    });
    expect(missingMapping.ok).toBe(false);
    expect(missingMapping.blockers[0]).toContain("sound/letter mapping");
  });

  it("requires a real spatial layout and relationship explanation", () => {
    const passing = evaluateSemanticAlignment({
      answer: "mind over matter",
      techniqueId: "positional_phrase",
      explanation: "MIND is placed over MATTER, which reads as the familiar phrase.",
      visual: visual([text("MIND"), text("MATTER")], "stack"),
    });
    expect(passing.ok).toBe(true);

    const flattened = evaluateSemanticAlignment({
      answer: "mind over matter",
      techniqueId: "positional_phrase",
      explanation: "MIND is next to MATTER and gives the phrase.",
      visual: visual([text("MIND"), text("MATTER")], "row"),
    });
    expect(flattened.ok).toBe(false);
    expect(flattened.blockers[0]).toContain("non-row layout");
  });

  it("requires typography techniques to visibly style an answer token", () => {
    const passing = evaluateSemanticAlignment({
      answer: "big deal",
      techniqueId: "size_or_case_semantics",
      visual: visual([text("DEAL", "large")]),
    });
    expect(passing.ok).toBe(true);

    const plain = evaluateSemanticAlignment({
      answer: "big deal",
      techniqueId: "size_or_case_semantics",
      visual: visual([text("DEAL")]),
    });
    expect(plain.ok).toBe(false);
    expect(plain.blockers[0]).toContain("styled text layer");
  });
});
