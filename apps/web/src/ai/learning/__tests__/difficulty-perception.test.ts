import {
  aggregatePerceptionDelta,
  isDifficultyPerceptionChoice,
  mapDifficultyPerception,
} from "../difficulty-perception";

describe("difficulty perception", () => {
  it("maps three-way votes to schema fields", () => {
    expect(mapDifficultyPerception("too_easy").metrics.tooEasy).toBe(true);
    expect(mapDifficultyPerception("too_hard").metrics.tooHard).toBe(true);
    expect(mapDifficultyPerception("just_right").learningDeltaHint).toBe(0);
  });

  it("validates choice strings", () => {
    expect(isDifficultyPerceptionChoice("too_easy")).toBe(true);
    expect(isDifficultyPerceptionChoice("nope")).toBe(false);
  });

  it("aggregates perception into a learning delta", () => {
    const easy = aggregatePerceptionDelta({
      tooEasy: 12,
      justRight: 3,
      tooHard: 1,
    });
    expect(easy.delta).toBeGreaterThan(0);

    const hard = aggregatePerceptionDelta({
      tooEasy: 1,
      justRight: 2,
      tooHard: 10,
    });
    expect(hard.delta).toBeLessThan(0);

    const thin = aggregatePerceptionDelta({
      tooEasy: 2,
      justRight: 1,
      tooHard: 0,
    });
    expect(thin.delta).toBe(0);
  });
});
