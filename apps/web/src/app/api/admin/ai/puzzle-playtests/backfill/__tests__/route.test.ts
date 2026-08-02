const verifyAdminAccess = jest.fn();
const run = jest.fn();

jest.mock("@/lib/admin-auth", () => ({ verifyAdminAccess }));
jest.mock("@/ai/puzzle-agent/review/puzzle-playtest-backfill-server", () => ({
  puzzlePlaytestBackfillService: { run },
}));

import { POST } from "../route";

describe("puzzle playtest historical backfill route", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated requests", async () => {
    verifyAdminAccess.mockResolvedValue(null);
    const response = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests/backfill", {
        method: "POST",
        body: JSON.stringify({ dryRun: true }),
      })
    );

    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("defaults to a non-mutating audit", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    run.mockResolvedValue({ dryRun: true, eligibleUnqueued: 4, queued: 0 });
    const response = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests/backfill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(run).toHaveBeenCalledWith({ dryRun: true, limit: 50 });
  });

  it("mutates only when apply is explicit", async () => {
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    run.mockResolvedValue({ dryRun: false, eligibleUnqueued: 4, queued: 4 });
    const response = await POST(
      new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests/backfill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun: false, limit: 100 }),
      })
    );

    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledWith({ dryRun: false, limit: 100 });
  });
});
