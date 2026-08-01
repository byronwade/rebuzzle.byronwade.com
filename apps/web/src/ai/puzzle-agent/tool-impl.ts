/**
 * Shared puzzle-agent tool implementations.
 * Used by both the Eve agent (`agent/tools/*`) and the in-process ToolLoopAgent.
 */

import { createHash } from "node:crypto";
import { AI_CONFIG } from "@/ai/config";
import { getCollection } from "@/db/mongodb";
import { getPuzzleTypeConfig, listPuzzleTypes } from "../config/puzzle-types";
import { calibrateDifficulty } from "../services/difficulty-calibrator";
import {
  calculateUniquenessScore,
  createPuzzleFingerprint,
  extractComponents,
  validateUniqueness,
} from "../services/uniqueness-tracker";
import {
  DIFFICULTY_LEVELS,
  type DifficultyTier,
  getDifficultyLevelByTier,
  getDifficultyLevelForScore,
  isDifficultyInBand,
  snapToDifficultyBand,
} from "./difficulty-levels";
import { sampleAnswerFirstSeeds } from "./craft/answer-first";
import { checkAntiClone } from "./craft/anti-clone";
import { validateBrandLogoWordplay } from "./craft/brand-constraints";
import { scoreHintFairness } from "./craft/hint-fairness";
import { isIdiomFairForDaily, sampleFairIdioms } from "./craft/idiom-frequency";
import {
  mechanismWinnersBrief,
  sampleMechanismWinners,
} from "./craft/mechanism-winners";
import {
  formatPhoneticGraphForPrompt,
  lookupPhoneticCues,
} from "./craft/phonetic-graph";
import { scoreShareability } from "./craft/shareability";
import {
  researchCulturalPulse,
} from "./external/cultural-pulse";
import { expandWordplay, formatWordplayForPrompt } from "./external/datamuse";
import { lookupWordSenses } from "./external/free-dictionary";
import { lookupSvglBrandLogo, suggestBrandSeeds } from "./external/svgl";
import {
  computeFunScore,
  displayLeaksAnswer,
  evaluateVisualForPublish,
  explanationMapsAnswer,
  hintLeaksAnswerEarly,
  isKnownTechniqueId,
  normalizeAnswerKey,
} from "./quality";
import type { CandidatePuzzle } from "./schemas";
import { getTechniques, listAllTechniques, type TechniqueId } from "./technique-library";
import { scorePictogramClarity } from "./visual/pictogram-clarity";

const DEFAULT_TARGET_DIFFICULTY = AI_CONFIG.puzzleAgent.defaultTargetDifficulty;

function resolvePrompt(
  value: string | ((params: Record<string, unknown>) => string) | undefined,
  params: Record<string, unknown> = {}
): string | null {
  if (!value) return null;
  return typeof value === "function" ? value(params) : value;
}

export async function getPuzzleTypeSpec(input: { puzzleType: string; targetDifficulty?: number }) {
  const config = getPuzzleTypeConfig(input.puzzleType);
  const targetDifficulty = input.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY;
  const level = getDifficultyLevelForScore(targetDifficulty);
  const promptParams = { targetDifficulty, puzzleType: input.puzzleType };
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    availableTypes: listPuzzleTypes(),
    difficultyRanges: config.difficulty.ranges,
    targetLevel: {
      tier: level.tier,
      label: level.label,
      band: { min: level.min, max: level.max },
      componentBudget: level.componentBudget,
    },
    requiredFields: config.validation.requiredFields,
    generationGuidance: resolvePrompt(config.generation.systemPrompt, promptParams),
    userPromptTemplate: resolvePrompt(config.generation.userPromptTemplate, promptParams),
    hintCount: config.hints.count,
  };
}

export async function getDifficultyBrief(input: {
  targetDifficulty?: number;
  tier?: DifficultyTier;
}) {
  const level = input.tier
    ? getDifficultyLevelByTier(input.tier)
    : getDifficultyLevelForScore(input.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY);

  const techniques = getTechniques(level.techniques);

  return {
    level: {
      tier: level.tier,
      label: level.label,
      min: level.min,
      max: level.max,
      target: level.target,
      blurb: level.blurb,
      playerPromise: level.playerPromise,
      componentBudget: level.componentBudget,
      hintStyle: level.hintStyle,
      avoid: level.avoid,
    },
    recommendedTechniques: techniques,
    allTiers: DIFFICULTY_LEVELS.map((l) => ({
      tier: l.tier,
      label: l.label,
      min: l.min,
      max: l.max,
      target: l.target,
    })),
    rule: "Final calibrated difficulty MUST land inside this tier's min/max band.",
  };
}

export async function listTechniqueLibrary(input: { techniqueIds?: string[] }) {
  if (input.techniqueIds?.length) {
    return { techniques: getTechniques(input.techniqueIds) };
  }
  return { techniques: listAllTechniques() };
}

export async function listRecentAnswers(input: { lookbackDays?: number; limit?: number }) {
  const lookbackDays = input.lookbackDays ?? 60;
  const limit = Math.min(input.limit ?? 40, 100);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  const puzzles = await getCollection("puzzles")
    .find({ createdAt: { $gte: cutoff } })
    .project({ answer: 1, category: 1, puzzle: 1, rebusPuzzle: 1, difficulty: 1 })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return {
    count: puzzles.length,
    answers: puzzles.map((p) => ({
      answer: String(p.answer ?? ""),
      category: String(p.category ?? ""),
      difficulty: typeof p.difficulty === "number" ? p.difficulty : null,
      tier:
        typeof p.difficulty === "number" ? getDifficultyLevelForScore(p.difficulty).label : null,
      preview: String(
        (p as { rebusPuzzle?: string; puzzle?: string }).rebusPuzzle ?? p.puzzle ?? ""
      ).slice(0, 80),
    })),
  };
}

type ConceptSeedIdea = {
  workingTitle: string;
  answerDirection: string;
  category: string;
  techniqueId: TechniqueId;
  layerPlan: string;
  whyItFitsTier: string;
  pictogramNouns?: string[];
  mechanismOneLiner?: string;
};

function proposeConceptSeedsFallback(input: {
  targetDifficulty: number;
  theme?: string;
  category?: string;
  avoidAnswers?: string[];
}) {
  const level = getDifficultyLevelForScore(input.targetDifficulty);
  const techniques = getTechniques(level.techniques);

  const theme = input.theme?.trim();
  const category = input.category?.trim() || "visual_wordplay";
  const avoidKeys = new Set((input.avoidAnswers ?? []).map((a) => normalizeAnswerKey(a)));

  const pick = (id: string | undefined, fallback: TechniqueId): TechniqueId => {
    if (id && techniques.some((t) => t.id === id)) return id as TechniqueId;
    return (techniques[0]?.id as TechniqueId) ?? fallback;
  };

  const seedIdeas: ConceptSeedIdea[] = [
    {
      workingTitle: theme ? `${theme} twist` : `${level.label} fresh compound`,
      answerDirection: theme
        ? `Invent a fresh common phrase/compound tied to "${theme}" — not a banned or overused trope`
        : "Invent a familiar compound/phrase with drawable nouns — avoid sunflower/before/piece-of-cake cousins",
      category,
      techniqueId: pick(techniques[0]?.id, "simple_compound"),
      layerPlan: "pictogram + pictogram (or pictogram + text) with clear order",
      whyItFitsTier: level.playerPromise,
      pictogramNouns: ["key", "bridge"],
      mechanismOneLiner: "Two concrete icons join into a familiar phrase",
    },
    {
      workingTitle: "Sound-alike pivot",
      answerDirection: "One clear homophone leap with a drawable sound cue; say the board out loud",
      category: "phonetic",
      techniqueId: pick(
        techniques.find((t) => t.id.includes("homophone") || t.id.includes("phonetic"))?.id,
        "single_homophone"
      ),
      layerPlan: "pictogram for the sound cue + literal partner",
      whyItFitsTier: "Phonetic leaps scale with difficulty when layered carefully",
      pictogramNouns: ["bee", "eye"],
      mechanismOneLiner: "Icon sounds like a syllable in the answer",
    },
    {
      workingTitle: "Space means meaning",
      answerDirection: "Positional/prepositional phrase where layout IS the word",
      category: "positional",
      techniqueId: pick(
        techniques.find((t) => t.id.includes("positional") || t.id.includes("spatial"))?.id,
        "basic_positional"
      ),
      layerPlan: "stack/overlay layout; avoid ambiguous prepositions",
      whyItFitsTier: level.blurb,
      pictogramNouns: ["house", "cloud"],
      mechanismOneLiner: "Placement of icons encodes the preposition",
    },
    {
      workingTitle: "Idiom as picture",
      answerDirection: "Widely known idiom rendered literally (no niche slang, no overused tropes)",
      category: "idiom",
      techniqueId: pick(
        techniques.find((t) => t.id.includes("idiom"))?.id,
        "idiom_as_picture"
      ),
      layerPlan: "pictogram for the punch image + text for the rest of the idiom",
      whyItFitsTier: "Share-worthy aha that still fits the tier budget",
      pictogramNouns: ["boat", "fish"],
      mechanismOneLiner: "Literal picture of a figurative phrase",
    },
    {
      workingTitle: "Typography game",
      answerDirection: "Size, strike, stack, or case carries one semantic beat",
      category: "typography",
      techniqueId: pick(
        techniques.find((t) => t.id.includes("size") || t.id.includes("case"))?.id,
        "size_or_case_semantics"
      ),
      layerPlan: "styled text layer (large/strike/stacked) + one supporting pictogram",
      whyItFitsTier: "Typography-as-gameplay feels premium and generative",
      pictogramNouns: ["crown"],
      mechanismOneLiner: "Text styling is half the joke; icon supports it",
    },
    {
      workingTitle: theme ? `${theme} brand pivot` : "Brand mark + twist",
      answerDirection: theme
        ? `Household-name brand related to "${theme}" plus one drawable beat into a common phrase`
        : "Household-name brand logo + one concrete icon/text beat → common phrase (not niche startups)",
      category: "brand",
      techniqueId: pick(
        techniques.find((t) => t.id.includes("brand") || t.id.includes("cultural"))?.id,
        "brand_logo_wordplay"
      ),
      layerPlan: "brand logo pictogram (SVGL) + pictogram or styled text",
      whyItFitsTier: "Modern cultural recognition that still needs a clever second beat",
      pictogramNouns: ["spotify", "fire"],
      mechanismOneLiner: "Brand mark is one syllable; partner icon completes the phrase",
    },
  ].filter((s) => {
    const key = normalizeAnswerKey(s.answerDirection);
    return !avoidKeys.has(key) && !avoidKeys.has(normalizeAnswerKey(s.workingTitle));
  });

  const winners = sampleMechanismWinners({
    preferredTechniques: techniques.map((t) => t.id),
    limit: 3,
  });
  for (const w of winners) {
    if (avoidKeys.has(normalizeAnswerKey(w.answer))) continue;
    seedIdeas.push({
      workingTitle: `Cousin of ${w.id}`,
      answerDirection: `Invent a cousin of "${w.answer}" — same mechanism family, fresher answer`,
      category: w.techniqueId.includes("idiom")
        ? "idiom"
        : w.techniqueId.includes("brand")
          ? "brand"
          : "visual_wordplay",
      techniqueId: pick(w.techniqueId, w.techniqueId),
      layerPlan: w.layerPlan,
      whyItFitsTier: w.whyItWorks,
      pictogramNouns: w.pictogramNouns,
      mechanismOneLiner: w.whyItWorks,
    });
  }

  const answerFirst = sampleAnswerFirstSeeds({
    targetDifficulty: input.targetDifficulty,
    preferredTechniques: techniques.map((t) => t.id),
    bannedAnswerKeys: avoidKeys,
    theme: input.theme,
    category: input.category,
    limit: 3,
  });
  for (const seed of answerFirst) {
    seedIdeas.push({
      workingTitle: `Answer-first: ${seed.answer}`,
      answerDirection: `Backform ONE mechanism from "${seed.answer}" (${seed.note})`,
      category: seed.source === "idiom-corpus" ? "idiom" : category,
      techniqueId: pick(seed.techniqueHint, "simple_compound"),
      layerPlan: seed.layerPlan || "pictogram + pictogram with clear order",
      whyItFitsTier: level.playerPromise,
      pictogramNouns: seed.pictogramNouns,
      mechanismOneLiner: seed.note,
    });
  }

  return {
    tier: level.label,
    band: { min: level.min, max: level.max },
    componentBudget: level.componentBudget,
    recommendedTechniques: techniques.map((t) => t.id),
    bannedAnswerKeys: [...avoidKeys].slice(0, 40),
    mechanismWinners: mechanismWinnersBrief(winners),
    fairIdioms: sampleFairIdioms({
      minFreq: input.targetDifficulty >= 8 ? 3 : 4,
      limit: 4,
    }),
    seeds: seedIdeas,
    source: "fallback" as const,
    note: "Seeds are starting points — invent a fresh answer not in bannedAnswerKeys / recent answers / overused tropes (before, sunflower, piece of cake). Pictogram concepts must be concrete nouns. Then call compose_puzzle_visual.",
  };
}

/**
 * Brainstorm creative concept seeds (LLM) with deterministic fallback.
 */
export async function proposeConceptSeeds(input: {
  targetDifficulty: number;
  theme?: string;
  category?: string;
  avoidAnswers?: string[];
}) {
  const level = getDifficultyLevelForScore(input.targetDifficulty);
  const techniques = getTechniques(level.techniques);
  const techIds = techniques.map((t) => t.id);
  const avoidKeys = new Set((input.avoidAnswers ?? []).map((a) => normalizeAnswerKey(a)));
  const fallback = proposeConceptSeedsFallback(input);

  try {
    const { z } = await import("zod");
    const { generateAIObject } = await import("@/ai/client");
    const { OVERUSED_REBUS_TROPES } = await import("./visual/icon-features");
    const { mechanismTemplateBrief, rebusCraftBrief } = await import("./rebus-craft");

    const lexicalSeed = (input.theme || input.category || "puzzle").split(/\s+/)[0] || "puzzle";
    const [wordplay, brandSeeds, culturalPulse] = await Promise.all([
      expandWordplay(lexicalSeed, 6),
      suggestBrandSeeds({ theme: input.theme, limit: 5 }),
      researchCulturalPulse({ theme: input.theme, category: input.category }),
    ]);
    const wordplayBlock = formatWordplayForPrompt(wordplay);
    const brandBlock = brandSeeds.length
      ? `Household brand logo options (use as pictogramNoun when doing brand_logo_wordplay): ${brandSeeds
          .map((b) => b.title)
          .join(", ")}`
      : "";
    const culturalBlock = culturalPulse.promptBlock;

    const SeedSchema = z.object({
      seeds: z
        .array(
          z.object({
            workingTitle: z.string().min(3).max(64),
            answerDirection: z
              .string()
              .min(8)
              .max(160)
              .describe("Specific inventable answer direction, not a vague instruction"),
            category: z.string().min(2).max(40),
            techniqueId: z.string(),
            layerPlan: z.string().min(8).max(160),
            whyItFitsTier: z.string().min(8).max(160),
            pictogramNouns: z.array(z.string().min(2).max(24)).min(1).max(4),
            mechanismOneLiner: z.string().min(8).max(120),
          })
        )
        .min(3)
        .max(5),
    });

    const invented = await generateAIObject({
      modelType: "creative",
      temperature: 0.92,
      schema: SeedSchema,
      system: `You invent fresh rebus puzzle directions for Rebuzzle.
Each seed must be clever but fair, with concrete drawable pictogram nouns.
Never suggest overused tropes: ${OVERUSED_REBUS_TROPES.join(", ")}.
Backform from a specific answer; use ONE primary mechanism (compound/position/size/equation/literal/brand).
techniqueId MUST be one of: ${techIds.join(", ")}.
pictogramNouns must be concrete objects a stranger can sketch (key, umbrella, lighthouse) — OR a household brand title when using brand_logo_wordplay.
Default difficulty target is ~80% (Impossible band) — prefer dense but fair mechanisms.
${rebusCraftBrief()}
${mechanismTemplateBrief()}`,
      prompt: [
        `Invent 5 distinct puzzle seeds for tier ${level.label} (difficulty ${input.targetDifficulty}/10).`,
        `Band ${level.min}–${level.max}. Budget ${level.componentBudget.min}–${level.componentBudget.max} parts.`,
        input.theme ? `Theme: ${input.theme}` : "No fixed theme — surprise us.",
        input.category ? `Preferred category: ${input.category}` : "",
        wordplayBlock,
        brandBlock,
        culturalBlock,
        avoidKeys.size
          ? `Avoid these answer keys: ${[...avoidKeys].slice(0, 25).join(", ")}`
          : "",
        "Each seed needs a specific answerDirection (name a plausible phrase), ONE mechanismOneLiner, and 1–3 pictogramNouns with unmistakable silhouettes.",
        "At most one seed may use brand_logo_wordplay; brands must be globally recognizable.",
        "If cultural pulse phraseSeeds exist, invent cousins — never paste headlines or niche fandom slang.",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const allowed = new Set<string>(techIds);
    const seeds: ConceptSeedIdea[] = invented.seeds
      .map((seed) => {
        const techniqueId = (
          allowed.has(seed.techniqueId) ? seed.techniqueId : techIds[0] || "simple_compound"
        ) as TechniqueId;
        return {
          workingTitle: seed.workingTitle,
          answerDirection: seed.answerDirection,
          category: seed.category,
          techniqueId,
          layerPlan: seed.layerPlan,
          whyItFitsTier: seed.whyItFitsTier,
          pictogramNouns: seed.pictogramNouns,
          mechanismOneLiner: seed.mechanismOneLiner,
        };
      })
      .filter((seed) => !avoidKeys.has(normalizeAnswerKey(seed.answerDirection)));

    if (seeds.length < 3) return fallback;

    return {
      ...fallback,
      seeds,
      source: "ai" as const,
      note: "AI seeds — invent a concrete answer outside banned/overused tropes. Use pictogramNouns as drawable icons. Then compose_puzzle_visual.",
    };
  } catch {
    return fallback;
  }
}

export function assembleVisualComponents(input: {
  answer: string;
  rebusPuzzle: string;
  techniqueId?: string;
  targetDifficulty: number;
}) {
  const level = getDifficultyLevelForScore(input.targetDifficulty);
  const components = extractComponents(input.rebusPuzzle);
  const emojiCount = components.emojis.length;
  const totalParts =
    emojiCount + components.text.length + components.arrows.length + components.symbols.length;

  const issues: string[] = [];
  const tips: string[] = [];

  if (totalParts < level.componentBudget.min) {
    issues.push(
      `Too sparse for ${level.label}: have ${totalParts} parts, want ≥ ${level.componentBudget.min}`
    );
  }
  if (totalParts > level.componentBudget.max) {
    issues.push(
      `Too dense for ${level.label}: have ${totalParts} parts, want ≤ ${level.componentBudget.max}`
    );
  }

  if (displayLeaksAnswer(input.rebusPuzzle, input.answer)) {
    issues.push("Answer text appears in the visual — hide it");
  }

  if (emojiCount === 0 && !/[↑↓←→/+\-×÷]/.test(input.rebusPuzzle)) {
    tips.push("Prefer compose_puzzle_visual with pictograms — unicode-only boards rarely publish");
  }

  let technique = null;
  const knownTechnique = isKnownTechniqueId(input.techniqueId);
  if (input.techniqueId) {
    const found = getTechniques([input.techniqueId])[0];
    technique = found ?? null;
    if (found) {
      tips.push(...found.howToAssemble.slice(0, 2));
    } else {
      issues.push(`Unknown techniqueId: ${input.techniqueId}`);
    }
  }

  const withinBudget =
    totalParts >= level.componentBudget.min && totalParts <= level.componentBudget.max;

  const funScore = computeFunScore({
    techniqueId: input.techniqueId,
    knownTechnique,
    withinBudget,
    issueCount: issues.length,
    generativeParts: 0,
    unicodeParts: emojiCount + components.symbols.length,
    hasSpatialOrOperator:
      components.arrows.length > 0 || /[/+\-×÷]/.test(input.rebusPuzzle),
    hasStyledText: false,
    explanationMapsWell: false,
  });

  return {
    components,
    totalParts,
    tier: level.label,
    componentBudget: level.componentBudget,
    withinBudget,
    technique,
    funScore,
    issues,
    tips,
  };
}

export function craftHintLadder(input: {
  answer: string;
  explanation: string;
  rebusPuzzle: string;
  targetDifficulty: number;
  existingHints?: string[];
}) {
  const level = getDifficultyLevelForScore(input.targetDifficulty);
  const answer = input.answer.trim();
  const words = answer.split(/\s+/).filter(Boolean);
  const firstLetter = answer[0]?.toUpperCase() ?? "?";
  const mechanism =
    /sound|phonetic|homophone/i.test(input.explanation)
      ? "This is a homophone / sounds-like rebus — say the pieces out loud."
      : /over|under|between|position|above|below|stack/i.test(input.explanation)
        ? "This is a positional layout rebus — placement matters as much as the pictures."
        : /brand|logo/i.test(input.explanation)
          ? "This is brand-logo wordplay — the mark is one beat, not the whole joke."
          : /idiom|literal/i.test(input.explanation)
            ? "This is a literal idiom picture — figurative phrase, concrete icons."
            : /size|scale|case|tiny|big/i.test(input.explanation)
              ? "Size or scale semantics carry half the meaning."
              : "This is a compound / join rebus — look for how the pieces combine into a familiar phrase.";

  const spoilerSafeExplain = input.explanation
    .replace(new RegExp(escapeRegExpSafe(answer), "ig"), "the answer")
    .slice(0, 72);

  const ladder = [
    mechanism,
    `Read the two (or three) icons/layers left-to-right or top-to-bottom — how they join is the device.`,
    `Notice the relationship between parts (${spoilerSafeExplain}${spoilerSafeExplain.length >= 72 ? "…" : ""}).`,
    words.length > 1
      ? `The answer has ${words.length} words; category/theme starts with thinking about the first word.`
      : `The answer is a single word; first letter category nudge comes last.`,
    // Final hint only: one first-letter nudge — never a full letter scaffold
    `Final nudge: it starts with "${firstLetter}".`,
  ].slice(0, Math.max(3, Math.min(5, level.componentBudget.max + 1)));

  const merged = input.existingHints?.length
    ? [...input.existingHints.slice(0, 2), ...ladder].slice(0, 5)
    : ladder;

  const safe = merged.map((h) =>
    h.toLowerCase().includes(answer.toLowerCase())
      ? h.replace(new RegExp(escapeRegExpSafe(answer), "ig"), "_____")
      : h
  );

  const leakIssues = hintLeaksAnswerEarly(safe, answer);
  const fairness = scoreHintFairness({
    hints: safe,
    answer,
    tierLabel: level.label,
  });

  return {
    tier: level.label,
    hintStyle: level.hintStyle,
    hints: safe,
    issues: [...leakIssues, ...fairness.problems],
    fairness,
    guidance:
      "Hints must progress device family → structure → fragment → letter. Never dump the full answer or a letter scaffold before the final hint.",
  };
}

function escapeRegExpSafe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stressTestSolvability(
  input: CandidatePuzzle & { targetDifficulty?: number; techniqueId?: string }
) {
  const target = input.targetDifficulty ?? input.difficulty;
  const level = getDifficultyLevelForScore(target);
  const assembly = assembleVisualComponents({
    answer: input.answer,
    rebusPuzzle: input.rebusPuzzle,
    techniqueId: input.techniqueId,
    targetDifficulty: target,
  });

  const blockers: string[] = [];
  const passes: string[] = [];

  if (!input.explanation || input.explanation.length < 20) {
    blockers.push("Explanation too thin to teach the mapping");
  } else {
    passes.push("Explanation present");
  }

  if ((input.hints?.length ?? 0) < 3) {
    blockers.push("Need ≥ 3 progressive hints for fair play");
  } else {
    passes.push("Hint count OK");
  }

  if (assembly.issues.length) {
    blockers.push(...assembly.issues);
  } else {
    passes.push("Component budget OK for tier");
  }

  const answerWords = input.answer.trim().split(/\s+/);
  if (answerWords.some((w) => w.length > 14)) {
    blockers.push("Unusually long token — may feel unfair");
  }

  if (displayLeaksAnswer(input.rebusPuzzle, input.answer)) {
    blockers.push("Answer leaked into the puzzle display");
  }

  if (!explanationMapsAnswer(input.explanation, input.answer)) {
    blockers.push("Explanation does not clearly map visuals to the answer");
  } else {
    passes.push("Explanation maps to answer");
  }

  const hintLeaks = hintLeaksAnswerEarly(input.hints ?? [], input.answer);
  if (hintLeaks.length) {
    blockers.push(...hintLeaks);
  } else if ((input.hints?.length ?? 0) >= 3) {
    passes.push("Hints do not over-reveal early");
  }

  if (!isKnownTechniqueId(input.techniqueId)) {
    blockers.push("Missing or unknown techniqueId");
  } else {
    passes.push(`Technique ${input.techniqueId}`);
  }

  const solvable = blockers.length === 0;
  return {
    solvable,
    tier: level.label,
    confidence: solvable ? 0.88 : Math.max(0.15, 0.65 - blockers.length * 0.12),
    passes,
    blockers,
    recommendation: solvable
      ? "Fair for publication after uniqueness/quality checks"
      : "Revise visuals, explanation, or hints before publishing",
  };
}

export async function checkUniqueness(
  input: CandidatePuzzle & { techniqueId?: string }
) {
  const display = input.rebusPuzzle;
  const fingerprint = createPuzzleFingerprint({
    rebusPuzzle: display,
    answer: input.answer,
    category: input.category,
    techniqueId: input.techniqueId,
  });

  // Hard ban: answer reuse across the FULL archive (active + retired)
  const { isAnswerRegistered } = await import("../learning/answer-registry");
  const archiveHit = await isAnswerRegistered(input.answer);

  const uniqueness = await validateUniqueness({
    rebusPuzzle: display,
    answer: input.answer,
    category: input.category,
    explanation: input.explanation,
  });

  const isUnique = uniqueness.isUnique && !archiveHit.taken;

  const uniquenessScore = isUnique
    ? await calculateUniquenessScore({
        rebusPuzzle: display,
        answer: input.answer,
        category: input.category,
        explanation: input.explanation,
      })
    : 0;

  const recommendations = [...(uniqueness.recommendations ?? [])];
  if (archiveHit.taken) {
    recommendations.unshift(
      `Answer already in archive${archiveHit.active === false ? " (retired puzzle)" : ""} — invent a different phrase`
    );
  }

  return {
    fingerprint,
    isUnique,
    similarityScore: archiveHit.taken ? 1 : uniqueness.similarityScore,
    uniquenessScore,
    conflictingPuzzles: uniqueness.conflictingPuzzles,
    recommendations,
    exactAnswerCollision: archiveHit.taken,
    conflictingPuzzleId: archiveHit.puzzleId,
  };
}

export async function calibratePuzzleDifficulty(
  input: CandidatePuzzle & { puzzleType?: string; targetDifficulty?: number }
) {
  const puzzleType = input.puzzleType ?? "rebus";
  const config = getPuzzleTypeConfig(puzzleType);
  const target = input.targetDifficulty ?? input.difficulty;

  let calibratedDifficulty: number;
  let method: "type_config" | "ai" = "type_config";
  let profile: unknown;

  if (config.difficulty?.calculate) {
    calibratedDifficulty = config.difficulty.calculate(input as never);
  } else {
    method = "ai";
    const calibration = await calibrateDifficulty({
      rebusPuzzle: input.rebusPuzzle,
      answer: input.answer,
      proposedDifficulty: input.difficulty,
      hints: input.hints,
    });
    calibratedDifficulty = calibration.calibratedDifficulty;
    profile = calibration.difficultyProfile;
  }

  const snapped = snapToDifficultyBand(calibratedDifficulty);
  const level = getDifficultyLevelForScore(target);
  const inBand = isDifficultyInBand(calibratedDifficulty, target);

  return {
    // Never lie: keep the measured score. Callers must reject !inBand.
    calibratedDifficulty: snapped,
    rawCalibrated: calibratedDifficulty,
    method,
    proposedDifficulty: input.difficulty,
    targetDifficulty: target,
    tier: level.label,
    tierBand: { min: level.min, max: level.max },
    inBand,
    adjustment: inBand
      ? "Within target tier"
      : `Off-band for ${level.label} (${level.min}–${level.max}). Redesign complexity — do not publish by forcing the target.`,
    profile,
  };
}

/** Fast heuristic quality score (no extra model call). */
export function scorePuzzleQuality(
  input: CandidatePuzzle & {
    targetDifficulty?: number;
    techniqueId?: string;
    visual?: {
      mode?: string;
      layers?: Array<{
        kind: string;
        svg?: string;
        src?: string;
        content?: string;
        emphasis?: string;
      }>;
      unicodeFallback?: string;
    };
  }
) {
  const issues: string[] = [];
  const strengths: string[] = [];
  const target = input.targetDifficulty ?? input.difficulty;
  const level = getDifficultyLevelForScore(target);

  const puzzle = (input.visual?.unicodeFallback || input.rebusPuzzle).trim();
  const answer = input.answer.trim();

  if (!puzzle) issues.push("Empty puzzle display");
  if (!answer) issues.push("Empty answer");
  if (displayLeaksAnswer(puzzle, answer)) {
    issues.push("Answer appears literally in the puzzle text");
  }
  if (!input.explanation || input.explanation.length < 24) {
    issues.push("Explanation too short — must teach the visual→answer mapping");
  } else if (!explanationMapsAnswer(input.explanation, answer)) {
    issues.push("Explanation does not clearly map visuals to the answer");
  } else {
    strengths.push("Explanation maps cleanly");
  }
  if (!input.hints || input.hints.length < 3) {
    issues.push("Need at least 3 progressive hints");
  } else {
    const hintLeaks = hintLeaksAnswerEarly(input.hints, answer);
    if (hintLeaks.length) issues.push(...hintLeaks);
    else strengths.push(`${input.hints.length} progressive hints`);
  }
  if (!isKnownTechniqueId(input.techniqueId)) {
    issues.push("Missing or unknown techniqueId — pick a named technique from the library");
  } else {
    strengths.push(`Technique ${input.techniqueId}`);
  }

  const assembly = assembleVisualComponents({
    answer,
    rebusPuzzle: puzzle,
    techniqueId: input.techniqueId,
    targetDifficulty: target,
  });
  if (!assembly.withinBudget) {
    issues.push(...assembly.issues.filter((i) => !issues.includes(i)));
  } else {
    strengths.push(`Component budget fits ${level.label}`);
  }

  const visualCheck = evaluateVisualForPublish(input.visual);
  if (!visualCheck.ok) {
    issues.push(visualCheck.reason ?? "Visual failed publish check");
  } else {
    strengths.push(
      visualCheck.pictogramSvgCount > 0
        ? `Generative Ink Pictograms (${visualCheck.pictogramSvgCount})`
        : "Styled generative text layers"
    );
  }

  const styledText = Boolean(
    input.visual?.layers?.some(
      (l) =>
        l.kind === "text" &&
        l.emphasis &&
        ["large", "small", "strike", "stacked", "tiny"].includes(l.emphasis)
    )
  );

  const pictogramSvgs = (input.visual?.layers ?? []).flatMap((layer) =>
    layer.kind === "pictogram" && layer.svg ? [layer.svg] : []
  );
  const clarityScores = pictogramSvgs.map((svg) => scorePictogramClarity(svg).score);
  const avgPictogramClarity = clarityScores.length
    ? clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length
    : null;

  const funScore = computeFunScore({
    techniqueId: input.techniqueId,
    knownTechnique: isKnownTechniqueId(input.techniqueId),
    withinBudget: assembly.withinBudget,
    issueCount: issues.length,
    generativeParts: visualCheck.pictogramSvgCount + (styledText ? 1 : 0),
    unicodeParts: assembly.components.emojis.length + assembly.components.symbols.length,
    hasSpatialOrOperator:
      assembly.components.arrows.length > 0 || /[/+\-×÷]/.test(puzzle),
    hasStyledText: styledText,
    explanationMapsWell: explanationMapsAnswer(input.explanation ?? "", answer),
    avgPictogramClarity,
  });

  if (funScore >= 70) strengths.push("High craft / fun score");
  if (avgPictogramClarity !== null && avgPictogramClarity >= 72) {
    strengths.push("Clear pictogram craft");
  }

  let score = 68;
  score -= issues.length * 12;
  score += Math.min(14, strengths.length * 3);
  score += Math.round((funScore - 55) / 8);
  if (visualCheck.ok && isKnownTechniqueId(input.techniqueId)) score += 8;
  score = Math.max(0, Math.min(100, score));

  const verdict =
    score >= 85
      ? ("excellent" as const)
      : score >= 70
        ? ("good" as const)
        : score >= 60
          ? ("acceptable" as const)
          : score >= 45
            ? ("needs_work" as const)
            : ("reject" as const);

  return {
    overall: score,
    verdict,
    strengths,
    issues,
    funScore,
    tier: level.label,
    publishable:
      score >= 70 &&
      issues.length === 0 &&
      isKnownTechniqueId(input.techniqueId) &&
      visualCheck.ok &&
      funScore >= 68,
  };
}

export function validatePuzzleCandidate(
  input: CandidatePuzzle & {
    puzzleType?: string;
    targetDifficulty?: number;
    techniqueId?: string;
    visual?: {
      mode?: string;
      layers?: Array<{ kind: string; svg?: string; content?: string; emphasis?: string }>;
      unicodeFallback?: string;
    };
  }
) {
  const puzzleType = input.puzzleType ?? "rebus";
  const config = getPuzzleTypeConfig(puzzleType);
  const target = input.targetDifficulty ?? input.difficulty;
  const level = getDifficultyLevelForScore(target);

  const errors: string[] = [];

  if (config.validation?.validate) {
    const result = config.validation.validate(input as never);
    if (!result.valid) errors.push(...(result.errors ?? []));
  }

  if (!isKnownTechniqueId(input.techniqueId)) {
    errors.push("techniqueId must be a known library technique");
  }

  const visualCheck = evaluateVisualForPublish(input.visual);
  if (!visualCheck.ok) {
    errors.push(visualCheck.reason ?? "Visual failed publish check");
  }

  const quality = scorePuzzleQuality({ ...input, targetDifficulty: target });
  if (!quality.publishable) errors.push(...quality.issues);

  if (!isDifficultyInBand(input.difficulty, target)) {
    errors.push(
      `Proposed difficulty ${input.difficulty} outside ${level.label} band ${level.min}-${level.max}`
    );
  }

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    puzzleType,
    tier: level.label,
  };
}

export function fingerprintCandidate(
  input: Pick<CandidatePuzzle, "rebusPuzzle" | "answer" | "category">
) {
  return createPuzzleFingerprint(input);
}

export function stableId(...parts: string[]) {
  return createHash("sha256").update(parts.join("::")).digest("hex").slice(0, 16);
}

export { composePuzzleVisual } from "./visual/compose-visual";
export { generateImageTile } from "./visual/generate-image-tile";
export { generatePictogram } from "./visual/generate-pictogram";

export async function lookupBrandLogo(input: { concept: string }) {
  const hit = await lookupSvglBrandLogo(input.concept);
  if (!hit) {
    return {
      found: false as const,
      concept: input.concept,
      tip: "No SVGL brand match — use a household brand name (spotify, discord, github) or a concrete noun pictogram.",
    };
  }
  return {
    found: true as const,
    concept: input.concept,
    title: hit.title,
    file: hit.file,
    category: hit.category,
    libraryIconId: hit.iconId,
    svg: hit.svg,
    tip: "Use this SVG as a pictogram layer (brand colors preserved). Pair with another icon/text beat — logo alone is not a puzzle.",
  };
}

export async function expandWordplayNeighbors(input: { seed: string; limit?: number }) {
  const expansion = await expandWordplay(input.seed, input.limit ?? 6);
  return {
    ...expansion,
    promptBlock: formatWordplayForPrompt(expansion),
    tip: "Use homophones/sounds-like for phonetic leaps; means-like/triggers for compound partners. Prefer ONE leap.",
  };
}

export async function researchCulturalPulseTool(input: {
  theme?: string;
  category?: string;
  query?: string;
}) {
  const pulse = await researchCulturalPulse(input);
  return {
    ...pulse,
    tip: "Invent cousins of phraseSeeds — never paste headlines. Prefer universally known idioms over niche fandom slang.",
  };
}

export function lookupPhoneticCuesTool(input: { seed: string; limit?: number }) {
  const suggestions = lookupPhoneticCues(input.seed, input.limit ?? 6);
  return {
    seed: input.seed,
    suggestions,
    promptBlock: formatPhoneticGraphForPrompt(suggestions),
    tip: "Prefer ONE phonetic leap. Pair the cue pictogram with a literal partner.",
  };
}

export async function lookupWordSensesTool(input: { word: string }) {
  const senses = await lookupWordSenses(input.word);
  return {
    ...senses,
    tip: senses.concreteNoun
      ? "Concrete noun reading found — good pictogram candidate."
      : "Weak/abstract for a pictogram — pick a more drawable object.",
  };
}

export function scoreHintFairnessTool(input: {
  hints: string[];
  answer: string;
  tierLabel?: string;
}) {
  return scoreHintFairness(input);
}

export function scoreShareabilityTool(input: {
  unicodeFallback: string;
  answer: string;
  pictogramCount?: number;
  hasStyledText?: boolean;
}) {
  return scoreShareability(input);
}

export async function checkAntiCloneTool(input: {
  rebusPuzzle: string;
  answer: string;
  explanation?: string;
  category?: string;
  techniqueId?: string;
}) {
  return checkAntiClone(input);
}

export async function validateBrandConstraintsTool(input: {
  techniqueId?: string;
  answer: string;
  visual?: Parameters<typeof validateBrandLogoWordplay>[0]["visual"];
}) {
  return validateBrandLogoWordplay(input);
}

export function checkIdiomFairnessTool(input: {
  phrase: string;
  minFreq?: number;
}) {
  const result = isIdiomFairForDaily(input.phrase, input.minFreq ?? 3);
  return {
    ...result,
    fairAlternatives: result.ok
      ? []
      : sampleFairIdioms({ minFreq: input.minFreq ?? 3, limit: 5 }),
  };
}

export type { TechniqueId };
