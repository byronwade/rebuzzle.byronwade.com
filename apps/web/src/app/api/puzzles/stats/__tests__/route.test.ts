jest.mock("@/db/mongodb", () => ({ ensureConnection: jest.fn(), getCollection: jest.fn() }));
jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimiters: { public: jest.fn().mockResolvedValue({ success: true }) },
}));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn().mockResolvedValue("UTC") }));
jest.mock("@/lib/journey-timezone", () => ({
  resolveStableJourneyTimeZone: jest.fn().mockResolvedValue("America/Los_Angeles"),
}));

import { getCollection } from "@/db/mongodb";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { GET } from "../route";

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-10-26T03:30:00.000Z"));
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "user-1" } as never);
  jest.mocked(resolveStableJourneyTimeZone).mockResolvedValue("America/Los_Angeles");
  const cursor = {
    find: jest.fn().mockReturnThis(),
    project: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue([]),
  };
  jest.mocked(getCollection).mockReturnValue(cursor as never);
});
afterEach(() => jest.useRealTimers());

it("uses the saved account zone for the public daily stats date and prevents shared caching", async () => {
  const request = new Request("https://rebuzzle.test/api/puzzles/stats?puzzleId=today", {
    headers: { Authorization: "Bearer test-token" },
  });

  const response = await GET(request);

  expect(response.status).toBe(200);
  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("user-1", "UTC");
  const collection = jest.mocked(getCollection).mock.results[0]!.value as {
    find: jest.Mock;
  };
  expect(collection.find).toHaveBeenCalledWith({
    isCorrect: true,
    $or: [
      { puzzleDate: "2026-10-25" },
      {
        attemptedAt: {
          $gte: new Date("2026-10-25T00:00:00.000Z"),
          $lte: new Date("2026-10-25T23:59:59.999Z"),
        },
      },
    ],
    puzzleId: "today",
  });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
