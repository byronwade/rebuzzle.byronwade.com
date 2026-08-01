/**
 * Hard constraints for brand_logo_wordplay.
 */

import { matchBrandInCatalog, getSvglCatalog } from "../external/svgl";
import type { PuzzleVisual } from "../visual/composition";

export type BrandConstraintResult = {
  ok: boolean;
  problems: string[];
};

/**
 * Brand puzzles must use a known SVGL mark and at least one non-brand beat.
 */
export async function validateBrandLogoWordplay(input: {
  techniqueId?: string;
  answer: string;
  visual?: PuzzleVisual;
}): Promise<BrandConstraintResult> {
  if (input.techniqueId !== "brand_logo_wordplay") {
    return { ok: true, problems: [] };
  }

  const problems: string[] = [];
  const layers = input.visual?.layers ?? [];
  const pictograms = layers.filter((l) => l.kind === "pictogram");

  if (pictograms.length < 1) {
    problems.push("brand_logo_wordplay needs a brand pictogram layer");
  }

  const catalog = await getSvglCatalog();
  const brandLayers = pictograms.filter((layer) => {
    if (layer.libraryIconId?.startsWith("svgl:")) return true;
    return Boolean(matchBrandInCatalog(layer.concept, catalog));
  });

  if (!brandLayers.length) {
    problems.push(
      "brand_logo_wordplay requires a household SVGL brand mark (use lookup_brand_logo)"
    );
  }

  const nonBrandBeats = layers.filter((layer) => {
    if (layer.kind === "text" && layer.content.trim()) return true;
    if (layer.kind === "operator") return true;
    if (layer.kind === "pictogram") {
      if (layer.libraryIconId?.startsWith("svgl:")) return false;
      return !matchBrandInCatalog(layer.concept, catalog);
    }
    return false;
  });

  if (nonBrandBeats.length < 1) {
    problems.push(
      "Brand logo alone is not a puzzle — add a non-brand icon, text, or operator beat"
    );
  }

  // Ban niche answer that is just the brand name with no wordplay
  const answerKey = input.answer.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const brandTitles = brandLayers.map((l) =>
    l.concept.toLowerCase().replace(/[^a-z0-9]+/g, "")
  );
  if (brandTitles.some((t) => t && t === answerKey)) {
    problems.push(
      "Answer cannot be only the brand name — invent a phrase that uses the brand as one beat"
    );
  }

  return { ok: problems.length === 0, problems };
}
