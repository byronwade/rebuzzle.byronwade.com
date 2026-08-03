import { getStreakTease } from "../streak-tease";

describe("getStreakTease", () => {
  it("encourages a fresh start after a loss", () => {
    expect(getStreakTease(0, false)).toMatch(/Start a streak tomorrow/i);
    expect(getStreakTease(4, false)).toMatch(/Streak reset/i);
  });

  it("quietly notes a streak freeze save", () => {
    expect(getStreakTease(7, false, { streakFrozen: true, freezesLeft: 0 })).toMatch(
      /Streak held at 7/i
    );
  });

  it("marks milestone streaks without FOMO copy", () => {
    expect(getStreakTease(7, true)).toBe("7-day streak. See you tomorrow.");
  });

  it("teases the next milestone lightly", () => {
    expect(getStreakTease(5, true)).toMatch(/2 days to a 7-day streak/i);
    expect(getStreakTease(6, true)).toMatch(/One more day for a 7-day streak/i);
    expect(getStreakTease(5, true)).not.toMatch(/Protect/i);
  });
});
