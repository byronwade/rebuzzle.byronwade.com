import {
  buildConcreteDrawingBrief,
  isAbstractPictogramConcept,
  scorePictogramClarity,
} from "../pictogram-clarity";
import { INK_PICTOGRAM_EXAMPLE_BEE, INK_PICTOGRAM_EXAMPLE_EYE } from "../style";

describe("pictogram clarity", () => {
  it("accepts crafted few-shot icons", () => {
    expect(scorePictogramClarity(INK_PICTOGRAM_EXAMPLE_BEE).ok).toBe(true);
    expect(scorePictogramClarity(INK_PICTOGRAM_EXAMPLE_EYE).ok).toBe(true);
    expect(scorePictogramClarity(INK_PICTOGRAM_EXAMPLE_BEE).score).toBeGreaterThanOrEqual(58);
  });

  it("rejects empty or blob SVGs", () => {
    expect(scorePictogramClarity("<svg></svg>").ok).toBe(false);
    expect(
      scorePictogramClarity(
        '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" fill="#ccc"/></svg>'
      ).ok
    ).toBe(false);
    expect(
      scorePictogramClarity(
        '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" fill="none" stroke="#1a1f1c"/></svg>'
      ).ok
    ).toBe(false);
  });

  it("flags abstract concepts for concrete redraw briefs", () => {
    expect(isAbstractPictogramConcept("love")).toBe(true);
    expect(isAbstractPictogramConcept("bee")).toBe(false);
    expect(buildConcreteDrawingBrief("time")).toMatch(/abstract/i);
    expect(buildConcreteDrawingBrief("umbrella")).toMatch(/concrete/i);
  });
});
