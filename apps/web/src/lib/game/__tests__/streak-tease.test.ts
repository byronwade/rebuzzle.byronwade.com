import { getStreakTease } from "../streak-tease";

describe("getStreakTease", () => {
  it("encourages a fresh start after a loss", () => {
    expect(getStreakTease(0, false)).toMatch(/Start a streak tomorrow/i);
    expect(getStreakTease(4, false)).toMatch(/Streak reset/i);
  });

  it("celebrates milestone streaks", () => {
    expect(getStreakTease(7, true)).toMatch(/7-day streak locked in/i);
  });

  it("teases the next milestone", () => {
    expect(getStreakTease(5, true)).toMatch(/2 days to a 7-day streak/i);
    expect(getStreakTease(6, true)).toMatch(/One more day for a 7-day streak/i);
  });
});
