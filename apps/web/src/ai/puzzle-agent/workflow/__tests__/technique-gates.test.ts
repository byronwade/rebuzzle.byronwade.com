import {
  familyForTechnique,
  isTechniqueAllowedForTier,
  pickDiverseTechniqueFocuses,
} from "../technique-gates";

describe("technique gates", () => {
  it("allows Impossible techniques at difficulty 8", () => {
    expect(isTechniqueAllowedForTier("brand_logo_wordplay", 8)).toBe(true);
    expect(isTechniqueAllowedForTier("triple_layer_composition", 8)).toBe(true);
  });

  it("allows one tier down (Evil at Impossible) but not Hard-only", () => {
    expect(isTechniqueAllowedForTier("idiom_as_picture", 8)).toBe(true);
    expect(isTechniqueAllowedForTier("simple_compound", 8)).toBe(false);
    expect(isTechniqueAllowedForTier("basic_positional", 8)).toBe(false);
  });

  it("allows Hard techniques at Hard difficulty", () => {
    expect(isTechniqueAllowedForTier("simple_compound", 5)).toBe(true);
  });

  it("picks diverse families across slots", () => {
    const picks = pickDiverseTechniqueFocuses(
      [
        "brand_logo_wordplay",
        "cultural_common_knowledge_plus_twist",
        "triple_layer_composition",
        "rare_but_fair_idiom",
        "idiom_as_picture",
      ],
      3,
      8
    );
    expect(picks).toHaveLength(3);
    const families = picks.map((id) => familyForTechnique(id));
    // First two brand techniques share family — diversity should skip the second brand
    expect(new Set(families.filter(Boolean)).size).toBeGreaterThanOrEqual(2);
  });
});
