import {
  listMappedConcepts,
  lookupLocalLibraryIcons,
  restylePackSvgToInk,
} from "../icon-library";
import { scorePictogramClarity } from "../pictogram-clarity";

describe("icon library packs", () => {
  it("maps common rebus nouns to local pack icons", () => {
    expect(listMappedConcepts().length).toBeGreaterThan(40);
    const keyHits = lookupLocalLibraryIcons("key", 3);
    expect(keyHits.length).toBeGreaterThan(0);
    expect(keyHits[0]?.iconId).toMatch(/^(lucide|ph|tabler|mdi):/);
    expect(keyHits[0]?.svg).toContain("<svg");
    expect(keyHits[0]?.source).toBe("local");
  });

  it("restyles pack SVG into Ink Pictogram 64×64", () => {
    const body =
      '<g fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 8v8"/></g>';
    const styled = restylePackSvgToInk(body);
    expect(styled).toContain('viewBox="0 0 64 64"');
    expect(styled).toContain("#1a1f1c");
    expect(styled).toContain("scale(2)");
  });

  it("scores restyled library icons as clear with librarySource", () => {
    const hits = lookupLocalLibraryIcons("umbrella", 1);
    expect(hits[0]?.svg).toBeTruthy();
    const clarity = scorePictogramClarity(hits[0]!.svg, { librarySource: true });
    expect(clarity.ok).toBe(true);
    expect(clarity.score).toBeGreaterThanOrEqual(58);
  });

  it("finds icons for bee, clock, house, fish", () => {
    for (const concept of ["bee", "clock", "house", "fish"]) {
      const hits = lookupLocalLibraryIcons(concept, 2);
      expect(hits.length).toBeGreaterThan(0);
    }
  });
});
