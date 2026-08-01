/**
 * Curriculum planner — build a daily GenerationBrief for Apex.
 */

import { AI_CONFIG } from "../../config";
import { loadAllAnswerKeys } from "../../learning/answer-registry";
import { sampleAnswerFirstSeeds } from "../craft/answer-first";
import {
  corpusSize,
  listThemePacks,
  sampleAnswerCorpus,
} from "../craft/corpus/sample";
import { sampleFairIdioms } from "../craft/idiom-frequency";
import {
  mechanismWinnersBrief,
  sampleMechanismWinners,
} from "../craft/mechanism-winners";
import { getDifficultyLevelForScore } from "../difficulty-levels";
import { mechanismTemplateBrief, rebusCraftBrief } from "../rebus-craft";
import { isKnownTechniqueId } from "../quality";
import type { TechniqueId } from "../technique-library";
import { loadDiversitySnapshot } from "./diversity-memory";
import { loadLearningDigest } from "./learning-context";
import { samplePhraseBank } from "./phrase-bank";
import type { GenerationBrief, PhraseBankEntry } from "./types";

/** Clamp learning difficulty nudges into a sane band. */
export function applyDifficultyDelta(
  targetDifficulty: number,
  delta: number
): number {
  return Math.max(1, Math.min(10, Math.round(targetDifficulty + delta)));
}

export type CurriculumInput = {
  targetDifficulty: number;
  puzzleType?: string;
  theme?: string;
  category?: string;
  requireNovelty?: boolean;
  qualityThreshold?: number;
  candidateCount?: number;
  useLearningFeedback?: boolean;
};

/**
 * Assemble everything Eve needs before inventing: tier, diversity, phrases, learning.
 */
export async function buildGenerationBrief(input: CurriculumInput): Promise<GenerationBrief> {
  const qualityThreshold = input.qualityThreshold ?? AI_CONFIG.puzzleAgent.qualityThreshold;
  const minFunScore = AI_CONFIG.puzzleAgent.minFunScore;
  const candidateCount = input.candidateCount ?? AI_CONFIG.puzzleAgent.apex?.candidateCount ?? 3;

  const [diversity, learning, archiveKeys] = await Promise.all([
    loadDiversitySnapshot({ lookbackDays: 45 }),
    input.useLearningFeedback === false
      ? Promise.resolve({
          enabled: false,
          avoidPatterns: [] as string[],
          preferPatterns: [] as string[],
          difficultyDriftNotes: [] as string[],
          sampleSize: 0,
          targetDifficultyDelta: 0,
          tooEasy: false,
          tooHard: false,
          medianSolveSeconds: null as number | null,
          solveRate: null as number | null,
          likedTechniques: [] as string[],
          dislikedTechniques: [] as string[],
          preferAnswerPatterns: ["multi_word_2", "multi_word_3plus"] as string[],
          avoidAnswerPatterns: [] as string[],
          preferThemes: [] as string[],
          avoidThemes: [] as string[],
          postmortemRules: [] as string[],
          postmortemPromptBlock: "",
        })
      : loadLearningDigest(),
    loadAllAnswerKeys(500),
  ]);

  // Actually apply self-learning difficulty nudges (was previously text-only)
  const targetDifficulty = applyDifficultyDelta(
    input.targetDifficulty,
    learning.targetDifficultyDelta
  );
  const level = getDifficultyLevelForScore(targetDifficulty);

  // Ban recent + full archive answers so retired puzzles still block reuse
  const banned = new Set([...diversity.bannedAnswerKeys, ...archiveKeys]);
  const overused = new Set(diversity.overusedTechniques);
  const disliked = new Set(learning.dislikedTechniques);
  const likedInTier = learning.likedTechniques.filter((t) =>
    level.techniques.includes(t)
  ) as TechniqueId[];

  // Prefer underused techniques from this tier; avoid overused ones.
  // When players are finishing too quickly, bias toward harder techniques in-band.
  // Like/dislike votes are HARD weights (not prompt-only).
  const harderBias = learning.tooEasy
    ? (["false_lead_visual", "nested_homophone", "multi_layer_phonetic", "triple_layer_composition", "rare_but_fair_idiom"] as TechniqueId[])
    : [];

  const preferredTechniques = (
    [
      ...likedInTier,
      ...harderBias.filter((t) => level.techniques.includes(t) && !disliked.has(t)),
      ...diversity.underusedTechniques.filter(
        (t) => level.techniques.includes(t) && !disliked.has(t)
      ),
      ...level.techniques.filter((t) => !overused.has(t) && !disliked.has(t)),
      ...level.techniques.filter((t) => !disliked.has(t)),
      ...level.techniques,
    ] as TechniqueId[]
  ).filter((t, i, arr) => arr.indexOf(t) === i) as TechniqueId[];

  const avoidTechniques = [
    ...learning.dislikedTechniques.filter((t) => level.techniques.includes(t)),
    ...diversity.overusedTechniques.filter((t) => level.techniques.includes(t)),
    ...(learning.tooEasy
      ? (["simple_compound", "obvious_emoji_sum"] as string[]).filter((t) =>
          level.techniques.includes(t)
        )
      : []),
  ].filter((t, i, arr) => arr.indexOf(t) === i);

  const phraseSuggestions = samplePhraseBank({
    targetDifficulty,
    preferredTechniques,
    bannedAnswerKeys: banned,
    theme: input.theme,
    category: input.category,
    limit: 8,
  });

  const fairIdioms = sampleFairIdioms({
    minFreq: targetDifficulty >= 8 ? 3 : 4,
    limit: 5,
    excludeOverused: true,
  });
  const winnersBrief = mechanismWinnersBrief(
    sampleMechanismWinners({ preferredTechniques, limit: 3 })
  );

  // Theme preference from outcomes when caller didn't specify one
  const effectiveTheme =
    input.theme ||
    learning.preferThemes.find((t) => !learning.avoidThemes.includes(t)) ||
    input.category;

  const corpusSeeds = sampleAnswerCorpus({
    targetDifficulty,
    preferredTechniques,
    bannedAnswerKeys: banned,
    theme: effectiveTheme,
    category: input.category,
    limit: 6,
    preferMultiWord:
      targetDifficulty >= 7 ||
      learning.preferAnswerPatterns.some((p) => p.startsWith("multi_word")),
    preferGold: true,
    preferAnswerPatterns: learning.preferAnswerPatterns,
    avoidAnswerPatterns: learning.avoidAnswerPatterns,
  });
  const answerFirst = sampleAnswerFirstSeeds({
    targetDifficulty,
    preferredTechniques,
    bannedAnswerKeys: banned,
    theme: effectiveTheme,
    category: input.category,
    limit: 6,
    preferAnswerPatterns: learning.preferAnswerPatterns,
    avoidAnswerPatterns: learning.avoidAnswerPatterns,
  });
  const themePacks = listThemePacks().slice(0, 8);

  // Prefer multi-word corpus answers in phraseSuggestions when available
  const corpusAsPhrases: PhraseBankEntry[] = corpusSeeds.slice(0, 4).map((s) => ({
    answer: s.answer,
    category: s.themes[0] || input.category || "visual_wordplay",
    difficultyHint: targetDifficulty,
    techniqueAffinity: s.techniques.filter((t): t is TechniqueId => isKnownTechniqueId(t)).slice(
      0,
      2
    ),
    notes: "answer-corpus",
  }));
  const mergedPhrases: PhraseBankEntry[] = [...corpusAsPhrases, ...phraseSuggestions]
    .filter(
      (p, i, arr) =>
        arr.findIndex(
          (x) =>
            x.answer.toLowerCase().replace(/[^a-z0-9]+/g, "") ===
            p.answer.toLowerCase().replace(/[^a-z0-9]+/g, "")
        ) === i
    )
    .slice(0, 10);

  const briefSummary = [
    `Tier ${level.label} (${level.min}–${level.max}), budget ${level.componentBudget.min}–${level.componentBudget.max}.`,
    `ANSWER-FIRST DEFAULT: scored corpus has ${corpusSize()} answers (prefer GOLD tier) — pick a seed, backform the board; never freestyle a recycled trope.`,
    targetDifficulty >= 7 || learning.preferAnswerPatterns.some((p) => p.startsWith("multi_word"))
      ? "Prefer MULTI-WORD answers (2–5 words) for uniqueness headroom."
      : null,
    learning.preferAnswerPatterns.length
      ? `Hard prefer answer shapes: ${learning.preferAnswerPatterns.join(", ")}.`
      : null,
    learning.avoidAnswerPatterns.length
      ? `Hard avoid answer shapes: ${learning.avoidAnswerPatterns.join(", ")}.`
      : null,
    `Prefer techniques: ${preferredTechniques.slice(0, 5).join(", ")}.`,
    likedInTier.length
      ? `Outcome/liked techniques (hard prefer): ${likedInTier.slice(0, 3).join(", ")}.`
      : null,
    avoidTechniques.length
      ? `Avoid overused/disliked/too-easy techniques: ${avoidTechniques.slice(0, 4).join(", ")}.`
      : "Technique diversity looks healthy.",
    `Ban ${banned.size} archived+recent answers (never reuse answer keys).`,
    `Theme packs: ${themePacks.join(", ")}.`,
    learning.postmortemRules.length
      ? `Postmortem rules: ${learning.postmortemRules.slice(0, 3).join(" | ")}.`
      : null,
    learning.postmortemPromptBlock || null,
    answerFirst.length
      ? `Answer-first seeds: ${answerFirst
          .slice(0, 4)
          .map((s) => s.answer)
          .join("; ")}.`
      : null,
    mergedPhrases.length
      ? `Corpus/phrase seeds (build from these; do not copy boards): ${mergedPhrases
          .slice(0, 4)
          .map((p) => p.answer)
          .join("; ")}.`
      : "Invent a fresh answer outside the ban list.",
    fairIdioms.length
      ? `Fair-frequency idiom seeds: ${fairIdioms.slice(0, 3).join("; ")}.`
      : null,
    winnersBrief || null,
    learning.enabled && learning.difficultyDriftNotes.length
      ? `Self-learning: ${learning.difficultyDriftNotes.slice(0, 2).join("; ")}.`
      : null,
    learning.enabled && learning.avoidPatterns.length
      ? `Learning avoid: ${learning.avoidPatterns.slice(0, 2).join("; ")}.`
      : null,
    learning.enabled && learning.preferPatterns.length
      ? `Learning prefer: ${learning.preferPatterns.slice(0, 2).join("; ")}.`
      : null,
    learning.targetDifficultyDelta !== 0
      ? `Applied difficulty delta: ${learning.targetDifficultyDelta > 0 ? "+" : ""}${learning.targetDifficultyDelta} → target ${targetDifficulty}/10.`
      : null,
    rebusCraftBrief(),
    mechanismTemplateBrief(),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    targetDifficulty,
    tierLabel: level.label,
    puzzleType: input.puzzleType ?? "rebus",
    theme: input.theme,
    category: input.category,
    componentBudget: level.componentBudget,
    preferredTechniques,
    avoidTechniques,
    phraseSuggestions: mergedPhrases,
    diversity,
    learning,
    qualityThreshold,
    minFunScore,
    minRubricOverall: AI_CONFIG.puzzleAgent.apex?.minRubricOverall ?? 78,
    candidateCount,
    requireNovelty: input.requireNovelty !== false,
    briefSummary,
  };
}
