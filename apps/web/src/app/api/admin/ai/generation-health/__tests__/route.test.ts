const verifyAdminAccess = jest.fn();
const getGenerationSystemHealth = jest.fn();
const loadQualityDriftReport = jest.fn();
const measureWindowPerformance = jest.fn();
const resolveAdaptiveDifficultyForDate = jest.fn();
const listRecentGenerationAudits = jest.fn();
const loadSimCalibration = jest.fn();
const findRecent = jest.fn();
const countUnprocessed = jest.fn();
const getReport = jest.fn();

jest.mock("@/lib/admin-auth", () => ({ verifyAdminAccess }));
jest.mock("@/ai/learning", () => ({
  getGenerationSystemHealth: (...args: unknown[]) => getGenerationSystemHealth(...args),
  loadQualityDriftReport: (...args: unknown[]) => loadQualityDriftReport(...args),
  measureWindowPerformance: (...args: unknown[]) => measureWindowPerformance(...args),
  resolveAdaptiveDifficultyForDate: (...args: unknown[]) =>
    resolveAdaptiveDifficultyForDate(...args),
  listRecentGenerationAudits: (...args: unknown[]) => listRecentGenerationAudits(...args),
  loadSimCalibration: (...args: unknown[]) => loadSimCalibration(...args),
}));
jest.mock("@/db/ai-operations", () => ({
  aiFeedbackOps: { countUnprocessed: (...args: unknown[]) => countUnprocessed(...args) },
  aiLearningEventOps: { findRecent: (...args: unknown[]) => findRecent(...args) },
}));
jest.mock("@/ai/puzzle-agent/review/puzzle-playtest-server", () => ({
  puzzlePlaytestService: { getReport: (...args: unknown[]) => getReport(...args) },
}));

import { GET } from "../route";

describe("GET /api/admin/ai/generation-health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getGenerationSystemHealth.mockResolvedValue({
      auditsLast7d: 12,
      successRate: 0.5,
      fallbackRate: 0.25,
      apexShare: 0.8,
      avgQuality: 82,
      lastSuccessAt: "2026-08-03T00:00:00.000Z",
    });
    loadQualityDriftReport.mockResolvedValue({ status: "healthy" });
    measureWindowPerformance.mockResolvedValue({
      finalPlays: 20,
      solveRate: 0.55,
      medianSolveSeconds: 80,
      abandonRate: 0.1,
      tooEasy: false,
      tooHard: false,
      difficultyDelta: 0,
      notes: [],
    });
    resolveAdaptiveDifficultyForDate.mockResolvedValue({
      difficulty: 5,
      baseline: 5,
      delta: 0,
      reason: "spine",
    });
    listRecentGenerationAudits.mockResolvedValue([
      {
        id: "a1",
        status: "fallback",
        error: "Answer-first visual cue contract failed: Missing catalog cue flower",
        rejectReasons: ["Missing catalog cue flower"],
      },
    ]);
    loadSimCalibration.mockResolvedValue({ adjustment: 0, sampleSize: 0 });
    findRecent.mockResolvedValue([]);
    countUnprocessed.mockResolvedValue(0);
    getReport.mockResolvedValue({ releaseReady: false });
  });

  it("rejects unauthenticated access", async () => {
    verifyAdminAccess.mockResolvedValue(null);
    const response = await GET(new Request("https://rebuzzle.test/api/admin/ai/generation-health"));
    expect(response.status).toBe(401);
    expect(getGenerationSystemHealth).not.toHaveBeenCalled();
  });

  it("returns health, player pressure, and recent audits for operators", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    const response = await GET(new Request("https://rebuzzle.test/api/admin/ai/generation-health"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.health.auditsLast7d).toBe(12);
    expect(body.playerPressure.solveRate).toBe(0.55);
    expect(body.recentAudits[0].rejectReasons).toEqual(["Missing catalog cue flower"]);
    expect(body.generatedAt).toEqual(expect.any(String));
  });
});
