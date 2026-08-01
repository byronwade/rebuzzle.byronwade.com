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

  it("penalizes hairline strokes that collapse at small sizes", () => {
    const hairline =
      '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="18" fill="none" stroke="#1a1f1c" stroke-width="0.5"/><ellipse cx="32" cy="40" rx="10" ry="6" fill="none" stroke="#1a1f1c" stroke-width="0.5"/><path d="M20 20h24" stroke="#1a1f1c" stroke-width="0.5"/></svg>';
    const chunky =
      '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="18" fill="#f4f6f3" stroke="#1a1f1c" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="32" cy="40" rx="10" ry="6" fill="none" stroke="#1a1f1c" stroke-width="2.25"/><path d="M20 20h24" stroke="#1a1f1c" stroke-width="2.25" stroke-linecap="round"/></svg>';
    expect(scorePictogramClarity(hairline).reasons).toContain("hairline_stroke");
    expect(scorePictogramClarity(chunky).score).toBeGreaterThan(
      scorePictogramClarity(hairline).score
    );
  });
});
