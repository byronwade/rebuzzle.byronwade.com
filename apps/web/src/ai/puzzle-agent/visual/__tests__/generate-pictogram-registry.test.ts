const generateAIText = jest.fn();
const recognizePictogramIcon = jest.fn();
const findApproved = jest.fn();
const submitCandidate = jest.fn();
const quarantine = jest.fn();

jest.mock("@/ai/client", () => ({ generateAIText }));
jest.mock("../critique-pictogram", () => ({ recognizePictogramIcon }));
jest.mock("../../review/generated-pictogram-registry-server", () => ({
  generatedPictogramRegistry: { findApproved, submitCandidate, quarantine },
}));

import { resolveCuratedPictogram } from "../curated-pictograms";
import { generatePictogram } from "../generate-pictogram";

const svg = resolveCuratedPictogram("house")!.svg;

function recognition(ok = true, seenLabel = "lighthouse") {
  return {
    ok,
    seenLabel,
    confidence: ok ? 0.95 : 0.2,
    alternateReadings: ok ? [] : [seenLabel],
    isAmbiguous: !ok,
    redrawAdvice: ok ? "" : "make it clearer",
    matchesConcept: ok,
    judges: [],
    profileResults: [
      {
        tileSize: 36,
        ok,
        seenLabel,
        confidence: ok ? 0.94 : 0.2,
        alternateReadings: [],
        isAmbiguous: !ok,
        redrawAdvice: "",
        matchesConcept: ok,
        judges: [],
      },
      {
        tileSize: 72,
        ok,
        seenLabel,
        confidence: ok ? 0.96 : 0.2,
        alternateReadings: [],
        isAmbiguous: !ok,
        redrawAdvice: "",
        matchesConcept: ok,
        judges: [],
      },
    ],
  };
}

describe("generated pictogram registry integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findApproved.mockResolvedValue(null);
    generateAIText.mockResolvedValue({ text: svg });
    recognizePictogramIcon.mockResolvedValue(recognition());
    submitCandidate.mockResolvedValue({ id: "generated-pictogram:approved-later" });
  });

  it("fails fast when publication requests an unapproved concept", async () => {
    const result = await generatePictogram({ concept: "lighthouse", maxRetries: 0 });

    expect(result.ok).toBe(false);
    expect(result.svg).toBeNull();
    expect(result.error).toBe("approved_asset_required");
    expect(generateAIText).not.toHaveBeenCalled();
    expect(submitCandidate).not.toHaveBeenCalled();
  });

  it("returns a newly generated asset to explicit review tooling", async () => {
    const result = await generatePictogram({
      concept: "lighthouse",
      maxRetries: 0,
      usage: "review",
    });

    expect(result).toMatchObject({
      ok: true,
      svg,
      source: "generated",
      assetId: "generated-pictogram:approved-later",
    });
  });

  it("reuses a human-approved exact asset but still reruns current recognition", async () => {
    findApproved.mockResolvedValue({ id: "generated-pictogram:approved", svg });

    const result = await generatePictogram({ concept: "lighthouse" });

    expect(result).toMatchObject({
      ok: true,
      source: "approved-cache",
      assetId: "generated-pictogram:approved",
      attempts: 0,
    });
    expect(recognizePictogramIcon).toHaveBeenCalledWith({ svg, concept: "lighthouse" });
    expect(generateAIText).not.toHaveBeenCalled();
  });

  it("quarantines a cached recognition regression and blocks publication", async () => {
    findApproved.mockResolvedValue({ id: "generated-pictogram:stale", svg });
    recognizePictogramIcon.mockResolvedValueOnce(recognition(false, "tower"));

    const result = await generatePictogram({ concept: "lighthouse", maxRetries: 0 });

    expect(quarantine).toHaveBeenCalledWith(
      "generated-pictogram:stale",
      expect.stringContaining("seen as tower")
    );
    expect(result).toMatchObject({
      ok: false,
      error: "approved_asset_required",
    });
    expect(generateAIText).not.toHaveBeenCalled();
    expect(submitCandidate).not.toHaveBeenCalled();
  });

  it("keeps offline skip-recognition runs independent of the registry", async () => {
    const result = await generatePictogram({
      concept: "lighthouse",
      skipRecognition: true,
      usage: "review",
    });

    expect(result.ok).toBe(true);
    expect(findApproved).not.toHaveBeenCalled();
    expect(submitCandidate).not.toHaveBeenCalled();
  });
});
