/**
 * Forced invent → compose plan (answer-first / mechanism-first DAG).
 * Eve must follow this plan rather than freestyle tool-skipping.
 */

import {
  formatAnswerFirstForPrompt,
  sampleAnswerFirstSeeds,
} from "../craft/answer-first";
import {
  mechanismWinnersBrief,
  sampleMechanismWinners,
} from "../craft/mechanism-winners";
import {
  formatPhoneticGraphForPrompt,
  lookupPhoneticCues,
} from "../craft/phonetic-graph";
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
  phoneticBlock: string;
  answerFirstBlock: string;
  mechanismWinnersBlock: string;
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

  const answerSeeds = sampleAnswerFirstSeeds({
    targetDifficulty: input.brief.targetDifficulty,
    preferredTechniques: input.brief.preferredTechniques,
    bannedAnswerKeys: input.brief.diversity.bannedAnswerKeys,
    theme: input.theme,
    category: input.category,
    limit: Math.max(slotCount + 2, 5),
  });

  const winners = sampleMechanismWinners({
    preferredTechniques: input.brief.preferredTechniques,
    limit: 4,
  });
  const mechanismWinnersBlock = mechanismWinnersBrief(winners);

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
  const phoneticSuggestions = lookupPhoneticCues(lexicalSeed, 6);
  const phoneticBlock = formatPhoneticGraphForPrompt(phoneticSuggestions);
  const answerFirstBlock = formatAnswerFirstForPrompt(answerSeeds);

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
    const phoneticTechnique =
      allowed.includes("homophone") || allowed.includes("phonetic");
    const idiomTechnique = allowed.includes("idiom");
    const culturalSeed = culturalSeeds[index % Math.max(1, culturalSeeds.length || 1)];
    const answerSeedRow = answerSeeds[index % Math.max(1, answerSeeds.length || 1)];
    const winnerForTech =
      winners.find((w) => w.techniqueId === allowed) ?? winners[index % winners.length];

    const phrase =
      answerSeedRow?.answer ||
      input.brief.phraseSuggestions[index]?.answer ||
      (culturalSeed && culturalSeed.split(/\s+/).length <= 5 ? culturalSeed : undefined);

    const pictogramNouns = preferBrand
      ? [brandTitles[index % Math.max(1, brandTitles.length)] || "spotify", "fire"]
      : answerSeedRow?.pictogramNouns?.length
        ? answerSeedRow.pictogramNouns
        : phoneticTechnique && phoneticSuggestions[0]
          ? [
              phoneticSuggestions[0].cue,
              phrase
                ?.toLowerCase()
                .split(/[^a-z]+/)
                .filter((w) => w.length >= 3)[0] || "bridge",
            ]
          : phrase
            ? phrase
                .toLowerCase()
                .split(/[^a-z]+/)
                .filter((w) => w.length >= 3)
                .slice(0, 2)
            : winnerForTech?.pictogramNouns ?? ["key", "bridge"];

    const mechanismOneLiner =
      winnerForTech && winnerForTech.techniqueId === allowed
        ? `Cousin of "${winnerForTech.id}": ${winnerForTech.whyItWorks}`
        : mechanismForTechnique(allowed);

    const requiredTools = [
      "get_generation_brief",
      "get_daily_postmortem",
      "sample_answer_corpus",
      "research_cultural_pulse",
      "expand_wordplay",
      phoneticTechnique ? "lookup_phonetic_cues" : null,
      idiomTechnique || phoneticTechnique ? "lookup_word_senses" : null,
      preferBrand ? "lookup_brand_logo" : "propose_concept_seeds",
      "compose_puzzle_visual",
      "craft_hint_ladder",
      "score_hint_fairness",
      "score_shareability",
      "check_anti_clone",
      "score_quality",
    ].filter(Boolean) as string[];

    const briefNudge = [
      `LOCKED invent plan for slot ${index + 1}:`,
      `- techniqueId MUST be ${allowed}`,
      `- mechanism: ${mechanismOneLiner}`,
      `- ANSWER-FIRST REQUIRED: use seed "${phrase || "from answer-first list"}" as the answer (or a banned-safe cousin only if that exact key is banned)`,
      answerSeedRow?.wordCount && answerSeedRow.wordCount >= 2
        ? "- Prefer keeping this MULTI-WORD answer intact — do not collapse to a single compound"
        : null,
      answerSeedRow?.layerPlan ? `- layer plan hint: ${answerSeedRow.layerPlan}` : null,
      `- pictogram nouns to try: ${pictogramNouns.join(", ")}`,
      preferBrand
        ? "- use lookup_brand_logo / generate_pictogram(preferBrand) for the brand layer + one non-brand beat"
        : "- use generate_pictogram / icon packs for concrete nouns (check lookup_word_senses)",
      phoneticTechnique ? `- ${phoneticBlock}` : null,
      allowed.includes("letter")
        ? "- letter_play: show deletion/insertion clearly (strike / minus glyph)"
        : null,
      allowed.includes("container")
        ? "- container_phrase: one icon must be visually inside/outside another"
        : null,
      allowed.includes("direction")
        ? "- direction_wordplay: arrows/compass are semantic, not decoration"
        : null,
      "- You MUST call compose_puzzle_visual before finishing",
      "- After hints: call score_hint_fairness + score_shareability + check_anti_clone; reject if any fails",
      "- Prefer answers that feel culturally current but universally solvable (no niche fandom required)",
      answerFirstBlock,
      mechanismWinnersBlock,
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
      phoneticBlock,
      answerFirstBlock,
      mechanismWinnersBlock,
      mechanismOneLiner,
      requiredTools,
      briefNudge,
    };
  });
}
