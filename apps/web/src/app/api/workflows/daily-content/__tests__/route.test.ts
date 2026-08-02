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
    if (originalCronSecret === undefined) process.env.CRON_SECRET = undefined;
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

  it("stops before blog generation when the Gateway spending cap is exhausted", async () => {
    const budgetError = Object.assign(new Error("Gateway request failed"), {
      name: "GatewayError",
      data: {
        error: {
          type: "quota_for_entity_exceeded",
          message: "API key budget exceeded. Current spend: $10.40, limit: $10.00.",
        },
      },
    });
    getTodaysPuzzle.mockRejectedValue(budgetError);

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
    expect(data.nextPuzzle).toEqual({
      success: false,
      date: "2026-08-03",
      error: "AI Gateway budget exhausted. Increase the project Gateway budget before retrying.",
      errorCode: "AI_BUDGET_EXCEEDED",
    });
    expect(data.blog).toEqual({
      success: false,
      skipped: "ai_budget_exceeded",
      error: "AI Gateway budget exhausted",
    });
    expect(findOne).not.toHaveBeenCalled();
    expect(proposeBlogForPuzzle).not.toHaveBeenCalled();
    expect(JSON.stringify(data)).not.toContain("$10.40");
    expect(JSON.stringify(data)).not.toContain("quota_for_entity_exceeded");
  });

  it("skips next-day and blog calls when today's generation reports the spending cap", async () => {
    generateNextPuzzle.mockResolvedValue({
      success: false,
      error: "API key budget exceeded. Current spend: $10.40, limit: $10.00.",
    });

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
    expect(getTodaysPuzzle).not.toHaveBeenCalled();
    expect(findOne).not.toHaveBeenCalled();
    expect(proposeBlogForPuzzle).not.toHaveBeenCalled();
    expect(data.nextPuzzle).toMatchObject({
      success: false,
      errorCode: "AI_BUDGET_EXCEEDED",
      skipped: "ai_budget_exceeded",
    });
    expect(data.blog.skipped).toBe("ai_budget_exceeded");
    expect(JSON.stringify(data)).not.toContain("$10.40");
  });
});
