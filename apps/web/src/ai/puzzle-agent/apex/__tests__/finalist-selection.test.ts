import { INK_PICTOGRAM_EXAMPLE_KEY } from "../../visual/style";
import { selectQualifiedFinalist } from "../finalist-selection";
import type { ApexCandidate } from "../types";

function candidate(id: string, overall: number): ApexCandidate {
  return {
    id,
    rebusPuzzle: "key over key",
    answer: `${id} answer`,
    difficulty: 5,
    difficultyLevel: "Hard",
    explanation: "A literal spatial rebus.",
    category: "phrases",
    hints: ["Look at position.", "Read the objects together.", "It is a phrase."],
    techniqueId: "positional_phrase",
    visual: {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "stack",
      unicodeFallback: "key\nkey",
      layers: [
        {
          kind: "pictogram",
          concept: "key",
          emojiFallback: "key",
          svg: INK_PICTOGRAM_EXAMPLE_KEY,
        },
      ],
    },
    fingerprint: `fingerprint-${id}`,
    uniquenessScore: 90,
    calibratedDifficulty: 5,
    inBand: true,
    isUnique: true,
    solvable: true,
    qualityOverall: overall,
    funScore: 80,
    publishable: true,
    critique: {
      verdict: "ship",
      summary: "Strong candidate",
      strengths: ["clear"],
      flaws: [],
      reviseInstructions: [],
      falseLeadQuality: 70,
      ahaPredicted: overall,
      creativityScore: overall,
      iconRecognizability: 85,
      overusedTrope: false,
    },
    rubric: {
      ahaMoment: overall,
      fairness: overall,
      novelty: overall,
      visualCraft: overall,
      shareability: overall,
      techniqueFit: overall,
      hintCraft: overall,
      overall,
    },
    rejectReasons: [],
  };
}

describe("Apex rendered finalist selection", () => {
  it("fully evaluates only the top-ranked finalist when it qualifies", async () => {
    const evaluated: string[] = [];
    const top = candidate("top", 92);
    const runnerUp = candidate("runner-up", 84);

    const result = await selectQualifiedFinalist({
      candidates: [runnerUp, top],
      minRubricOverall: 78,
      canStartEvaluation: () => true,
      evaluate: async (value) => {
        evaluated.push(value.id);
        return value;
      },
    });

    expect(result.winner?.id).toBe("top");
    expect(evaluated).toEqual(["top"]);
  });

  it("evaluates a hard-gate-passing draft before requiring the final rubric", async () => {
    const draft = candidate("draft", 74);

    const result = await selectQualifiedFinalist({
      candidates: [draft],
      minRubricOverall: 78,
      canStartEvaluation: () => true,
      evaluate: async (value) => ({
        ...value,
        rubric: { ...value.rubric!, fairness: 90, overall: 82 },
      }),
    });

    expect(result.winner?.id).toBe("draft");
    expect(result.winner?.rubric?.overall).toBe(82);
  });

  it("evaluates the runner-up only after the first finalist is rejected", async () => {
    const evaluated: string[] = [];
    const top = candidate("top", 92);
    const runnerUp = candidate("runner-up", 84);

    const result = await selectQualifiedFinalist({
      candidates: [top, runnerUp],
      minRubricOverall: 78,
      canStartEvaluation: () => true,
      evaluate: async (value) => {
        evaluated.push(value.id);
        return value.id === "top"
          ? {
              ...value,
              publishable: false,
              rejectReasons: ["Rendered board objects not recognized: door"],
            }
          : value;
      },
    });

    expect(result.winner?.id).toBe("runner-up");
    expect(evaluated).toEqual(["top", "runner-up"]);
    expect(result.failures).toContain("Rendered board objects not recognized: door");
  });

  it("does not start another expensive evaluation after the runtime guard closes", async () => {
    const evaluated: string[] = [];
    let capacityChecks = 0;

    const result = await selectQualifiedFinalist({
      candidates: [candidate("top", 92), candidate("runner-up", 84)],
      minRubricOverall: 78,
      canStartEvaluation: () => {
        capacityChecks += 1;
        return capacityChecks === 1;
      },
      evaluate: async (value) => {
        evaluated.push(value.id);
        return {
          ...value,
          publishable: false,
          rejectReasons: ["Rendered board has clipped visual content"],
        };
      },
    });

    expect(result.winner).toBeNull();
    expect(evaluated).toEqual(["top"]);
    expect(result.failures).toEqual([
      "Rendered board has clipped visual content",
      "Rendered finalist evaluation stopped before runner-up to preserve the runtime deadline",
    ]);
  });

  it("reports why every draft was excluded before rendered evaluation", async () => {
    const rejected = {
      ...candidate("rejected", 90),
      publishable: false,
      critique: {
        ...candidate("rejected", 90).critique!,
        verdict: "revise" as const,
        summary: "The visual metaphor is ambiguous",
        reviseInstructions: ["Replace the abstract icon with a concrete silhouette"],
      },
      rejectReasons: ["Critique revise: Replace the abstract icon with a concrete silhouette"],
    };

    const result = await selectQualifiedFinalist({
      candidates: [rejected],
      minRubricOverall: 78,
      canStartEvaluation: () => true,
      evaluate: async (value) => value,
    });

    expect(result.winner).toBeNull();
    expect(result.failures).toContain(
      "rejected: Critique revise: Replace the abstract icon with a concrete silhouette"
    );
  });
});
