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

  it("prepares only the top-ranked finalist when its rendered evidence qualifies", async () => {
    const prepared: string[] = [];
    const result = await selectQualifiedFinalist({
      candidates: [candidate("runner-up", 84), candidate("top", 92)],
      minRubricOverall: 78,
      canStartEvaluation: () => true,
      evaluate: async (value) => value,
      prepare: async (value: ApexCandidate) => {
        prepared.push(value.id);
        return value;
      },
    } as Parameters<typeof selectQualifiedFinalist>[0] & {
      prepare: (value: ApexCandidate) => Promise<ApexCandidate>;
    });

    expect(result.winner?.id).toBe("top");
    expect(prepared).toEqual(["top"]);
  });

  it("prepares the runner-up only after the first finalist fails rendered gates", async () => {
    const prepared: string[] = [];
    const result = await selectQualifiedFinalist({
      candidates: [candidate("top", 92), candidate("runner-up", 84)],
      minRubricOverall: 78,
      canStartEvaluation: () => true,
      prepare: async (value: ApexCandidate) => {
        prepared.push(value.id);
        return value;
      },
      evaluate: async (value) => ({
        ...value,
        publishable: value.id !== "top",
        rejectReasons: value.id === "top" ? ["Rendered board was not recognized"] : [],
      }),
    } as Parameters<typeof selectQualifiedFinalist>[0] & {
      prepare: (value: ApexCandidate) => Promise<ApexCandidate>;
    });

    expect(result.winner?.id).toBe("runner-up");
    expect(prepared).toEqual(["top", "runner-up"]);
  });

  it("uses one actionable critique revision before falling back to the runner-up", async () => {
    const prepared: string[] = [];
    const evaluated: string[] = [];
    const revisions: string[] = [];
    const top = candidate("top", 92);
    const runnerUp = candidate("runner-up", 84);
    const revised = candidate("top-revision", 91);

    const result = await selectQualifiedFinalist({
      candidates: [top, runnerUp],
      minRubricOverall: 78,
      canStartEvaluation: () => true,
      canStartRevision: () => true,
      prepare: async (value: ApexCandidate) => {
        prepared.push(value.id);
        if (value.id !== "top") return value;
        return {
          ...value,
          publishable: false,
          critique: {
            ...value.critique!,
            source: "model" as const,
            verdict: "revise" as const,
            summary: "The icon needs a more concrete silhouette",
            reviseInstructions: ["Replace the abstract icon with a concrete silhouette"],
          },
          rejectReasons: ["Critique revise: Replace the abstract icon with a concrete silhouette"],
        };
      },
      revise: async (value: ApexCandidate) => {
        revisions.push(value.id);
        return revised;
      },
      evaluate: async (value) => {
        evaluated.push(value.id);
        return value;
      },
    });

    expect(result.winner?.id).toBe("top-revision");
    expect(result.ranked.map((value) => value.id)).toEqual(["top-revision", "runner-up"]);
    expect(prepared).toEqual(["top", "top-revision"]);
    expect(revisions).toEqual(["top"]);
    expect(evaluated).toEqual(["top-revision"]);
  });

  it("does not spend a revision when critique is only a fallback", async () => {
    const revise = jest.fn(async () => candidate("revision", 90));
    const fallback = {
      ...candidate("fallback", 92),
      publishable: false,
      critique: {
        ...candidate("fallback", 92).critique!,
        source: "fallback" as const,
        verdict: "revise" as const,
        summary: "Critique unavailable — treat as provisional",
        reviseInstructions: ["Retry later"],
      },
      rejectReasons: ["Critique unavailable — treat as provisional"],
    };

    const result = await selectQualifiedFinalist({
      candidates: [fallback],
      minRubricOverall: 78,
      canStartEvaluation: () => true,
      canStartRevision: () => true,
      revise,
      evaluate: async (value) => value,
    });

    expect(result.winner).toBeNull();
    expect(revise).not.toHaveBeenCalled();
    expect(result.failures).toContain("fallback: Critique unavailable — treat as provisional");
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
