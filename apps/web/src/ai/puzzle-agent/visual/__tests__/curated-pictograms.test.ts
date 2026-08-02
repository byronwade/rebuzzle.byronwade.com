import {
  isAuthenticCuratedPictogram,
  listCuratedPictogramIds,
  QUARANTINED_CURATED_PICTOGRAM_IDS,
  resolveCuratedPictogram,
} from "../curated-pictograms";
import { scorePictogramClarity } from "../pictogram-clarity";

describe("curated pictogram catalog", () => {
  it("resolves a car to a stable local asset", () => {
    const car = resolveCuratedPictogram("car");

    expect(car?.assetId).toBe("lucide:car:v2");
    expect(car?.svg).toContain("<svg");
    expect(scorePictogramClarity(car?.svg).ok).toBe(true);
  });

  it("resolves exact aliases but not vague phrases", () => {
    expect(resolveCuratedPictogram("automobile")?.canonicalConcept).toBe("car");
    expect(resolveCuratedPictogram("fast automobile race")).toBeNull();
  });

  it("keeps catalog identifiers unique", () => {
    const ids = listCuratedPictogramIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(90);
    expect(listCuratedPictogramIds({ includeQuarantined: true })).toHaveLength(118);
  });

  it("resolves every catalog asset to an authentic identity", () => {
    const failures = listCuratedPictogramIds().flatMap((id) => {
      const asset = resolveCuratedPictogram(id);
      return asset &&
        isAuthenticCuratedPictogram({
          concept: id,
          assetId: asset.assetId,
          svg: asset.svg,
        })
        ? []
        : [id];
    });

    expect(failures).toEqual([]);
  });

  it("grounds common long-tail nouns and their exact aliases", () => {
    expect(resolveCuratedPictogram("bicycle")?.assetId).toBe("lucide:bicycle:v2");
    expect(resolveCuratedPictogram("mail")?.canonicalConcept).toBe("envelope");
    expect(resolveCuratedPictogram("wristwatch")?.canonicalConcept).toBe("watch");
    expect(resolveCuratedPictogram("paint palette")?.canonicalConcept).toBe("paint-palette");
  });

  it("fails closed for quarantined assets while retaining a diagnostic path", () => {
    expect(QUARANTINED_CURATED_PICTOGRAM_IDS).toContain("computer-mouse");
    expect(resolveCuratedPictogram("computer mouse")).toBeNull();
    const diagnostic = resolveCuratedPictogram("computer mouse", { includeQuarantined: true });
    expect(diagnostic?.canonicalConcept).toBe("computer-mouse");
    expect(diagnostic?.assetId).toMatch(/^material-symbols:mouse:fill1-opsz20@/);
    expect(
      isAuthenticCuratedPictogram({
        concept: "computer mouse",
        assetId: diagnostic?.assetId,
        svg: diagnostic?.svg,
      })
    ).toBe(false);
    expect(listCuratedPictogramIds()).not.toContain("computer-mouse");
  });

  it("retains the previous diagnostic fallback when no replacement exists", () => {
    const diagnostic = resolveCuratedPictogram("rainbow", { includeQuarantined: true });

    expect(diagnostic?.assetId).toBe("lucide:rainbow:v2");
    expect(diagnostic?.canonicalConcept).toBe("rainbow");
  });
});
