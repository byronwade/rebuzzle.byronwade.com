import { calculateDifficultyProfile } from "../difficulty-profile";

const puzzle = {
  rebusPuzzle: "12345",
  answer: "one two three four five six seven eight nine ten eleven twelve",
  explanation: "",
  category: "wordplay",
};

describe("difficulty evidence", () => {
  it("keeps every dimension within the published scale", () => {
    for (const score of Object.values(calculateDifficultyProfile(puzzle))) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });
  it("does not count ordinary digits as emoji", () => {
    expect(calculateDifficultyProfile(puzzle).visualAmbiguity).toBe(1);
    expect(calculateDifficultyProfile({ ...puzzle, rebusPuzzle: "👁️" }).visualAmbiguity).toBe(1.5);
  });
});
