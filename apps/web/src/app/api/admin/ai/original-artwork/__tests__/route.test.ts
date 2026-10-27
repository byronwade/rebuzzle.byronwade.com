const verifyAdminAccess = jest.fn();
const getNext = jest.fn();
const getReport = jest.fn();
const find = jest.fn();
const promote = jest.fn();
const quarantine = jest.fn();
jest.mock("@/lib/admin-auth", () => ({ verifyAdminAccess }));
jest.mock("@/ai/puzzle-agent/review/icon-recognition-server", () => ({
  iconRecognitionService: { getNext, getReport },
}));
jest.mock("@/ai/puzzle-agent/review/original-artwork-promotion-server", () => ({
  originalArtworkPromotionRepository: { find },
  originalArtworkPromotionService: { promote, quarantine },
}));

import { GET, POST } from "../route";

const request = (body: unknown) =>
  new Request("https://rebuzzle.test/api/admin/ai/original-artwork", {
    method: "POST",
    body: JSON.stringify(body),
  });
describe("original artwork admin controls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdminAccess.mockResolvedValue({ id: "real-admin" });
    getNext.mockResolvedValue({ progress: { complete: true } });
    find.mockResolvedValue(null);
    getReport.mockResolvedValue({
      report: { catalogVersion: "current", promotionEligibleAssets: [] },
    });
  });
  it("requires admin access before reading or writing", async () => {
    verifyAdminAccess.mockResolvedValue(null);
    expect((await GET(new Request("https://rebuzzle.test"))).status).toBe(401);
    expect((await POST(request({ action: "approve" }))).status).toBe(401);
    expect(find).not.toHaveBeenCalled();
    expect(promote).not.toHaveBeenCalled();
  });
  it("withholds labels and approval controls from unfinished reviewers", async () => {
    getNext.mockResolvedValue({ progress: { complete: false } });
    const read = await GET(new Request("https://rebuzzle.test"));
    expect(read.status).toBe(403);
    expect(JSON.stringify(await read.json())).not.toContain("rebuzzle-ink:");
    expect((await POST(request({ action: "approve" }))).status).toBe(403);
    expect(getReport).not.toHaveBeenCalled();
    expect(promote).not.toHaveBeenCalled();
  });
  it("uses authenticated actor and only forwards bounded approval inputs", async () => {
    promote.mockResolvedValue({
      assetId: "rebuzzle-ink:clock:v1",
      status: "approved",
      statusVersion: 1,
    });
    const res = await POST(
      request({
        action: "approve",
        assetId: "rebuzzle-ink:clock:v1",
        expectedCatalogVersion: "current",
        expectedStatusVersion: 0,
        actorId: "forged",
        status: "approved",
        svg: "injected",
        qualificationEvidenceIds: ["fake"],
      })
    );
    expect(res.status).toBe(200);
    expect(promote).toHaveBeenCalledWith({
      assetId: "rebuzzle-ink:clock:v1",
      actorId: "real-admin",
      expectedCatalogVersion: "current",
      expectedStatusVersion: 0,
    });
  });
  it("rejects malformed versions and unknown asset identities", async () => {
    for (const body of [
      { assetId: "rebuzzle-ink:clock:v1", expectedStatusVersion: -1 },
      { assetId: "unknown", expectedStatusVersion: 0 },
    ]) {
      expect(
        (await POST(request({ action: "approve", expectedCatalogVersion: "current", ...body })))
          .status
      ).toBe(400);
    }
    expect(promote).not.toHaveBeenCalled();
  });
  it("quarantines with a required reason and authenticated audit actor", async () => {
    quarantine.mockResolvedValue({
      assetId: "rebuzzle-ink:clock:v1",
      status: "quarantined",
      statusVersion: 2,
    });
    const input = {
      action: "quarantine",
      assetId: "rebuzzle-ink:clock:v1",
      expectedStatusVersion: 1,
    };
    expect((await POST(request({ ...input, reason: "" }))).status).toBe(400);
    expect((await POST(request({ ...input, reason: "Mistaken for a watch" }))).status).toBe(200);
    expect(quarantine).toHaveBeenCalledWith({
      assetId: input.assetId,
      expectedStatusVersion: 1,
      actorId: "real-admin",
      reason: "Mistaken for a watch",
    });
  });

  it("reports concurrent transitions as conflicts", async () => {
    promote.mockRejectedValue(new Error("Artwork approval changed; reload the report"));
    expect(
      (
        await POST(
          request({
            action: "approve",
            assetId: "rebuzzle-ink:clock:v1",
            expectedCatalogVersion: "current",
            expectedStatusVersion: 0,
          })
        )
      ).status
    ).toBe(409);
  });
  it("returns candidate states only after the blind panel is complete", async () => {
    const res = await GET(new Request("https://rebuzzle.test"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.assets).toHaveLength(40);
    expect(data.assets[0]).toMatchObject({
      status: "candidate",
      statusVersion: 0,
      recognitionEligible: false,
    });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});
