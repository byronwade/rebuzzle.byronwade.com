import {
  computeFunScore,
  displayLeaksAnswer,
  evaluatePublishGates,
  evaluateVisualForPublish,
  explanationMapsAnswer,
  hintLeaksAnswerEarly,
  isKnownTechniqueId,
  normalizeAnswerKey,
} from "../quality";
import { resolveCuratedPictogram } from "../visual/curated-pictograms";
import { INK_PICTOGRAM_EXAMPLE_EYE } from "../visual/style";

const catalogEye = resolveCuratedPictogram("eye")!;

describe("displayLeaksAnswer", () => {
  it("detects full answer in display", () => {
    expect(displayLeaksAnswer("sun flower", "sunflower")).toBe(false);
    expect(displayLeaksAnswer("sunflower", "sunflower")).toBe(true);
    expect(displayLeaksAnswer("piece of cake", "piece of cake")).toBe(true);
  });

  it("only matches short answers as whole tokens", () => {
    expect(displayLeaksAnswer("BEFORE", "be")).toBe(false);
    expect(displayLeaksAnswer("be + 4", "be")).toBe(true);
    expect(displayLeaksAnswer("open", "on")).toBe(false);
  });
});

describe("computeFunScore", () => {
  it("does not let emoji padding alone clear a high bar", () => {
    const padded = computeFunScore({
      techniqueId: undefined,
      knownTechnique: false,
      withinBudget: true,
      issueCount: 0,
      generativeParts: 0,
      unicodeParts: 12,
      hasSpatialOrOperator: false,
      hasStyledText: false,
      explanationMapsWell: false,
    });
    expect(padded).toBeLessThan(68);
  });

  it("rewards known technique + generative craft + mapping", () => {
    const crafted = computeFunScore({
      techniqueId: "simple_compound",
      knownTechnique: true,
      withinBudget: true,
      issueCount: 0,
      generativeParts: 2,
      unicodeParts: 0,
      hasSpatialOrOperator: true,
      hasStyledText: false,
      explanationMapsWell: true,
    });
    expect(crafted).toBeGreaterThanOrEqual(68);
  });
});

describe("evaluateVisualForPublish", () => {
  it("rejects missing and unicode-only boards", () => {
    expect(evaluateVisualForPublish(undefined).ok).toBe(false);
    expect(
      evaluateVisualForPublish({
        mode: "unicode",
        layers: [{ kind: "pictogram" }],
        unicodeFallback: "🐝",
      }).ok
    ).toBe(false);
  });

  it("accepts composed pictogram SVG boards with trusted catalog provenance and player-size recognition", () => {
    expect(
      evaluateVisualForPublish({
        mode: "composed",
        layers: [
          {
            kind: "pictogram",
            concept: "eye",
            svg: catalogEye.svg,
            source: "catalog",
            assetId: catalogEye.assetId,
            recognitionProfiles: [
              { tileSize: 44, seenAs: "eye", confidence: 0.94 },
              { tileSize: 72, seenAs: "eye", confidence: 0.96 },
            ],
          },
        ],
        unicodeFallback: "👁️",
      }).ok
    ).toBe(true);
  });

  it("rejects authentic catalog icons that lack player-size recognition evidence on AI publish", () => {
    expect(
      evaluateVisualForPublish({
        mode: "composed",
        layers: [
          {
            kind: "pictogram",
            concept: "eye",
            svg: catalogEye.svg,
            source: "catalog",
            assetId: catalogEye.assetId,
          },
        ],
        unicodeFallback: "👁️",
      }).ok
    ).toBe(false);
  });

  it("allows authentic catalog icons without recognition evidence for offline reserve audits", () => {
    expect(
      evaluateVisualForPublish(
        {
          mode: "composed",
          layers: [
            {
              kind: "pictogram",
              concept: "eye",
              svg: catalogEye.svg,
              source: "catalog",
              assetId: catalogEye.assetId,
            },
          ],
          unicodeFallback: "👁️",
        },
        { requireCatalogRecognitionEvidence: false }
      ).ok
    ).toBe(true);
  });

  it("rejects structurally clear SVGs without approved provenance", () => {
    expect(
      evaluateVisualForPublish({
        mode: "composed",
        layers: [{ kind: "pictogram", concept: "eye", svg: INK_PICTOGRAM_EXAMPLE_EYE }],
        unicodeFallback: "👁️",
      }).ok
    ).toBe(false);
  });

  it("rejects fresh generated SVGs pending human approval", () => {
    expect(
      evaluateVisualForPublish({
        mode: "composed",
        layers: [
          {
            kind: "pictogram",
            concept: "lighthouse",
            svg: INK_PICTOGRAM_EXAMPLE_EYE,
            source: "generated",
          },
        ],
        unicodeFallback: "🔦",
      }).ok
    ).toBe(false);
  });

  it("rejects unreadable blob pictograms", () => {
    expect(
      evaluateVisualForPublish({
        mode: "composed",
        layers: [
          {
            kind: "pictogram",
            svg: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20"/></svg>',
          },
        ],
        unicodeFallback: "◆",
      }).ok
    ).toBe(false);
  });

  it("accepts styled text when typography is the joke", () => {
    expect(
      evaluateVisualForPublish({
        mode: "composed",
        layers: [{ kind: "text", content: "DEAL", emphasis: "large" }],
        unicodeFallback: "DEAL",
      }).ok
    ).toBe(true);
  });

  it("accepts an authentic simple catalog silhouette with recognition evidence", () => {
    const heart = resolveCuratedPictogram("heart")!;
    expect(
      evaluateVisualForPublish({
        mode: "composed",
        layers: [
          {
            kind: "pictogram",
            concept: "heart",
            svg: heart.svg,
            source: "catalog",
            assetId: heart.assetId,
            recognitionProfiles: [
              { tileSize: 44, seenAs: "heart", confidence: 0.93 },
              { tileSize: 72, seenAs: "heart", confidence: 0.95 },
            ],
          },
        ],
        unicodeFallback: "❤️",
      }).ok
    ).toBe(true);
  });

  it("does not trust spoofed catalog provenance", () => {
    expect(
      evaluateVisualForPublish({
        mode: "composed",
        layers: [
          {
            kind: "pictogram",
            concept: "heart",
            svg: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20"/></svg>',
            source: "catalog",
            assetId: "lucide:heart:v2",
          },
        ],
        unicodeFallback: "◆",
      }).ok
    ).toBe(false);
  });

  it("accepts only embedded image tiles with a concrete blind-recognition concept", () => {
    const base = {
      mode: "hybrid",
      unicodeFallback: "CAR",
      layers: [
        { kind: "text", content: "CAR", emphasis: "large" },
        {
          kind: "image",
          concept: "car",
          src: "data:image/png;base64,AAAA",
        },
      ],
    };

    expect(evaluateVisualForPublish(base).ok).toBe(true);
    expect(
      evaluateVisualForPublish({
        ...base,
        layers: [base.layers[0]!, { kind: "image", src: "data:image/png;base64,AAAA" }],
      }).ok
    ).toBe(false);
    expect(
      evaluateVisualForPublish({
        ...base,
        layers: [
          base.layers[0]!,
          { kind: "image", concept: "car", src: "https://example.com/changeable.png" },
        ],
      }).ok
    ).toBe(false);
  });
});

describe("hintLeaksAnswerEarly", () => {
  it("flags full answer in early hints", () => {
    const problems = hintLeaksAnswerEarly(
      ["think category", "the answer is sunflower", "final"],
      "sunflower"
    );
    expect(problems.some((p) => p.includes("full answer"))).toBe(true);
  });

  it("allows a final first-letter nudge", () => {
    const problems = hintLeaksAnswerEarly(
      [
        "Think about a garden compound.",
        "Two pictures join into one familiar word.",
        'Final nudge: it starts with "S".',
      ],
      "sunflower"
    );
    expect(problems).toHaveLength(0);
  });
});

describe("explanationMapsAnswer", () => {
  it("requires a real mapping, not a stub", () => {
    expect(explanationMapsAnswer("too short", "sunflower")).toBe(false);
    expect(
      explanationMapsAnswer(
        "Sun pictogram plus flower pictogram combine because each half maps to sunflower.",
        "sunflower"
      )
    ).toBe(true);
  });
});

describe("evaluatePublishGates", () => {
  const base = {
    rebusPuzzle: "☀️ + 🌻",
    answer: "sunflower",
    explanation:
      "Sun pictogram plus flower pictogram combine as the compound word sunflower because each half maps directly.",
    hints: [
      "Think about a garden compound.",
      "Two pictures join into one familiar word.",
      "The answer is a single word.",
      'Final nudge: it starts with "S".',
    ],
    techniqueId: "simple_compound",
    difficulty: 5,
    targetDifficulty: 5,
    qualityOverall: 80,
    funScore: 75,
    qualityThreshold: 74,
    minFunScore: 68,
    publishable: true,
    visual: {
      mode: "composed" as const,
      layers: [
        {
          kind: "text" as const,
          content: "SUN",
          emphasis: "normal" as const,
        },
        {
          kind: "operator" as const,
          symbol: "+",
        },
        {
          kind: "text" as const,
          content: "FLOWER",
          emphasis: "normal" as const,
        },
      ],
      unicodeFallback: "☀️ + 🌻",
    },
  };

  it("requires uniqueness and solvability when provided", () => {
    expect(evaluatePublishGates({ ...base, isUnique: false }).ok).toBe(false);
    expect(evaluatePublishGates({ ...base, solvable: false }).ok).toBe(false);
    expect(
      evaluatePublishGates({
        ...base,
        isUnique: true,
        uniquenessScore: 80,
        solvable: true,
        calibratedDifficulty: 5,
        inBand: true,
      }).ok
    ).toBe(true);
  });

  it("rejects unknown technique ids", () => {
    expect(
      evaluatePublishGates({
        ...base,
        techniqueId: "emoji_salad_hack",
        isUnique: true,
        solvable: true,
        inBand: true,
      }).ok
    ).toBe(false);
  });

  it("rejects rebusPuzzle mismatch with visual fallback", () => {
    expect(
      evaluatePublishGates({
        ...base,
        rebusPuzzle: "WRONG",
        isUnique: true,
        solvable: true,
        inBand: true,
      }).ok
    ).toBe(false);
  });
});

describe("normalizeAnswerKey / technique ids", () => {
  it("strips punctuation and case", () => {
    expect(normalizeAnswerKey("Piece of Cake!")).toBe("pieceofcake");
  });

  it("recognizes library techniques", () => {
    expect(isKnownTechniqueId("simple_compound")).toBe(true);
    expect(isKnownTechniqueId("not_real")).toBe(false);
  });
});
