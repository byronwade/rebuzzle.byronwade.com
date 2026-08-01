import { candidateNeedsVisualPolish } from "../polish-gates";
import { phraseBankSize, samplePhraseBank } from "../phrase-bank";
import { scoreRubric, tournamentScore } from "../rubric";
import { pickWinner, rankCandidates } from "../tournament";
import type { ApexCandidate } from "../types";
import { INK_PICTOGRAM_EXAMPLE_EYE, INK_PICTOGRAM_EXAMPLE_KEY } from "../../visual/style";

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
    expect(phraseBankSize()).toBeGreaterThanOrEqual(40);
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
    expect(samples.every((s) => !banned.has(s.answer.replace(/[^a-z0-9]/gi, "").toLowerCase()))).toBe(
      true
    );
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

  it("prefers high icon recognizability in tournament ranking", () => {
    const crisp = fakeCandidate({
      id: "crisp",
      critique: {
        verdict: "ship",
        summary: "clear",
        strengths: [],
        flaws: [],
        reviseInstructions: [],
        falseLeadQuality: 40,
        ahaPredicted: 80,
        creativityScore: 74,
        iconRecognizability: 90,
        overusedTrope: false,
      },
    });
    const muddy = fakeCandidate({
      id: "muddy",
      critique: {
        verdict: "ship",
        summary: "ok",
        strengths: [],
        flaws: [],
        reviseInstructions: [],
        falseLeadQuality: 40,
        ahaPredicted: 80,
        creativityScore: 74,
        iconRecognizability: 40,
        overusedTrope: false,
      },
    });
    const ranked = rankCandidates([muddy, crisp], 70);
    expect(ranked[0]?.id).toBe("crisp");
    expect(tournamentScore({ ...crisp, rubric: scoreRubric(crisp) }, 70)).toBeGreaterThan(
      tournamentScore({ ...muddy, rubric: scoreRubric(muddy) }, 70)
    );
  });
});

describe("visual polish gates", () => {
  it("flags missing or unreadable pictogram SVGs for polish", () => {
    const missing = fakeCandidate({
      visual: {
        styleId: "ink-pictogram-v1",
        mode: "composed",
        layout: "row",
        unicodeFallback: "🔑",
        layers: [{ kind: "pictogram", concept: "key", emojiFallback: "🔑" }],
      },
      critique: {
        verdict: "ship",
        summary: "ok",
        strengths: [],
        flaws: [],
        reviseInstructions: [],
        falseLeadQuality: 40,
        ahaPredicted: 70,
        creativityScore: 70,
        iconRecognizability: 80,
        overusedTrope: false,
      },
    });
    expect(candidateNeedsVisualPolish(missing)).toBe(true);
    expect(candidateNeedsVisualPolish(fakeCandidate())).toBe(false);
  });

  it("flags revise verdicts for a polish pass", () => {
    const revise = fakeCandidate({
      critique: {
        verdict: "revise",
        summary: "icons muddy",
        strengths: [],
        flaws: ["unclear key"],
        reviseInstructions: ["Redraw the key with teeth and a bow"],
        falseLeadQuality: 40,
        ahaPredicted: 70,
        creativityScore: 68,
        iconRecognizability: 48,
        overusedTrope: false,
      },
    });
    expect(candidateNeedsVisualPolish(revise)).toBe(true);
  });

  it("flags recognition failures for polish even when SVG exists", () => {
    const misread = fakeCandidate({
      visual: {
        styleId: "ink-pictogram-v1",
        mode: "composed",
        layout: "row",
        unicodeFallback: "🔑",
        layers: [
          {
            kind: "pictogram",
            concept: "key",
            emojiFallback: "🔑",
            svg: INK_PICTOGRAM_EXAMPLE_KEY,
            recognitionOk: false,
            seenAs: "spoon",
          },
        ],
      },
      critique: {
        verdict: "ship",
        summary: "ok",
        strengths: [],
        flaws: [],
        reviseInstructions: [],
        falseLeadQuality: 40,
        ahaPredicted: 70,
        creativityScore: 70,
        iconRecognizability: 80,
        overusedTrope: false,
      },
    });
    expect(candidateNeedsVisualPolish(misread)).toBe(true);
  });
});
