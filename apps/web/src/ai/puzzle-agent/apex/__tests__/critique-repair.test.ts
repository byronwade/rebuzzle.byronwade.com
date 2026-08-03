import { buildCritiqueRepairParams, critiqueRepairIssues } from "../critique-repair";

describe("critique-locked repair specialist", () => {
  const cuePlan = [
    { kind: "catalog" as const, concept: "key", role: "word-part" as const },
    { kind: "text" as const, content: "BOARD", role: "word-part" as const },
  ];

  it("requires locked answer, cue plan, and revise instructions", () => {
    expect(
      critiqueRepairIssues({
        answer: "keyboard",
        answerSeedCuePlan: cuePlan,
        reviseInstructions: ["Replace the abstract icon"],
      })
    ).toEqual([]);

    expect(
      critiqueRepairIssues({
        answer: "keyboard",
        reviseInstructions: ["Replace the abstract icon"],
      })
    ).toContain("Critique repair requires a locked answer-seed cue plan");
  });

  it("builds ToolLoop params that lock answer/cues and disable invent seeds", () => {
    const params = buildCritiqueRepairParams({
      answer: "keyboard",
      answerSeedCuePlan: cuePlan,
      techniqueId: "simple_compound",
      reviseInstructions: ["Use a clearer key silhouette"],
      preferredTechniques: ["simple_compound", "positional_phrase"],
      targetDifficulty: 5,
      qualityThreshold: 74,
      briefSummary: "test brief",
    });

    expect(params.repairMode).toBe("critique-locked");
    expect(params.answerSeed).toBe("keyboard");
    expect(params.answerSeedCuePlan).toEqual(cuePlan);
    expect(params.revisionInstructions).toEqual(["Use a clearer key silhouette"]);
    expect(params.maxAttempts).toBe(1);
    expect(params.modelChainLimit).toBe(1);
    expect(params.phraseSeeds).toEqual([]);
    expect(params.preferredTechniques?.[0]).toBe("simple_compound");
  });

  it("throws when the repair cannot stay locked", () => {
    expect(() =>
      buildCritiqueRepairParams({
        answer: "keyboard",
        techniqueId: "simple_compound",
        reviseInstructions: ["fix it"],
        targetDifficulty: 5,
      })
    ).toThrow(/locked answer-seed cue plan/i);
  });
});
