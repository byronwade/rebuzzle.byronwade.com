const verifyAdminAccess = jest.fn();
const getNext = jest.fn();
const getReport = jest.fn();
const submit = jest.fn();

jest.mock("@/lib/admin-auth", () => ({ verifyAdminAccess }));
jest.mock("@/ai/puzzle-agent/review/icon-recognition-server", () => ({
  iconRecognitionService: { getNext, getReport, submit },
}));

import { IconRecognitionConflictError } from "@/ai/puzzle-agent/review/icon-recognition-service";
import { GET, POST } from "../route";

describe("icon recognition admin route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated panel reads and submissions", async () => {
    verifyAdminAccess.mockResolvedValue(null);
    const [read, write] = await Promise.all([
      GET(new Request("https://rebuzzle.test/api/admin/ai/icon-recognition")),
      POST(
        new Request("https://rebuzzle.test/api/admin/ai/icon-recognition", {
          method: "POST",
          body: JSON.stringify({}),
        })
      ),
    ]);

    expect([read.status, write.status]).toEqual([401, 401]);
    expect(getNext).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("returns only the blind specimen payload without caching", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    getNext.mockResolvedValue({
      specimen: { fixtureId: "opaque", sizePx: 36, svg: "<svg/>" },
      progress: { completed: 0, total: 236, remaining: 236, complete: false },
    });
    const response = await GET(new Request("https://rebuzzle.test/api/admin/ai/icon-recognition"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getNext).toHaveBeenCalledWith("admin-1", "publication");
    expect(Object.keys(data.specimen).sort()).toEqual(["fixtureId", "sizePx", "svg"]);
    expect(JSON.stringify(data)).not.toContain("conceptId");
    expect(JSON.stringify(data)).not.toContain("aliases");
  });

  it("attributes an immutable decision without returning correctness", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    submit.mockResolvedValue({ completed: 1, total: 236, remaining: 235, complete: false });
    const response = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/icon-recognition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fixtureId: "opaque", guess: "car", uncertain: false }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(submit).toHaveBeenCalledWith({
      reviewerId: "admin-1",
      panelId: "publication",
      fixtureId: "opaque",
      guess: "car",
      uncertain: false,
    });
    expect(data).toEqual({
      success: true,
      progress: { completed: 1, total: 236, remaining: 235, complete: false },
    });
    expect(JSON.stringify(data)).not.toContain("correct");
  });

  it("loads aggregate results only through explicit report mode", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    getReport.mockResolvedValue({ report: { status: "collecting" }, reviewerProgress: {} });
    const response = await GET(
      new Request("https://rebuzzle.test/api/admin/ai/icon-recognition?mode=report")
    );

    expect(response.status).toBe(200);
    expect(getReport).toHaveBeenCalledWith("admin-1", "publication");
    expect(getNext).not.toHaveBeenCalled();
  });

  it("routes candidate panels through an isolated evidence cohort", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    submit.mockResolvedValue({ completed: 1, total: 48, remaining: 47, complete: false });
    getNext.mockResolvedValue({
      specimen: { fixtureId: "candidate-opaque", sizePx: 36, svg: "<svg/>" },
      progress: { completed: 0, total: 48, remaining: 48, complete: false },
    });
    const response = await GET(
      new Request("https://rebuzzle.test/api/admin/ai/icon-recognition?panel=candidates")
    );
    const write = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/icon-recognition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          panelId: "candidates",
          fixtureId: "candidate-opaque",
          guess: "battery",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(write.status).toBe(200);
    expect(getNext).toHaveBeenCalledWith("admin-1", "candidates");
    expect(submit).toHaveBeenCalledWith({
      reviewerId: "admin-1",
      panelId: "candidates",
      fixtureId: "candidate-opaque",
      guess: "battery",
      uncertain: false,
    });
  });

  it("returns conflict instead of overwriting an existing decision", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    submit.mockRejectedValue(new IconRecognitionConflictError());
    const response = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/icon-recognition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fixtureId: "opaque", guess: "car" }),
      })
    );

    expect(response.status).toBe(409);
  });
});
