import { listCuratedPictogramIds, resolveCuratedPictogram } from "../curated-pictograms";
import { evaluatePictogramPixelIntegrity } from "../pictogram-pixel-integrity";

describe("player-sized pictogram pixel integrity", () => {
  it("accepts every publication catalog asset at live player tile sizes", async () => {
    const failures: Array<{ id: string; reasons: string[] }> = [];
    for (const id of listCuratedPictogramIds()) {
      const result = await evaluatePictogramPixelIntegrity(resolveCuratedPictogram(id)!.svg);
      if (!result.ok) failures.push({ id, reasons: result.reasons });
    }

    expect(failures).toEqual([]);
  });

  it.each([
    [
      "off-canvas",
      '<svg viewBox="0 0 64 64"><circle cx="100" cy="100" r="12" fill="#1a1f1c"/></svg>',
      "too_little_visible_ink",
    ],
    [
      "low-contrast",
      '<svg viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" fill="none" stroke="#d8dad7" stroke-width="5"/></svg>',
      "insufficient_contrast",
    ],
    [
      "tiny",
      '<svg viewBox="0 0 64 64"><rect x="30" y="30" width="4" height="4" fill="#1a1f1c"/></svg>',
      "visible_subject_too_small",
    ],
    [
      "canvas-filling",
      '<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#1a1f1c"/></svg>',
      "overfilled_canvas",
    ],
  ])("rejects %s generated geometry", async (_label, svg, expectedReason) => {
    const result = await evaluatePictogramPixelIntegrity(svg);

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain(expectedReason);
  });
});
