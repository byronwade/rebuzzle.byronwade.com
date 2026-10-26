import { dailyChallengeBlockers } from "../daily-challenge";

const reasoningEvidence = {
  version: "editorial-reasoning-v1",
  operations: [
    {
      kind: "reversal",
      observation: "Each TEEF spells FEET toward the left.",
      inference: "Recover FEET and the direction left.",
      necessary: true,
    },
    {
      kind: "count",
      observation: "Two reversed word groups are visible.",
      inference: "The pair supplies two in the final idiom.",
      necessary: true,
    },
  ],
  interacting: true,
  finalInterpretation: "two left feet",
  calibration: "editorial-unplaytested",
};

const layered = {
  mode: "composed" as const,
  layout: "row" as const,
  unicodeFallback: "TEEF TEEF",
  layers: [
    { kind: "text" as const, content: "TEEF", emphasis: "normal" as const },
    { kind: "text" as const, content: "TEEF", emphasis: "normal" as const },
  ],
};

it("rejects ordinary arithmetic regardless of the claimed difficulty", () => {
  expect(
    dailyChallengeBlockers({
      answer: "six",
      difficulty: 9,
      reasoningEvidence: { ...reasoningEvidence, finalInterpretation: "six" },
      reasoningEvidenceSource: "independent-editorial",
      visual: {
        ...layered,
        unicodeFallback: "2 × 3",
        layers: [
          { kind: "text", content: "2", emphasis: "normal" },
          { kind: "operator", symbol: "×" },
          { kind: "text", content: "3", emphasis: "normal" },
        ],
      },
    }).length
  ).toBeGreaterThan(0);
});

it("does not qualify invisible layers behind a unicode-only board", () => {
  expect(
    dailyChallengeBlockers({
      answer: "two left feet",
      difficulty: 9,
      reasoningEvidence,
      reasoningEvidenceSource: "curated",
      visual: {
        ...layered,
        mode: "unicode",
        unicodeFallback: "TWO LEFT FEET",
      },
    }).length
  ).toBeGreaterThan(0);
});

it("allows a composed count-and-reversal candidate through the mechanical exclusions", () => {
  expect(
    dailyChallengeBlockers({
      answer: "two left feet",
      difficulty: 7,
      visual: layered,
      reasoningEvidence,
      reasoningEvidenceSource: "curated",
    })
  ).toEqual([]);
});

it("does not treat a high score and unusual layout as proof of interacting reasoning", () => {
  expect(
    dailyChallengeBlockers({
      answer: "head over heels",
      difficulty: 9,
      visual: {
        ...layered,
        layout: "stack",
        unicodeFallback: "HEAD\nHEELS",
        layers: [
          { kind: "text", content: "HEAD", emphasis: "normal" },
          { kind: "text", content: "HEELS", emphasis: "normal" },
        ],
      },
    }).length
  ).toBeGreaterThan(0);
});

it.each([
  { ...reasoningEvidence, interacting: false },
  { ...reasoningEvidence, finalInterpretation: "another answer" },
  {
    ...reasoningEvidence,
    operations: [
      { ...reasoningEvidence.operations[0], necessary: false },
      reasoningEvidence.operations[1],
    ],
  },
  {
    ...reasoningEvidence,
    operations: [reasoningEvidence.operations[0], reasoningEvidence.operations[0]],
  },
])("rejects decorative, unrelated or repeated reasoning claims", (evidence) => {
  expect(
    dailyChallengeBlockers({
      answer: "two left feet",
      difficulty: 7,
      visual: layered,
      reasoningEvidence: evidence,
      reasoningEvidenceSource: "independent-editorial",
    }).length
  ).toBeGreaterThan(0);
});

it("requires a reviewed source rather than accepting author claims", () => {
  expect(
    dailyChallengeBlockers({
      answer: "two left feet",
      difficulty: 7,
      visual: layered,
      reasoningEvidence,
      reasoningEvidenceSource: "author",
    }).length
  ).toBeGreaterThan(0);
});
