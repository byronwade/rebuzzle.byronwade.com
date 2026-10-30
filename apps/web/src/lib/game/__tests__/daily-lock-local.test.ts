import {
  addCalendarDays,
  getLocalPuzzleDate,
  getNextLocalMidnight,
  getUtcPuzzleDate,
  getZonedMidnightUtc,
  isLocalPuzzleDateLiveSomewhere,
  isValidIanaTimeZone,
} from "@/lib/game/daily-lock";

describe("local midnight unlock helpers", () => {
  it("validates IANA time zones", () => {
    expect(isValidIanaTimeZone("America/New_York")).toBe(true);
    expect(isValidIanaTimeZone("UTC")).toBe(true);
    expect(isValidIanaTimeZone("Not/A_Zone")).toBe(false);
    expect(isValidIanaTimeZone("")).toBe(false);
  });

  it("returns the Eastern calendar day while UTC has already rolled over", () => {
    // 2026-08-04 01:30 UTC → still Aug 3 evening in New York (EDT, UTC-4)
    const instant = new Date("2026-08-04T01:30:00.000Z");
    expect(getUtcPuzzleDate(instant)).toBe("2026-08-04");
    expect(getLocalPuzzleDate(instant, "America/New_York")).toBe("2026-08-03");
  });

  it("returns the Tokyo calendar day before UTC midnight", () => {
    // 2026-08-03 16:00 UTC → Aug 4 01:00 in Tokyo (UTC+9)
    const instant = new Date("2026-08-03T16:00:00.000Z");
    expect(getUtcPuzzleDate(instant)).toBe("2026-08-03");
    expect(getLocalPuzzleDate(instant, "Asia/Tokyo")).toBe("2026-08-04");
  });

  it("computes next local midnight for America/New_York", () => {
    const instant = new Date("2026-08-03T20:00:00.000Z"); // 4pm EDT
    const next = getNextLocalMidnight(instant, "America/New_York");
    expect(next.toISOString()).toBe("2026-08-04T04:00:00.000Z"); // midnight EDT
    expect(getLocalPuzzleDate(next, "America/New_York")).toBe("2026-08-04");
  });

  it("computes zoned midnight for Asia/Tokyo", () => {
    const midnight = getZonedMidnightUtc("2026-08-04", "Asia/Tokyo");
    expect(midnight.toISOString()).toBe("2026-08-03T15:00:00.000Z");
  });

  it("adds calendar days without timezone drift", () => {
    expect(addCalendarDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("treats a date as live while it is the local day anywhere on Earth", () => {
    // 12:00 UTC Oct 28 → Oct 29 in Auckland, Oct 28 in Honolulu.
    const noonUtc = new Date("2026-10-28T12:00:00.000Z");
    expect(isLocalPuzzleDateLiveSomewhere("2026-10-28", noonUtc)).toBe(true);
    expect(isLocalPuzzleDateLiveSomewhere("2026-10-29", noonUtc)).toBe(true);
    expect(isLocalPuzzleDateLiveSomewhere("2026-10-27", noonUtc)).toBe(false);
    expect(isLocalPuzzleDateLiveSomewhere("2026-10-30", noonUtc)).toBe(false);

    // 02:00 UTC Oct 29 → still Oct 28 west of UTC.
    const earlyUtc = new Date("2026-10-29T02:00:00.000Z");
    expect(isLocalPuzzleDateLiveSomewhere("2026-10-28", earlyUtc)).toBe(true);
    expect(isLocalPuzzleDateLiveSomewhere("2026-10-27", earlyUtc)).toBe(false);
  });
});
