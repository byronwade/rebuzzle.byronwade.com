import { type ChallengeEntry, type ChallengeLineProgress, evaluateChallenges } from "../evaluate";

const entry = (overrides: Partial<ChallengeEntry> = {}): ChallengeEntry => ({
  puzzleDate: "2026-10-19",
  outcome: "solved",
  attempts: 2,
  hintCount: 1,
  completedAt: new Date("2026-10-19T17:00:00.000Z"),
  timeZone: "America/New_York",
  ...overrides,
});

/** Consecutive puzzle dates starting at `start`, each solved on attempt 2 with a hint. */
const run = (start: string, days: number, overrides: Partial<ChallengeEntry> = {}) =>
  Array.from({ length: days }, (_, index) => {
    const date = new Date(`${start}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    const puzzleDate = date.toISOString().slice(0, 10);
    return entry({
      puzzleDate,
      completedAt: new Date(`${puzzleDate}T17:00:00.000Z`),
      ...overrides,
    });
  });

const line = (result: ReturnType<typeof evaluateChallenges>, id: string): ChallengeLineProgress => {
  const found = result.lines.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`missing line ${id}`);
  return found;
};

describe("evaluateChallenges", () => {
  it("lists every line locked for an empty history", () => {
    const result = evaluateChallenges([]);

    expect(result.tiersTotal).toBe(58);
    expect(result.tiersUnlocked).toBe(0);
    expect(result.challengeXP).toBe(0);
    expect(result.lines).toHaveLength(14);
    expect(result.categories.map((category) => category.id)).toEqual([
      "devotion",
      "precision",
      "grit",
      "rhythm",
      "secrets",
    ]);
    expect(result.categories.every((category) => !category.mastered)).toBe(true);
    expect(line(result, "dailies")).toMatchObject({
      value: 0,
      tier: 0,
      thresholds: [1, 7, 30, 100, 365],
      unlockedAt: [null, null, null, null, null],
    });
  });

  it("unlocks first tiers from a single first-guess solve without a nudge", () => {
    const result = evaluateChallenges([entry({ attempts: 1, hintCount: 0 })]);

    expect(line(result, "dailies")).toMatchObject({ value: 1, tier: 1 });
    expect(line(result, "first-guess")).toMatchObject({ value: 1, tier: 1 });
    expect(line(result, "solves")).toMatchObject({ value: 1, tier: 1 });
    expect(line(result, "unassisted")).toMatchObject({ value: 1, tier: 0 });
    expect(result.challengeXP).toBe(75);
    expect(result.tiersUnlocked).toBe(3);
  });

  it("counts a Monday-to-Sunday run as a streak, trail, and perfect week", () => {
    const result = evaluateChallenges(run("2026-10-19", 7));

    expect(line(result, "streak")).toMatchObject({ value: 7, tier: 2 });
    expect(line(result, "dailies")).toMatchObject({ value: 7, tier: 2 });
    expect(line(result, "trails")).toMatchObject({ value: 1, tier: 1 });
    expect(line(result, "perfect-weeks")).toMatchObject({ value: 1, tier: 1 });
  });

  it("keeps the best streak after a missed day", () => {
    const result = evaluateChallenges([...run("2026-10-01", 3), ...run("2026-10-05", 2)]);

    expect(line(result, "streak")).toMatchObject({ value: 3, tier: 1 });
  });

  it("groups weeks from Monday so Sunday and Monday fall in different weeks", () => {
    // Sat, Sun | Mon, Tue: two days in each week, so no three-day trail.
    const result = evaluateChallenges(run("2026-10-24", 4));

    expect(line(result, "trails").value).toBe(0);
    expect(line(result, "perfect-weeks").value).toBe(0);
  });

  it("counts failures as finishes but not as solves", () => {
    const result = evaluateChallenges([
      entry({ puzzleDate: "2026-10-19", outcome: "failed", attempts: 3, hintCount: null }),
      entry({ puzzleDate: "2026-10-20", completedAt: new Date("2026-10-20T17:00:00.000Z") }),
    ]);

    expect(line(result, "dailies").value).toBe(2);
    expect(line(result, "streak").value).toBe(2);
    expect(line(result, "solves").value).toBe(1);
    expect(line(result, "unassisted").value).toBe(0);
  });

  it("separates third-guess saves from extended solves", () => {
    const result = evaluateChallenges([
      entry({ puzzleDate: "2026-10-19", attempts: 3 }),
      entry({ puzzleDate: "2026-10-20", attempts: 5, playMode: "extended" }),
      entry({ puzzleDate: "2026-10-21", outcome: "failed", attempts: 6, playMode: "extended" }),
    ]);

    expect(line(result, "clutch").value).toBe(1);
    expect(line(result, "extended").value).toBe(1);
  });

  it("reads solve time in the entry's own time zone", () => {
    const result = evaluateChallenges([
      // 07:59 and 08:00 in New York (EDT, UTC-4).
      entry({ puzzleDate: "2026-10-19", completedAt: new Date("2026-10-19T11:59:00.000Z") }),
      entry({ puzzleDate: "2026-10-20", completedAt: new Date("2026-10-20T12:00:00.000Z") }),
      // 22:00 in New York.
      entry({ puzzleDate: "2026-10-21", completedAt: new Date("2026-10-22T02:00:00.000Z") }),
      // Unknown zone never counts.
      entry({
        puzzleDate: "2026-10-22",
        completedAt: new Date("2026-10-22T03:00:00.000Z"),
        timeZone: null,
      }),
    ]);

    expect(line(result, "early-bird").value).toBe(1);
    expect(line(result, "night-owl").value).toBe(1);
  });

  it("hides locked secrets and reveals one once its date is finished", () => {
    const locked = evaluateChallenges([entry()]);
    expect(line(locked, "new-year")).toEqual({
      id: "new-year",
      category: "secrets",
      title: null,
      description: null,
      secret: true,
      value: null,
      thresholds: [1],
      tier: 0,
      unlockedAt: [null],
    });

    const found = evaluateChallenges([
      entry({ puzzleDate: "2027-01-01", completedAt: new Date("2027-01-01T17:00:00.000Z") }),
    ]);
    expect(line(found, "new-year")).toMatchObject({
      title: "Fresh start",
      value: 1,
      tier: 1,
      unlockedAt: ["2027-01-01"],
    });
    expect(found.challengeXP).toBe(25 + 25 + 100);
  });

  it("records the puzzle date each tier was first reached", () => {
    const result = evaluateChallenges(run("2026-09-01", 7).reverse());

    expect(line(result, "dailies").unlockedAt).toEqual([
      "2026-09-01",
      "2026-09-07",
      null,
      null,
      null,
    ]);
  });

  it("masters a category only when every line in it reaches tier five", () => {
    const precision = evaluateChallenges(run("2026-01-01", 300, { attempts: 1, hintCount: 0 }));

    expect(line(precision, "first-guess").tier).toBe(5);
    expect(line(precision, "unassisted").tier).toBe(5);
    expect(precision.categories.find((category) => category.id === "precision")?.mastered).toBe(
      true
    );
    expect(precision.categories.find((category) => category.id === "devotion")?.mastered).toBe(
      false
    );
  });
});
