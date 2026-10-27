jest.mock("@/db", () => ({
  db: {
    userOps: { findById: jest.fn(), initializeJourneyTimeZone: jest.fn() },
    puzzleAttemptOps: { findNewestDailyTimeZone: jest.fn() },
  },
}));

import { db } from "@/db";
import { resolveStableJourneyTimeZone } from "../journey-timezone";

beforeEach(() => jest.clearAllMocks());

it("uses an existing account time zone without changing it", async () => {
  jest.mocked(db.userOps.findById).mockResolvedValue({ journeyTimeZone: "Europe/London" } as never);

  await expect(resolveStableJourneyTimeZone("user-1", "America/Los_Angeles")).resolves.toBe(
    "Europe/London"
  );
  expect(db.puzzleAttemptOps.findNewestDailyTimeZone).not.toHaveBeenCalled();
  expect(db.userOps.initializeJourneyTimeZone).not.toHaveBeenCalled();
});

it("initializes legacy accounts from their newest valid daily attempt zone", async () => {
  jest.mocked(db.userOps.findById).mockResolvedValue({ id: "user-1" } as never);
  jest.mocked(db.puzzleAttemptOps.findNewestDailyTimeZone).mockResolvedValue("Asia/Tokyo");
  jest.mocked(db.userOps.initializeJourneyTimeZone).mockResolvedValue("Asia/Tokyo");

  await expect(resolveStableJourneyTimeZone("user-1", "America/Los_Angeles")).resolves.toBe(
    "Asia/Tokyo"
  );
  expect(db.userOps.initializeJourneyTimeZone).toHaveBeenCalledWith("user-1", "Asia/Tokyo");
});

it("uses the request zone when no persisted daily zone exists", async () => {
  jest.mocked(db.userOps.findById).mockResolvedValue({ id: "user-1" } as never);
  jest.mocked(db.puzzleAttemptOps.findNewestDailyTimeZone).mockResolvedValue(null);
  jest.mocked(db.userOps.initializeJourneyTimeZone).mockResolvedValue("America/Los_Angeles");

  await expect(resolveStableJourneyTimeZone("user-1", "America/Los_Angeles")).resolves.toBe(
    "America/Los_Angeles"
  );
});

it("returns the atomically initialized winner when two devices race", async () => {
  jest.mocked(db.userOps.findById).mockResolvedValue({ id: "user-1" } as never);
  jest.mocked(db.puzzleAttemptOps.findNewestDailyTimeZone).mockResolvedValue(null);
  jest.mocked(db.userOps.initializeJourneyTimeZone).mockResolvedValue("Europe/Paris");

  await expect(resolveStableJourneyTimeZone("user-1", "America/Los_Angeles")).resolves.toBe(
    "Europe/Paris"
  );
});

it("falls back to UTC when the account and request zones are unusable", async () => {
  jest.mocked(db.userOps.findById).mockResolvedValue({ id: "user-1" } as never);
  jest.mocked(db.puzzleAttemptOps.findNewestDailyTimeZone).mockResolvedValue("Mars/Phobos");
  jest.mocked(db.userOps.initializeJourneyTimeZone).mockResolvedValue("UTC");

  await expect(resolveStableJourneyTimeZone("user-1", "Mars/Phobos")).resolves.toBe("UTC");
});

it("repairs an invalid saved zone atomically without replacing a concurrent valid zone", async () => {
  jest
    .mocked(db.userOps.findById)
    .mockResolvedValue({ id: "user-1", journeyTimeZone: "Mars/Phobos" } as never);
  jest.mocked(db.puzzleAttemptOps.findNewestDailyTimeZone).mockResolvedValue("Asia/Tokyo");
  jest.mocked(db.userOps.initializeJourneyTimeZone).mockResolvedValue("Europe/Paris");

  await expect(resolveStableJourneyTimeZone("user-1", "America/Los_Angeles")).resolves.toBe(
    "Europe/Paris"
  );
  expect(db.userOps.initializeJourneyTimeZone).toHaveBeenCalledWith(
    "user-1",
    "Asia/Tokyo",
    "Mars/Phobos"
  );
});

it("repairs a malformed non-string saved zone with the observed value", async () => {
  jest.mocked(db.userOps.findById).mockResolvedValue({ id: "user-1", journeyTimeZone: 0 } as never);
  jest.mocked(db.puzzleAttemptOps.findNewestDailyTimeZone).mockResolvedValue(null);
  jest.mocked(db.userOps.initializeJourneyTimeZone).mockResolvedValue("America/Los_Angeles");

  await expect(resolveStableJourneyTimeZone("user-1", "America/Los_Angeles")).resolves.toBe(
    "America/Los_Angeles"
  );
  expect(db.userOps.initializeJourneyTimeZone).toHaveBeenCalledWith(
    "user-1",
    "America/Los_Angeles",
    0
  );
});
