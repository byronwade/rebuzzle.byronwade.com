const verifyAdminAccess = jest.fn();
const getQueue = jest.fn();
const decide = jest.fn();
const importArtifact = jest.fn();
const exportReviews = jest.fn();

jest.mock("@/lib/admin-auth", () => ({ verifyAdminAccess }));
jest.mock("@/ai/puzzle-agent/review/server", () => ({
  benchmarkReviewService: { getQueue, decide, importArtifact, exportReviews },
}));

import { BenchmarkReviewConflictError } from "@/ai/puzzle-agent/review/benchmark-review-service";
import { GET as exportGet } from "../export/route";
import { POST as importPost } from "../import/route";
import { GET, POST } from "../route";

describe("benchmark review admin routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated queue, decision, import, and export requests", async () => {
    verifyAdminAccess.mockResolvedValue(null);
    const requests = await Promise.all([
      GET(new Request("https://rebuzzle.test/api/admin/ai/benchmark-reviews")),
      POST(
        new Request("https://rebuzzle.test/api/admin/ai/benchmark-reviews", {
          method: "POST",
          body: JSON.stringify({}),
        })
      ),
      importPost(
        new Request("https://rebuzzle.test/api/admin/ai/benchmark-reviews/import", {
          method: "POST",
          body: JSON.stringify({}),
        })
      ),
      exportGet(new Request("https://rebuzzle.test/api/admin/ai/benchmark-reviews/export")),
    ]);
    expect(requests.map((response) => response.status)).toEqual([401, 401, 401, 401]);
    expect(getQueue).not.toHaveBeenCalled();
    expect(decide).not.toHaveBeenCalled();
    expect(importArtifact).not.toHaveBeenCalled();
    expect(exportReviews).not.toHaveBeenCalled();
  });

  it("loads a bounded queue for an authenticated administrator", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    getQueue.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    const response = await GET(
      new Request(
        "https://rebuzzle.test/api/admin/ai/benchmark-reviews?status=approved&page=2&limit=999"
      )
    );
    expect(response.status).toBe(200);
    expect(getQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetId: "re-bus-hf-v1",
        status: "approved",
        page: 2,
        limit: 999,
      })
    );
  });

  it("attributes imports and decisions to the authenticated administrator", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    importArtifact.mockResolvedValue({ inserted: 100, existing: 0, progress: {} });
    decide.mockResolvedValue({ id: "fixture-1", reviewStatus: "approved" });
    const artifact = { schemaVersion: 1 };
    const imported = await importPost(
      new Request("https://rebuzzle.test/api/admin/ai/benchmark-reviews/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ artifact }),
      })
    );
    const decided = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/benchmark-reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "fixture-1",
          expectedVersion: 0,
          rights: "approved",
          answer: "approved",
        }),
      })
    );
    expect(imported.status).toBe(200);
    expect(decided.status).toBe(200);
    expect(importArtifact).toHaveBeenCalledWith({ artifact, actorUserId: "admin-1" });
    expect(decide).toHaveBeenCalledWith(
      expect.objectContaining({ id: "fixture-1", actorUserId: "admin-1" })
    );
  });

  it("returns conflict instead of overwriting a stale review", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    decide.mockRejectedValue(new BenchmarkReviewConflictError());
    const response = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/benchmark-reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "fixture-1",
          expectedVersion: 0,
          rights: "rejected",
          answer: "approved",
        }),
      })
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ success: false, error: expect.stringContaining("refresh") })
    );
  });

  it("exports the exact evaluator review-file shape without caching", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    exportReviews.mockResolvedValue({
      schemaVersion: 1,
      datasetId: "re-bus-hf-v1",
      revision: "12233c6790bb2edc929ad7822ae428483b5c842a",
      reviews: {},
    });
    const response = await exportGet(
      new Request("https://rebuzzle.test/api/admin/ai/benchmark-reviews/export")
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain(".reviews.json");
  });
});
