jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/ugc/require-studio-user", () => ({ requireStudioUser: jest.fn() }));
jest.mock("@/lib/ugc/studio-ai-quota", () => ({
  consumeStudioAiGeneration: jest.fn(),
  refundStudioAiGeneration: jest.fn(),
  getStudioAiQuota: jest.fn(),
}));
jest.mock("@/ai/puzzle-agent/visual/generate-image-tile", () => ({
  generateImageTile: jest.fn(),
}));

import { generateImageTile } from "@/ai/puzzle-agent/visual/generate-image-tile";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { requireStudioUser } from "@/lib/ugc/require-studio-user";
import {
  consumeStudioAiGeneration,
  getStudioAiQuota,
  refundStudioAiGeneration,
} from "@/lib/ugc/studio-ai-quota";
import { POST } from "../route";

const mockAuth = getAuthenticatedUser as jest.Mock;
const mockGate = requireStudioUser as jest.Mock;
const mockReserve = consumeStudioAiGeneration as jest.Mock;
const mockRefund = refundStudioAiGeneration as jest.Mock;
const mockQuota = getStudioAiQuota as jest.Mock;
const mockGenerate = generateImageTile as jest.Mock;

function request(body: unknown) {
  return new Request("https://rebuzzle.test/api/studio/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/studio/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "creator-1" });
    mockGate.mockResolvedValue({ ok: true, user: { userId: "creator-1" } });
    mockReserve.mockResolvedValue({ used: 1, limit: 3, remaining: 2 });
    mockRefund.mockResolvedValue(undefined);
    mockQuota.mockResolvedValue({ used: 0, limit: 3, remaining: 3 });
    mockGenerate.mockResolvedValue({ ok: true, src: "data:image/png;base64,abc", alt: "A clock" });
  });

  it("atomically reserves a shared credit before calling the image provider", async () => {
    const response = await POST(request({ concept: "clock" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockReserve).toHaveBeenCalledWith("creator-1");
    expect(mockReserve.mock.invocationCallOrder[0]).toBeLessThan(
      mockGenerate.mock.invocationCallOrder[0]
    );
    expect(body).toMatchObject({ used: 1, remaining: 2, layer: { concept: "clock" } });
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("does not call the image provider when no shared credit can be reserved", async () => {
    mockReserve.mockResolvedValue(null);
    mockQuota.mockResolvedValue({ used: 3, limit: 3, remaining: 0 });

    const response = await POST(request({ concept: "clock" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.remaining).toBe(0);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("refunds a reserved credit when image generation fails", async () => {
    mockGenerate.mockResolvedValue({ ok: false, error: "provider secret detail" });

    const response = await POST(request({ concept: "clock" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({ used: 0, remaining: 3 });
    expect(body.error).toContain("Could not generate");
    expect(body).not.toHaveProperty("detail");
    expect(JSON.stringify(body)).not.toContain("provider secret detail");
    expect(mockRefund).toHaveBeenCalledWith("creator-1");
  });

  it("refunds a reserved credit when the provider throws", async () => {
    mockGenerate.mockRejectedValue(new Error("provider failure"));

    const response = await POST(request({ concept: "clock" }));

    expect(response.status).toBe(502);
    expect(mockRefund).toHaveBeenCalledWith("creator-1");
    expect(mockQuota).toHaveBeenCalledWith("creator-1");
  });

  it("rejects a short concept without reserving quota", async () => {
    const response = await POST(request({ concept: " " }));

    expect(response.status).toBe(400);
    expect(mockReserve).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
