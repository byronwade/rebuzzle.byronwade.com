import { getStreakTease } from "../streak-tease";

describe("getStreakTease", () => {
  it("keeps the streak after a loss", () => {
    expect(getStreakTease(0, false)).toMatch(/Start a streak tomorrow/i);
    expect(getStreakTease(4, false)).toMatch(/Streak held at 4/i);
    expect(getStreakTease(4, false)).not.toMatch(/reset/i);
  });

  it("notes when a freeze covered a missed day", () => {
    expect(getStreakTease(8, true, { streakFrozen: true, freezesLeft: 0 })).toMatch(
      /freeze covered the day you missed/i
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
