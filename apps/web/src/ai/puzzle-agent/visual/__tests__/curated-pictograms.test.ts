import {
  isAuthenticCuratedPictogram,
  listCuratedPictogramIds,
  resolveCuratedPictogram,
} from "../curated-pictograms";
import { scorePictogramClarity } from "../pictogram-clarity";

describe("curated pictogram catalog", () => {
  it("resolves a car to a stable local asset", () => {
    const car = resolveCuratedPictogram("car");

    expect(car?.assetId).toBe("lucide:car:v1");
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
    expect(ids.length).toBeGreaterThanOrEqual(110);
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
    expect(resolveCuratedPictogram("bicycle")?.assetId).toBe("lucide:bicycle:v1");
    expect(resolveCuratedPictogram("mail")?.canonicalConcept).toBe("envelope");
    expect(resolveCuratedPictogram("wristwatch")?.canonicalConcept).toBe("watch");
    expect(resolveCuratedPictogram("computer mouse")?.canonicalConcept).toBe("computer-mouse");
  });
});
