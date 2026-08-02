const authorizeCron = jest.fn();
const getReport = jest.fn();

jest.mock("@/lib/cron/auth", () => ({ authorizeCron }));
jest.mock("@/ai/puzzle-agent/review/puzzle-playtest-server", () => ({
  puzzlePlaytestService: { getReport },
}));

import { NextResponse } from "next/server";
import { GET } from "../route";

describe("puzzle playtest evidence audit route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects requests without machine authorization", async () => {
    authorizeCron.mockReturnValue({
      ok: false,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET(
      new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests/audit")
    );

    expect(response.status).toBe(401);
    expect(getReport).not.toHaveBeenCalled();
  });

  it("returns a read-only aggregate without candidate identities or answers", async () => {
    authorizeCron.mockReturnValue({ ok: true });
    getReport.mockResolvedValue({
      contractVersion: "puzzle-playtest-v3",
      candidateCount: 3,
      completedCandidates: 1,
      visibleCandidates: [
        { candidateId: "candidate-secret", puzzleId: "puzzle-secret", answer: "sunflower" },
      ],
    });

    const response = await GET(
      new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests/audit")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getReport).toHaveBeenCalledWith("operational-audit", expect.any(Date), {
      readOnly: true,
    });
    expect(data.report).toEqual({
      contractVersion: "puzzle-playtest-v3",
      candidateCount: 3,
      completedCandidates: 1,
    });
    expect(JSON.stringify(data)).not.toContain("candidate-secret");
    expect(JSON.stringify(data)).not.toContain("puzzle-secret");
    expect(JSON.stringify(data)).not.toContain("sunflower");
  });

  it("returns a non-cacheable server error when the audit fails", async () => {
    authorizeCron.mockReturnValue({ ok: true });
    getReport.mockRejectedValue(new Error("database unavailable"));

    const response = await GET(
      new Request("https://rebuzzle.test/api/admin/ai/puzzle-playtests/audit")
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
