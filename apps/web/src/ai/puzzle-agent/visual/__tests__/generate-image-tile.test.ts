const mockGenerateImage = jest.fn();
const mockEnsureGatewayKey = jest.fn();

jest.mock("ai", () => ({
  generateImage: (...args: unknown[]) => mockGenerateImage(...args),
}));

jest.mock("@/ai/client", () => ({
  ensureGatewayKey: () => mockEnsureGatewayKey(),
  getAiGateway: () => ({ image: (modelId: string) => modelId }),
}));

import { generateImageTile } from "../generate-image-tile";

describe("generateImageTile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fails before provider access when no recognition concept is declared", async () => {
    await expect(
      generateImageTile({ concept: "  ", prompt: "a red car", alt: "red car" })
    ).resolves.toEqual({ ok: false, alt: "red car", error: "missing_recognition_concept" });
    expect(mockEnsureGatewayKey).not.toHaveBeenCalled();
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });

  it("grounds the image prompt in the exact concept that blind judges will score", async () => {
    mockGenerateImage.mockResolvedValue({
      image: { mediaType: "image/png", base64: "AAAA" },
    });

    const result = await generateImageTile({
      concept: "car",
      prompt: "a clean red vehicle on white",
      alt: "red car",
    });

    expect(result.ok).toBe(true);
    expect(mockGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Required recognizable subject: car."),
      })
    );
  });
});
