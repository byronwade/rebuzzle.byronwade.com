import { buildDailyPostmortem } from "../daily-postmortem";

describe("daily postmortem", () => {
  it("returns a structured postmortem even without DB puzzle", async () => {
    const pm = await buildDailyPostmortem({
      date: new Date("2000-01-01T12:00:00.000Z"),
    });
    expect(pm.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(pm.rules.length).toBeGreaterThan(0);
    expect(pm.promptBlock.length).toBeGreaterThan(10);
    expect(["too_easy", "too_hard", "healthy", "unknown"]).toContain(pm.verdict);
  });
});
