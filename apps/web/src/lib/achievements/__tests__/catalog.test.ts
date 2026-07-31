import { ALL_ACHIEVEMENTS, getAchievementById } from "@rebuzzle/game-logic";

describe("achievement catalog", () => {
  it("contains exactly 100 achievements with unique ids and orders", () => {
    expect(ALL_ACHIEVEMENTS).toHaveLength(100);
    const ids = ALL_ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(100);
    const orders = ALL_ACHIEVEMENTS.map((a) => a.order);
    expect(new Set(orders).size).toBe(100);
  });

  it("defines Social Butterfly as share_first with share_result criteria", () => {
    const share = getAchievementById("share_first");
    expect(share).toBeDefined();
    expect(share?.name).toBe("Social Butterfly");
    expect(share?.criteria).toEqual({ type: "share_result" });
    expect(getAchievementById("share_result")).toBeUndefined();
  });

  it("keeps rarity and category fields populated", () => {
    for (const achievement of ALL_ACHIEVEMENTS) {
      expect(achievement.rarity).toBeTruthy();
      expect(achievement.category).toBeTruthy();
      expect(achievement.points).toBeGreaterThan(0);
    }
  });
});
