import { INK_PICTOGRAM_EXAMPLE_EYE, INK_PICTOGRAM_EXAMPLE_KEY } from "../../visual/style";
import { PHRASE_BANK, phraseBankSize, samplePhraseBank } from "../phrase-bank";
import { scoreRubric, tournamentScore } from "../rubric";
import { pickWinner, rankCandidates } from "../tournament";
import type { ApexCandidate } from "../types";

function fakeCandidate(overrides: Partial<ApexCandidate> = {}): ApexCandidate {
  return {
    id: overrides.id ?? "c1",
    rebusPuzzle: "🔑 + 👁️",
    answer: "keyhole",
    difficulty: 5,
    difficultyLevel: "Hard",
    explanation:
      "Key pictogram plus eye pictogram map to the compound keyhole because each half is literal.",
    category: "compound",
    hints: [
      "Think household compounds.",
      "Two pictures join into one word.",
      "Single word.",
      'Final nudge: it starts with "K".',
    ],
    techniqueId: "simple_compound",
    visual: {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "row",
      unicodeFallback: "🔑 + 👁️",
      layers: [
        {
          kind: "pictogram",
          concept: "key",
          emojiFallback: "🔑",
          svg: INK_PICTOGRAM_EXAMPLE_KEY,
        },
        { kind: "operator", symbol: "+" },
        {
          kind: "pictogram",
          concept: "eye",
          emojiFallback: "👁️",
          svg: INK_PICTOGRAM_EXAMPLE_EYE,
        },
      ],
    },
    fingerprint: "abc",
    uniquenessScore: 85,
    calibratedDifficulty: 5,
    inBand: true,
    isUnique: true,
    solvable: true,
    qualityOverall: 80,
    funScore: 78,
    publishable: true,
    critique: {
      verdict: "ship",
      summary: "Clean compound",
      strengths: ["clear mapping"],
      flaws: [],
      reviseInstructions: [],
      falseLeadQuality: 40,
      ahaPredicted: 82,
      creativityScore: 74,
      iconRecognizability: 80,
      overusedTrope: false,
    },
    playerSim: {
      firstWrongParses: ["sunshine"],
      likelySolvePath: "read sun + flower",
      hintUnlockOrderLooksFair: true,
      unfairReasons: [],
      estimatedSolveRate: 0.55,
      confidence: 0.7,
    },
    rejectReasons: [],
    ...overrides,
  };
}

describe("phrase bank", () => {
  it("has a substantial curated corpus", () => {
    expect(phraseBankSize()).toBeGreaterThanOrEqual(90);
  });

  it("samples non-banned phrases near the target difficulty", () => {
    const banned = new Set(["sunflower", "pieceofcake"]);
    const samples = samplePhraseBank({
      targetDifficulty: 6,
      preferredTechniques: ["idiom_as_picture", "positional_phrase"],
      bannedAnswerKeys: banned,
      limit: 6,
    });
    expect(samples.length).toBeGreaterThan(0);
    expect(
      samples.every((s) => !banned.has(s.answer.replace(/[^a-z0-9]/gi, "").toLowerCase()))
    ).toBe(true);
  });

  it("keeps fresh coverage for every requested technique in the prompt slice", () => {
    const samples = samplePhraseBank({
      targetDifficulty: 5,
      preferredTechniques: ["simple_compound", "obvious_emoji_sum"],
      bannedAnswerKeys: new Set(),
      excludeOverused: true,
      limit: 6,
    });
    expect(samples.some((sample) => sample.techniqueAffinity.includes("simple_compound"))).toBe(
      true
    );
    expect(samples.some((sample) => sample.techniqueAffinity.includes("obvious_emoji_sum"))).toBe(
      true
    );
    expect(samples.every((sample) => !sample.overused)).toBe(true);
  });

  it("keeps a reviewed cue plan for every technique family", () => {
    const covered = new Set(
      PHRASE_BANK.filter((entry) => !entry.overused && entry.visualCues?.length).flatMap(
        (entry) => entry.techniqueAffinity
      )
    );
    expect(
      [
        "simple_compound",
        "obvious_emoji_sum",
        "single_homophone",
        "basic_positional",
        "multi_emoji_compound",
        "positional_phrase",
        "math_symbol_wordplay",
        "nested_homophone",
        "false_lead_visual",
        "idiom_as_picture",
        "size_or_case_semantics",
        "multi_layer_phonetic",
        "spatial_preposition_play",
        "triple_layer_composition",
        "rare_but_fair_idiom",
        "recursive_visual_pun",
        "cultural_common_knowledge_plus_twist",
      ].every((technique) => covered.has(technique))
    ).toBe(true);
  });
});

describe("rubric + tournament", () => {
  it("scores a strong composed candidate highly", () => {
    const rubric = scoreRubric(fakeCandidate());
    expect(rubric.overall).toBeGreaterThanOrEqual(70);
    expect(rubric.visualCraft).toBeGreaterThanOrEqual(70);
    expect(rubric.ahaMoment).toBeGreaterThanOrEqual(60);
  });

  it("rejects critique-reject and non-unique candidates in tournament", () => {
    const good = fakeCandidate({ id: "good" });
    const bad = fakeCandidate({
      id: "bad",
      isUnique: false,
      uniquenessScore: 10,
      critique: {
        verdict: "reject",
        summary: "lazy",
        strengths: [],
        flaws: ["emoji salad"],
        reviseInstructions: ["redesign"],
        falseLeadQuality: 10,
        ahaPredicted: 20,
        creativityScore: 15,
        iconRecognizability: 20,
        overusedTrope: true,
      },
    });
    const ranked = rankCandidates([bad, good], 70);
    expect(ranked[0]?.id).toBe("good");
    expect(tournamentScore(bad, 70)).toBeLessThan(0);
    const { winner } = pickWinner([bad, good], 70);
    expect(winner?.id).toBe("good");
  });
});
