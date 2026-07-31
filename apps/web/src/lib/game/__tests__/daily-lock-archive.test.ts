import {
  ARCHIVE_POINTS_MULTIPLIER,
  getArchiveLockKey,
  isArchiveLockKey,
} from "@/lib/game/daily-lock";

describe("archive puzzle lock helpers", () => {
  it("uses a distinct lock key so archive plays do not collide with daily finals", () => {
    const key = getArchiveLockKey("puzzle-123");
    expect(key).toBe("archive:puzzle-123");
    expect(isArchiveLockKey(key)).toBe(true);
    expect(isArchiveLockKey("2026-07-31")).toBe(false);
  });

  it("awards half points for archive replays", () => {
    expect(ARCHIVE_POINTS_MULTIPLIER).toBe(0.5);
  });
});
