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

  it("queues a newly generated asset only after current two-size recognition passes", async () => {
    const result = await generatePictogram({ concept: "lighthouse", maxRetries: 0 });

    expect(result.ok).toBe(true);
    expect(result.source).toBe("generated");
    expect(result.assetId).toBe("generated-pictogram:approved-later");
    expect(submitCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        concept: "lighthouse",
        svg,
        recognitionProfiles: expect.arrayContaining([
          expect.objectContaining({ tileSize: 36 }),
          expect.objectContaining({ tileSize: 72 }),
        ]),
      })
    );
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

  it("quarantines a cached recognition regression and draws a fresh gated replacement", async () => {
    findApproved.mockResolvedValue({ id: "generated-pictogram:stale", svg });
    recognizePictogramIcon
      .mockResolvedValueOnce(recognition(false, "tower"))
      .mockResolvedValueOnce(recognition(true));

    const result = await generatePictogram({ concept: "lighthouse", maxRetries: 0 });

    expect(quarantine).toHaveBeenCalledWith(
      "generated-pictogram:stale",
      expect.stringContaining("seen as tower")
    );
    expect(result.source).toBe("generated");
    expect(generateAIText).toHaveBeenCalledTimes(1);
    expect(submitCandidate).toHaveBeenCalledTimes(1);
  });

  it("keeps offline skip-recognition runs independent of the registry", async () => {
    const result = await generatePictogram({ concept: "lighthouse", skipRecognition: true });

    expect(result.ok).toBe(true);
    expect(findApproved).not.toHaveBeenCalled();
    expect(submitCandidate).not.toHaveBeenCalled();
  });
});
