import { biasTechniquesBySolveRates } from "../technique-calibration";

describe("technique-family difficulty calibrator", () => {
  const preferred = ["simple_compound", "false_lead_visual", "positional_phrase"] as const;

  const rates = [
    { techniqueId: "simple_compound", sampleSize: 12, solveRate: 0.92 },
    { techniqueId: "false_lead_visual", sampleSize: 8, solveRate: 0.35 },
    { techniqueId: "positional_phrase", sampleSize: 6, solveRate: 0.55 },
  ];

  it("demotes high-solve techniques when the window is too easy", () => {
    const result = biasTechniquesBySolveRates({
      preferredTechniques: [...preferred],
      rates,
      tooEasy: true,
      tooHard: false,
    });
    expect(result.techniques[0]).toBe("false_lead_visual");
    expect(result.techniques.at(-1)).toBe("simple_compound");
    expect(result.notes[0]).toMatch(/too easy/i);
  });

  it("promotes friendlier techniques when the window is too hard", () => {
    const result = biasTechniquesBySolveRates({
      preferredTechniques: [...preferred],
      rates,
      tooEasy: false,
      tooHard: true,
    });
    expect(result.techniques[0]).toBe("simple_compound");
    expect(result.notes[0]).toMatch(/too hard/i);
  });

  it("keeps order when pressure is balanced or samples are thin", () => {
    expect(
      biasTechniquesBySolveRates({
        preferredTechniques: [...preferred],
        rates,
        tooEasy: false,
        tooHard: false,
      }).techniques
    ).toEqual([...preferred]);

    expect(
      biasTechniquesBySolveRates({
        preferredTechniques: [...preferred],
        rates: [{ techniqueId: "simple_compound", sampleSize: 1, solveRate: 0.99 }],
        tooEasy: true,
        tooHard: false,
      }).techniques
    ).toEqual([...preferred]);
  });
});
