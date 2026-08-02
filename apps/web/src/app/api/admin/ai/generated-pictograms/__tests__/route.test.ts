const verifyAdminAccess = jest.fn();
const getNext = jest.fn();
const getReport = jest.fn();
const submitReview = jest.fn();

jest.mock("@/lib/admin-auth", () => ({ verifyAdminAccess }));
jest.mock("@/ai/puzzle-agent/review/generated-pictogram-registry-server", () => ({
  generatedPictogramRegistry: { getNext, getReport, submitReview },
}));

import { GeneratedPictogramReviewConflictError } from "@/ai/puzzle-agent/review/generated-pictogram-registry";
import { GET, POST } from "../route";

describe("generated pictogram admin route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated queue reads and submissions", async () => {
    verifyAdminAccess.mockResolvedValue(null);
    const [read, write] = await Promise.all([
      GET(new Request("https://rebuzzle.test/api/admin/ai/generated-pictograms")),
      POST(
        new Request("https://rebuzzle.test/api/admin/ai/generated-pictograms", {
          method: "POST",
          body: JSON.stringify({}),
        })
      ),
    ]);

    expect([read.status, write.status]).toEqual([401, 401]);
    expect(getNext).not.toHaveBeenCalled();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it("returns only the blind player-size specimen without caching", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    getNext.mockResolvedValue({
      specimen: { fixtureId: "opaque", sizePx: 36, svg: "<svg/>" },
      progress: { completed: 0, available: 2, remaining: 2, complete: false },
    });
    const response = await GET(
      new Request("https://rebuzzle.test/api/admin/ai/generated-pictograms")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getNext).toHaveBeenCalledWith("admin-1");
    expect(Object.keys(data.specimen).sort()).toEqual(["fixtureId", "sizePx", "svg"]);
    expect(JSON.stringify(data)).not.toContain("conceptLabel");
    expect(JSON.stringify(data)).not.toContain("candidateId");
    expect(JSON.stringify(data)).not.toContain("correct");
  });

  it("attributes an immutable decision without returning correctness", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    submitReview.mockResolvedValue({
      completed: 1,
      available: 2,
      remaining: 1,
      complete: false,
    });
    const response = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/generated-pictograms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fixtureId: "opaque", guess: "car", uncertain: false }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(submitReview).toHaveBeenCalledWith({
      reviewerId: "admin-1",
      fixtureId: "opaque",
      guess: "car",
      uncertain: false,
    });
    expect(JSON.stringify(data)).not.toContain("correct");
  });

  it("reveals eligible results only through explicit report mode", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    getReport.mockResolvedValue({
      registryVersion: "generated-pictogram-registry-v1",
      candidatesVisibleToReviewer: 1,
      pending: 1,
      approved: 0,
      rejected: 0,
      quarantined: 0,
      candidates: [],
      generatedAt: "2026-08-01T00:00:00.000Z",
    });
    const response = await GET(
      new Request("https://rebuzzle.test/api/admin/ai/generated-pictograms?mode=report")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getReport).toHaveBeenCalledWith("admin-1");
    expect(getNext).not.toHaveBeenCalled();
    expect(data.report.registryVersion).toBe("generated-pictogram-registry-v1");
  });

  it("returns conflict instead of overwriting an existing decision", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    submitReview.mockRejectedValue(new GeneratedPictogramReviewConflictError());
    const response = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/generated-pictograms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fixtureId: "opaque", guess: "car" }),
      })
    );

    expect(response.status).toBe(409);
  });
});
