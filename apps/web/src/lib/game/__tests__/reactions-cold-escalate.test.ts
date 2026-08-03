import { buildGuessReaction } from "../reactions";

describe("buildGuessReaction cold escalation", () => {
  it("uses the base cold pool on the first cold", () => {
    const reaction = buildGuessReaction({
      correct: false,
      similarity: 10,
      attemptsLeft: 2,
      guess: "banana split",
      consecutiveCold: 0,
    });
    expect(reaction.tier).toBe("cold");
    expect(reaction.line).not.toMatch(/Cold streak|Two swings|collecting misses/i);
  });

  it("uses sharper lines after two consecutive colds", () => {
    const reaction = buildGuessReaction({
      correct: false,
      similarity: 10,
      attemptsLeft: 1,
      guess: "banana split",
      consecutiveCold: 2,
    });
    expect(reaction.tier).toBe("cold");
    expect(reaction.line).toMatch(
      /Still cold|Two swings|collecting misses|Persistence noted|Cold streak/i
    );
  });
});
