import {
  listMaterialSymbolCandidateIds,
  MATERIAL_SYMBOL_CANDIDATE_SOURCE,
  resolveMaterialSymbolCandidate,
} from "../material-symbol-candidates";
import { INK_PICTOGRAM_PALETTE } from "../style";

describe("Material Symbol replacement candidates", () => {
  it("pins a reviewable upstream source and license", () => {
    expect(MATERIAL_SYMBOL_CANDIDATE_SOURCE).toEqual({
      repository: "google/material-design-icons",
      commit: "50f0603134ce7b70b2d71b686cc13e8b57ccb74c",
      license: "Apache-2.0",
      variant: "materialsymbolsrounded-fill1-opsz20",
    });
  });

  it("keeps candidate identifiers unique and intentionally bounded", () => {
    const ids = listMaterialSymbolCandidateIds();

    expect(ids).toHaveLength(17);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(listMaterialSymbolCandidateIds())(
    "renders a sanitized, locally vendored candidate for %s",
    (id) => {
      const candidate = resolveMaterialSymbolCandidate(id);

      expect(candidate?.canonicalConcept).toBe(id);
      expect(candidate?.assetId).toMatch(/^material-symbols:[a-z0-9_]+:fill1-opsz20@50f0603134ce$/);
      expect(candidate?.svg).toContain('viewBox="0 -960 960 960"');
      expect(candidate?.svg).toMatch(/<path d=".{80,}"/);
      expect(candidate?.svg).toContain(`fill="${INK_PICTOGRAM_PALETTE.ink}"`);
      expect(candidate?.svg).not.toMatch(/<script|javascript:|onload=/i);
    }
  );

  it("fails closed for concepts outside the candidate inventory", () => {
    expect(resolveMaterialSymbolCandidate("car")).toBeNull();
  });
});
