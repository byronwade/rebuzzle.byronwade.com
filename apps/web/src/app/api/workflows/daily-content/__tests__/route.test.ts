const generateNextPuzzle = jest.fn();
const getTodaysPuzzle = jest.fn();
const runLearningCalibration = jest.fn();
const findOne = jest.fn();
const proposeBlogForPuzzle = jest.fn();
const revalidateTag = jest.fn();

jest.mock("@/app/actions/puzzleGenerationActions", () => ({
  generateNextPuzzle,
  getTodaysPuzzle,
}));
jest.mock("@/ai/learning", () => ({ runLearningCalibration }));
jest.mock("@/db/mongodb", () => ({
  getCollection: () => ({ findOne }),
}));
jest.mock("@/lib/blog/propose-puzzle-blog", () => ({ proposeBlogForPuzzle }));
jest.mock("next/cache", () => ({ revalidateTag }));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { nextUtcDateKey, POST } from "../route";

describe("daily content workflow", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-08-02T23:59:00.000Z"));
    process.env.CRON_SECRET = "test-cron-secret";
    runLearningCalibration.mockResolvedValue({
      adaptive: { target: 7, baseline: 6, delta: 1, reason: "test" },
      eventId: "learning-event",
    });
    generateNextPuzzle.mockResolvedValue({
      success: true,
      cached: true,
      puzzle: { id: "today-puzzle" },
    });
    getTodaysPuzzle.mockResolvedValue({
      success: true,
      cached: false,
      aiGenerated: true,
      puzzle: { id: "next-puzzle" },
    });
    findOne.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it("computes the next publication date in UTC", () => {
    expect(nextUtcDateKey(new Date("2026-12-31T23:59:59.000Z"))).toBe("2027-01-01");
  });

  it("pre-generates tomorrow with fail-closed AI settings", async () => {
    const response = await POST(
      new Request("https://rebuzzle.test/api/workflows/daily-content", {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ triggeredBy: "test" }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getTodaysPuzzle).toHaveBeenCalledWith("rebus", "2026-08-03", {
      allowAiGenerate: true,
      failOnAiError: true,
    });
    expect(data.nextPuzzle).toEqual({
      success: true,
      date: "2026-08-03",
      cached: false,
      aiGenerated: true,
      puzzleId: "next-puzzle",
    });
  });

  it("reports next-day failure without taking today's workflow down", async () => {
    getTodaysPuzzle.mockRejectedValue(new Error("gateway unavailable"));

    const response = await POST(
      new Request("https://rebuzzle.test/api/workflows/daily-content", {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ triggeredBy: "test" }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.nextPuzzle).toEqual({
      success: false,
      date: "2026-08-03",
      error: "gateway unavailable",
    });
  });
});
