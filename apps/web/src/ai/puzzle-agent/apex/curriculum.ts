/**
 * Curriculum planner — build a daily GenerationBrief for Apex.
 */

import { AI_CONFIG } from "../../config";
import { loadAllAnswerKeys } from "../../learning/answer-registry";
import { getDifficultyLevelForScore } from "../difficulty-levels";
import { normalizeAnswerKey } from "../quality";
import type { TechniqueId } from "../technique-library";
import { loadDiversitySnapshot } from "./diversity-memory";
import { loadLearningDigest } from "./learning-context";
import { PHRASE_BANK, samplePhraseBank } from "./phrase-bank";
import { biasTechniquesBySolveRates, loadTechniqueSolveRates } from "./technique-calibration";
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

  const [diversity, learning, archiveKeys, techniqueCalibration] = await Promise.all([
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
        })
      : loadLearningDigest(),
    loadAllAnswerKeys(500),
    input.useLearningFeedback === false
      ? Promise.resolve({
          lookbackDays: 45,
          sampleSize: 0,
          rates: [],
          notes: [] as string[],
        })
      : loadTechniqueSolveRates({ lookbackDays: 45 }),
  ]);

  // Ban recent + full archive answers so retired puzzles still block reuse
  const banned = new Set([...diversity.bannedAnswerKeys, ...archiveKeys]);
  const overused = new Set(diversity.overusedTechniques);

  // Do not advertise a tier technique that has no fresh, curated answer
  // seed. The engine reserves seeds strictly by technique; filtering here
  // preserves diversity without silently pairing a positional slot with an
  // unrelated compound answer.
  const freshSeedTechniques = new Set(
    PHRASE_BANK.filter(
      (entry) =>
        !entry.overused &&
        Boolean(entry.visualCues?.length) &&
        !banned.has(normalizeAnswerKey(entry.answer))
    ).flatMap((entry) => entry.techniqueAffinity)
  );
  const supportedTierTechniques = level.techniques.filter((technique) =>
    freshSeedTechniques.has(technique as TechniqueId)
  ) as TechniqueId[];

  // Prefer underused techniques from this tier; avoid overused ones.
  // When players are finishing too quickly, bias toward harder techniques in-band.
  const harderBias = learning.tooEasy
    ? ([
        "false_lead_visual",
        "nested_homophone",
        "multi_layer_phonetic",
        "triple_layer_composition",
        "rare_but_fair_idiom",
      ] as TechniqueId[])
    : [];

  const preferredTechniquesRaw = (
    [
      ...harderBias.filter((t) => supportedTierTechniques.includes(t)),
      ...diversity.underusedTechniques.filter((t) =>
        supportedTierTechniques.includes(t as TechniqueId)
      ),
      ...supportedTierTechniques.filter((t) => !overused.has(t)),
      ...supportedTierTechniques,
    ] as TechniqueId[]
  ).filter((t, i, arr) => arr.indexOf(t) === i) as TechniqueId[];

  const techniqueBias = biasTechniquesBySolveRates({
    preferredTechniques: preferredTechniquesRaw,
    rates: techniqueCalibration.rates,
    tooEasy: learning.tooEasy,
    tooHard: learning.tooHard,
  });
  const preferredTechniques = techniqueBias.techniques;

  const avoidTechniques = [
    ...diversity.overusedTechniques.filter((t) =>
      supportedTierTechniques.includes(t as TechniqueId)
    ),
    ...(learning.tooEasy
      ? (["simple_compound", "obvious_emoji_sum"] as string[]).filter((t) =>
          supportedTierTechniques.includes(t as TechniqueId)
        )
      : []),
  ];

  const phraseSuggestions = samplePhraseBank({
    targetDifficulty: input.targetDifficulty,
    preferredTechniques,
    bannedAnswerKeys: banned,
    theme: input.theme,
    category: input.category,
    limit: Math.max(8, candidateCount * 3),
    excludeOverused: true,
    requireVisualCuePlan: true,
  });

  const briefSummary = [
    `Tier ${level.label} (${level.min}–${level.max}), budget ${level.componentBudget.min}–${level.componentBudget.max}.`,
    `Prefer techniques: ${preferredTechniques.slice(0, 4).join(", ")}.`,
    avoidTechniques.length
      ? `Avoid overused/too-easy techniques: ${avoidTechniques.slice(0, 4).join(", ")}.`
      : "Technique diversity looks healthy.",
    `Fresh answer seeds with explicit visual cue plans cover ${supportedTierTechniques.length}/${level.techniques.length} techniques in this tier.`,
    `Ban ${banned.size} archived+recent answers (never reuse).`,
    phraseSuggestions.length
      ? `Answer-first candidates available for grounded composition: ${phraseSuggestions
          .slice(0, 4)
          .map((p) => p.answer)
          .join("; ")}.`
      : "No answer-first candidates are available; Apex must fail closed and use the validated reserve inventory.",
    learning.enabled && learning.difficultyDriftNotes.length
      ? `Self-learning: ${learning.difficultyDriftNotes.slice(0, 2).join("; ")}.`
      : null,
    learning.enabled && learning.avoidPatterns.length
      ? `Learning avoid: ${learning.avoidPatterns.slice(0, 3).join("; ")}.`
      : null,
    learning.enabled && learning.preferPatterns.length
      ? `Learning prefer: ${learning.preferPatterns.slice(0, 3).join("; ")}.`
      : null,
    techniqueBias.notes[0] ?? techniqueCalibration.notes[0] ?? null,
    learning.targetDifficultyDelta !== 0
      ? `Applied difficulty delta: ${learning.targetDifficultyDelta > 0 ? "+" : ""}${learning.targetDifficultyDelta}.`
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
