/**
 * Forced invent → compose plan (answer-first / mechanism-first DAG).
 * Eve must follow this plan rather than freestyle tool-skipping.
 */

import type { CulturalPulse } from "../external/cultural-pulse";
import { expandWordplay, formatWordplayForPrompt } from "../external/datamuse";
import { suggestBrandSeeds } from "../external/svgl";
import type { TechniqueId } from "../technique-library";
import type { GenerationBrief } from "../apex/types";
import type { WrongGuessDigest } from "./wrong-guesses";
import { isTechniqueAllowedForTier, pickDiverseTechniqueFocuses } from "./technique-gates";

export type InventPlan = {
  slot: number;
  techniqueId: TechniqueId;
  family: string;
  answerSeed?: string;
  pictogramNouns: string[];
  preferBrand: boolean;
  wordplayBlock: string;
  brandOptions: string[];
  wrongGuessBlock: string;
  culturalBlock: string;
  mechanismOneLiner: string;
  requiredTools: string[];
  briefNudge: string;
};

function mechanismForTechnique(techniqueId: TechniqueId): string {
  if (techniqueId.includes("homophone") || techniqueId.includes("phonetic")) {
    return "ONE phonetic leap with a drawable sound cue";
  }
  if (techniqueId.includes("positional") || techniqueId.includes("spatial")) {
    return "Layout/preposition IS the word — placement carries meaning";
  }
  if (techniqueId.includes("brand")) {
    return "Household brand logo + one non-brand beat into a common phrase";
  }
  if (techniqueId.includes("size") || techniqueId.includes("case")) {
    return "Typography/scale is half the joke";
  }
  if (techniqueId.includes("idiom")) {
    return "Literal picture of a figurative phrase";
  }
  if (techniqueId.includes("false_lead")) {
    return "Tempting wrong compound; twist reveals the real phrase";
  }
  return "Backform from a specific answer; ONE primary device";
}

/**
 * Build one invent plan per tournament slot with forced diversity + lexical intel.
 */
export async function buildInventPlans(input: {
  brief: GenerationBrief;
  wrongGuesses: WrongGuessDigest;
  culturalPulse?: CulturalPulse;
  theme?: string;
  category?: string;
}): Promise<InventPlan[]> {
  const slotCount = Math.max(1, input.brief.candidateCount);
  const focuses = pickDiverseTechniqueFocuses(
    input.brief.preferredTechniques,
    slotCount,
    input.brief.targetDifficulty
  );

  const lexicalSeed =
    (input.theme || input.category || input.brief.phraseSuggestions[0]?.answer || "puzzle")
      .split(/\s+/)[0]
      ?.slice(0, 32) || "puzzle";

  const [wordplay, brands] = await Promise.all([
    expandWordplay(lexicalSeed, 6),
    suggestBrandSeeds({ theme: input.theme, limit: 6 }),
  ]);
  const wordplayBlock = formatWordplayForPrompt(wordplay);
  const brandTitles = brands.map((b) => b.title);
  const culturalBlock =
    input.culturalPulse?.promptBlock ||
    "Cultural pulse unavailable — invent timeless idioms, not news headlines.";
  const culturalSeeds = input.culturalPulse?.phraseSeeds ?? [];

  return focuses.map((techniqueId, index) => {
    const allowed = isTechniqueAllowedForTier(
      techniqueId,
      input.brief.targetDifficulty
    )
      ? techniqueId
      : (input.brief.preferredTechniques.find((t) =>
          isTechniqueAllowedForTier(t, input.brief.targetDifficulty)
        ) ?? techniqueId);

    const preferBrand = allowed.includes("brand");
    const culturalSeed = culturalSeeds[index % Math.max(1, culturalSeeds.length || 1)];
    const phrase =
      input.brief.phraseSuggestions[index]?.answer ||
      (culturalSeed && culturalSeed.split(/\s+/).length <= 5 ? culturalSeed : undefined);
    const pictogramNouns = preferBrand
      ? [brandTitles[index % Math.max(1, brandTitles.length)] || "spotify", "fire"]
      : phrase
        ? phrase
            .toLowerCase()
            .split(/[^a-z]+/)
            .filter((w) => w.length >= 3)
            .slice(0, 2)
        : ["key", "bridge"];

    const mechanismOneLiner = mechanismForTechnique(allowed);
    const requiredTools = [
      "get_generation_brief",
      "research_cultural_pulse",
      "expand_wordplay",
      preferBrand ? "lookup_brand_logo" : "propose_concept_seeds",
      "compose_puzzle_visual",
      "craft_hint_ladder",
      "score_quality",
    ];

    const briefNudge = [
      `LOCKED invent plan for slot ${index + 1}:`,
      `- techniqueId MUST be ${allowed}`,
      `- mechanism: ${mechanismOneLiner}`,
      phrase ? `- answer seed (cousin OK, do not copy): ${phrase}` : null,
      `- pictogram nouns to try: ${pictogramNouns.join(", ")}`,
      preferBrand
        ? "- use lookup_brand_logo / generate_pictogram(preferBrand) for the brand layer"
        : "- use generate_pictogram / icon packs for concrete nouns",
      "- You MUST call compose_puzzle_visual before finishing",
      "- Prefer answers that feel culturally current but universally solvable (no niche fandom required)",
      wordplayBlock,
      culturalBlock,
      input.wrongGuesses.promptBlock,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      slot: index + 1,
      techniqueId: allowed,
      family: preferBrand ? "brand" : allowed.split("_")[0] || "general",
      answerSeed: phrase,
      pictogramNouns,
      preferBrand,
      wordplayBlock,
      brandOptions: brandTitles,
      wrongGuessBlock: input.wrongGuesses.promptBlock,
      culturalBlock,
      mechanismOneLiner,
      requiredTools,
      briefNudge,
    };
  });
}
