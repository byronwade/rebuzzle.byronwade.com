import {
  answerSeedCuePlanIssues,
  formatAnswerSeedCuePlan,
  missingAnswerSeedCues,
} from "../answer-seed-cues";

const visual = {
  styleId: "ink-pictogram-v1" as const,
  mode: "composed" as const,
  layout: "row" as const,
  layers: [
    {
      kind: "pictogram" as const,
      concept: "flower",
      emojiFallback: "🌸",
    },
    {
      kind: "text" as const,
      content: "POT",
      emphasis: "normal" as const,
    },
    {
      kind: "operator" as const,
      symbol: "+",
    },
  ],
  unicodeFallback: "🌸 + POT",
};

describe("answer-first visual cue contracts", () => {
  it("requires reviewed catalog concepts and rejects quarantined icons", () => {
    expect(
      answerSeedCuePlanIssues([
        { kind: "catalog", concept: "flower", role: "word-part" },
        { kind: "catalog", concept: "box", role: "word-part" },
      ])
    ).toEqual(["Answer-seed cue is not an approved catalog concept: box"]);
  });

  it("detects every missing board ingredient deterministically", () => {
    expect(
      missingAnswerSeedCues({
        visual,
        cues: [
          { kind: "catalog", concept: "flower", role: "word-part" },
          { kind: "text", content: "POT", role: "word-part" },
          { kind: "operator", symbol: "+", role: "structural-anchor" },
          { kind: "text", content: "MISSING", role: "word-part" },
        ],
      })
    ).toEqual(["Missing text cue MISSING"]);
  });

  it("formats a compact model-facing contract", () => {
    expect(
      formatAnswerSeedCuePlan([
        { kind: "catalog", concept: "flower", role: "word-part" },
        { kind: "text", content: "POT", role: "word-part" },
      ])
    ).toBe('flower [reviewed pictogram; word-part]; "POT" [visible text; word-part]');
  });
});
