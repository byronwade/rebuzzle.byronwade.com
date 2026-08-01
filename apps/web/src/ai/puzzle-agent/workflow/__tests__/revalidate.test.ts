import type { ApexCandidate } from "../../apex/types";
import { INK_PICTOGRAM_EXAMPLE_EYE } from "../../visual/style";
import { revalidateCandidateAfterPolish } from "../revalidate";

function baseCandidate(overrides: Partial<ApexCandidate> = {}): ApexCandidate {
  return {
    id: "c1",
    rebusPuzzle: "👁 + 🔑",
    answer: "key eye",
    difficulty: 8,
    difficultyLevel: "Impossible",
    explanation:
      "Eye pictogram plus key pictogram map to the phrase because each half is spoken in order.",
    category: "visual",
    hints: [
      "Think about a familiar compound sound.",
      "Two concrete icons join.",
      "The device is concatenation.",
      'Final nudge: starts with "K".',
    ],
    techniqueId: "triple_layer_composition",
    visual: {
      mode: "composed",
      layout: "row",
      styleId: "ink-pictogram-v1",
      layers: [
        {
          kind: "pictogram",
          concept: "eye",
          svg: INK_PICTOGRAM_EXAMPLE_EYE,
          recognitionOk: true,
        },
      ],
      unicodeFallback: "👁 + 🔑",
    },
    fingerprint: "fp",
    uniquenessScore: 80,
    calibratedDifficulty: 8,
    inBand: true,
    isUnique: true,
    solvable: true,
    qualityOverall: 80,
    funScore: 72,
    publishable: true,
    rejectReasons: [],
    rubric: {
      ahaMoment: 80,
      fairness: 80,
      novelty: 80,
      visualCraft: 80,
      shareability: 80,
      techniqueFit: 80,
      hintCraft: 80,
      overall: 80,
    },
    ...overrides,
  };
}

describe("revalidateCandidateAfterPolish", () => {
  it("rejects when multi-solve fails", () => {
    const result = revalidateCandidateAfterPolish(baseCandidate(), 8, {
      multiSolveOk: false,
      multiSolveReasons: ["No solver found answer"],
    });
    expect(result.ok).toBe(false);
    expect(result.candidate.publishable).toBe(false);
    expect(result.candidate.solvable).toBe(false);
  });

  it("rejects Hard-only technique at Impossible target", () => {
    const result = revalidateCandidateAfterPolish(
      baseCandidate({ techniqueId: "simple_compound" }),
      8,
      { multiSolveOk: true }
    );
    expect(result.ok).toBe(false);
    expect(result.candidate.rejectReasons.join(" ")).toMatch(/not allowed/i);
  });

  it("rejects provisional critique", () => {
    const result = revalidateCandidateAfterPolish(baseCandidate(), 8, {
      multiSolveOk: true,
      critiqueProvisional: true,
    });
    expect(result.ok).toBe(false);
  });

  it("passes a clean Impossible candidate", () => {
    const result = revalidateCandidateAfterPolish(baseCandidate(), 8, {
      multiSolveOk: true,
      critiqueProvisional: false,
    });
    expect(result.ok).toBe(true);
    expect(result.candidate.publishable).toBe(true);
  });
});
