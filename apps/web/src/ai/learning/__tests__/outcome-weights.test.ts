import { loadOutcomeWeights } from "../outcome-weights";

describe("outcome weights", () => {
  it("returns a safe empty-ish structure when data is thin", async () => {
    const weights = await loadOutcomeWeights({ lookbackDays: 1, minFinalsPerTechnique: 99 });
    expect(Array.isArray(weights.preferTechniques)).toBe(true);
    expect(Array.isArray(weights.avoidTechniques)).toBe(true);
    expect(weights.preferAnswerPatterns.length).toBeGreaterThan(0);
    expect(weights.notes.length).toBeGreaterThan(0);
  });
});
