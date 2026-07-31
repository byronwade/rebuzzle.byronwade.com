/**
 * Curriculum planner — build a daily GenerationBrief for Apex.
 */

import { AI_CONFIG } from "../../config";
import { getDifficultyLevelForScore } from "../difficulty-levels";
import type { TechniqueId } from "../technique-library";
import { loadDiversitySnapshot } from "./diversity-memory";
import { loadLearningDigest } from "./learning-context";
import { samplePhraseBank } from "./phrase-bank";
import type { GenerationBrief } from "./types";

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
  const level = getDifficultyLevelForScore(input.targetDifficulty);
  const qualityThreshold = input.qualityThreshold ?? AI_CONFIG.puzzleAgent.qualityThreshold;
  const minFunScore = AI_CONFIG.puzzleAgent.minFunScore;
  const candidateCount = input.candidateCount ?? AI_CONFIG.puzzleAgent.apex?.candidateCount ?? 3;

  const [diversity, learning] = await Promise.all([
    loadDiversitySnapshot({ lookbackDays: 45 }),
    input.useLearningFeedback === false
      ? Promise.resolve({
          enabled: false,
          avoidPatterns: [] as string[],
          preferPatterns: [] as string[],
          difficultyDriftNotes: [] as string[],
          sampleSize: 0,
        })
      : loadLearningDigest(),
  ]);

  const banned = new Set(diversity.bannedAnswerKeys);
  const overused = new Set(diversity.overusedTechniques);

  // Prefer underused techniques from this tier; avoid overused ones
  const preferredTechniques = (
    [
      ...diversity.underusedTechniques.filter((t) => level.techniques.includes(t)),
      ...level.techniques.filter((t) => !overused.has(t)),
      ...level.techniques,
    ] as TechniqueId[]
  ).filter((t, i, arr) => arr.indexOf(t) === i) as TechniqueId[];

  const avoidTechniques = diversity.overusedTechniques.filter((t) =>
    level.techniques.includes(t)
  );

  const phraseSuggestions = samplePhraseBank({
    targetDifficulty: input.targetDifficulty,
    preferredTechniques,
    bannedAnswerKeys: banned,
    theme: input.theme,
    category: input.category,
    limit: 8,
  });

  const briefSummary = [
    `Tier ${level.label} (${level.min}–${level.max}), budget ${level.componentBudget.min}–${level.componentBudget.max}.`,
    `Prefer techniques: ${preferredTechniques.slice(0, 4).join(", ")}.`,
    avoidTechniques.length
      ? `Avoid overused: ${avoidTechniques.slice(0, 3).join(", ")}.`
      : "Technique diversity looks healthy.",
    `Ban ${banned.size} recent answers.`,
    phraseSuggestions.length
      ? `Phrase seeds (inspire, don't copy if banned): ${phraseSuggestions
          .slice(0, 4)
          .map((p) => p.answer)
          .join("; ")}.`
      : "Invent a fresh answer outside the ban list.",
    learning.enabled && learning.avoidPatterns.length
      ? `Learning avoid: ${learning.avoidPatterns.slice(0, 2).join("; ")}.`
      : null,
    learning.enabled && learning.preferPatterns.length
      ? `Learning prefer: ${learning.preferPatterns.slice(0, 2).join("; ")}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    targetDifficulty: input.targetDifficulty,
    tierLabel: level.label,
    puzzleType: input.puzzleType ?? "rebus",
    theme: input.theme,
    category: input.category,
    componentBudget: level.componentBudget,
    preferredTechniques,
    avoidTechniques,
    phraseSuggestions,
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
