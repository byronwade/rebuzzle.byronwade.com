import {
  buildTrackRecord,
  getTrackRecordStart,
  isDailyDateKey,
  summarizeTrackRecord,
} from "../track-record";

describe("track-record", () => {
  // 2026-10-28 is a Wednesday.
  const today = "2026-10-28";

  it("starts on the Sunday 52 weeks before this week's Sunday", () => {
    expect(getTrackRecordStart(today)).toBe("2025-10-26");
    expect(getTrackRecordStart(today, 1)).toBe("2026-10-25");
  });

  it("fills whole weeks, Sunday first, padding days after today", () => {
    const days = buildTrackRecord({ today, joined: "2020-01-01", results: [] });
    expect(days).toHaveLength(53 * 7);
    expect(days[0]?.date).toBe("2025-10-26");
    expect(days.at(-1)?.date).toBe("2026-10-31");
    expect(days.at(-1)?.status).toBe("none");
  });

  it("marks solved, failed, missed and pending days", () => {
    const days = buildTrackRecord({
      today,
      joined: "2026-10-20",
      weeks: 2,
      results: [
        { date: "2026-10-21", solved: true, final: true },
        { date: "2026-10-22", solved: false, final: true },
        // Guessed but walked away without finishing: still never got it.
        { date: "2026-10-23", solved: false, final: false },
      ],
    });
    const status = Object.fromEntries(days.map((day) => [day.date, day.status]));
    expect(status["2026-10-19"]).toBe("none"); // before joining
    expect(status["2026-10-20"]).toBe("missed");
    expect(status["2026-10-21"]).toBe("solved");
    expect(status["2026-10-22"]).toBe("failed");
    expect(status["2026-10-23"]).toBe("failed");
    expect(status["2026-10-27"]).toBe("missed");
    expect(status[today]).toBe("pending");
    expect(status["2026-10-29"]).toBe("none");
    expect(summarizeTrackRecord(days)).toEqual({ solved: 1, failed: 2, missed: 5 });
  });

  it("shows today's result once it is decided", () => {
    const solved = buildTrackRecord({
      today,
      joined: today,
      weeks: 1,
      results: [{ date: today, solved: true, final: true }],
    });
    expect(solved.find((day) => day.date === today)?.status).toBe("solved");

    const inProgress = buildTrackRecord({
      today,
      joined: today,
      weeks: 1,
      results: [{ date: today, solved: false, final: false }],
    });
    expect(inProgress.find((day) => day.date === today)?.status).toBe("pending");
  });

  it("counts results older than the join date", () => {
    const days = buildTrackRecord({
      today,
      joined: "2026-10-27",
      weeks: 1,
      results: [{ date: "2026-10-26", solved: true, final: true }],
    });
    const status = Object.fromEntries(days.map((day) => [day.date, day.status]));
    expect(status["2026-10-25"]).toBe("none");
    expect(status["2026-10-26"]).toBe("solved");
    expect(status["2026-10-27"]).toBe("missed");
  });

  it("recognises daily lock keys only", () => {
    expect(isDailyDateKey("2026-10-28")).toBe(true);
    expect(isDailyDateKey("archive:abc")).toBe(false);
  });
});
