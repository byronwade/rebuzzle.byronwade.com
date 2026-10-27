import {
  getCuratedPictogramReadingPolicy,
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
    expect(listCuratedPictogramIds({ includeQuarantined: true })).toHaveLength(166);
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

describe("catalog reading policy", () => {
  it("keeps citrus discoverable without authorizing a specific fruit", () => {
    const policy = getCuratedPictogramReadingPolicy("lemon");
    expect(policy?.canonicalConcept).toBe("citrus");
    expect(policy?.searchAliases).toContain("lemon");
    expect(policy?.approvedReadings).toEqual(["citrus"]);
    expect(policy?.commonConfusions).toEqual(["orange", "lemon"]);
    expect(resolveCuratedPictogram("lemon")).toBeNull();
    expect(resolveCuratedPictogram("orange")).toBeNull();
    expect(resolveCuratedPictogram("citrus")?.assetId).toBe("lucide:citrus:v2");
  });

  it("rejects unsupported subtype readings but preserves supported synonyms", () => {
    for (const concept of ["planet", "kitten", "puppy", "sedan"]) {
      expect(resolveCuratedPictogram(concept)).toBeNull();
    }
    expect(resolveCuratedPictogram("bike")?.assetId).toBe("lucide:bicycle:v2");
    expect(resolveCuratedPictogram("automobile")?.assetId).toBe("lucide:car:v2");
  });

  it("does not authenticate a search alias as the meaning of catalog artwork", () => {
    const citrus = resolveCuratedPictogram("citrus")!;
    expect(isAuthenticCuratedPictogram({ ...citrus, concept: "lemon" })).toBe(false);
    expect(getCuratedPictogramReadingPolicy(citrus.assetId)?.approvedReadings).toEqual(["citrus"]);
    expect(getCuratedPictogramReadingPolicy("lucide:citrus:v999")).toBeNull();
  });
});
