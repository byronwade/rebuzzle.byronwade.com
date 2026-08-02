const verifyAdminAccess = jest.fn();
const getNext = jest.fn();
const getReport = jest.fn();
const submitReview = jest.fn();

jest.mock("@/lib/admin-auth", () => ({ verifyAdminAccess }));
jest.mock("@/ai/puzzle-agent/review/puzzle-playtest-server", () => ({
  puzzlePlaytestService: { getNext, getReport, submitReview },
}));

import { PuzzlePlaytestConflictError } from "@/ai/puzzle-agent/review/puzzle-playtest-service";
import { GET, POST } from "../route";

describe("puzzle playtest admin route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated reads and submissions", async () => {
    verifyAdminAccess.mockResolvedValue(null);
    const [read, write] = await Promise.all([
      GET(new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests")),
      POST(
        new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests", {
          method: "POST",
          body: JSON.stringify({}),
        })
      ),
    ]);

    expect([read.status, write.status]).toEqual([401, 401]);
    expect(getNext).not.toHaveBeenCalled();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it("returns only an opaque screenshot payload without caching", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    getNext.mockResolvedValue({
      specimen: {
        fixtureId: "opaque",
        imageDataUrl: "data:image/png;base64,AQID",
        width: 320,
        height: 120,
      },
      progress: { completed: 0, available: 1, remaining: 1, complete: false },
    });
    const response = await GET(new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(Object.keys(data.specimen).sort()).toEqual([
      "fixtureId",
      "height",
      "imageDataUrl",
      "width",
    ]);
    expect(JSON.stringify(data)).not.toContain("answer");
    expect(JSON.stringify(data)).not.toContain("profileId");
    expect(JSON.stringify(data)).not.toContain("candidateId");
  });

  it("attributes the response without returning correctness", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    submitReview.mockResolvedValue({ completed: 1, available: 1, remaining: 0, complete: true });
    const response = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fixtureId: "opaque",
          guess: "sunflower",
          gaveUp: false,
          confidence: 4,
          elapsedMs: 12_000,
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(submitReview).toHaveBeenCalledWith({
      reviewerId: "admin-1",
      fixtureId: "opaque",
      guess: "sunflower",
      gaveUp: false,
      failureReason: undefined,
      confidence: 4,
      elapsedMs: 12_000,
    });
    expect(JSON.stringify(data)).not.toContain("correct");
    expect(JSON.stringify(data)).not.toContain("answer");
  });

  it("loads aggregate results only in explicit report mode", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    getReport.mockResolvedValue({ contractVersion: "puzzle-playtest-v3" });
    const response = await GET(
      new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests?mode=report")
    );

    expect(response.status).toBe(200);
    expect(getReport).toHaveBeenCalledWith("admin-1");
    expect(getNext).not.toHaveBeenCalled();
  });

  it("returns conflict instead of overwriting an immutable review", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    submitReview.mockRejectedValue(new PuzzlePlaytestConflictError());
    const response = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests", {
        method: "POST",
        body: JSON.stringify({ fixtureId: "opaque", guess: "sunflower" }),
      })
    );

    expect(response.status).toBe(409);
  });
});
