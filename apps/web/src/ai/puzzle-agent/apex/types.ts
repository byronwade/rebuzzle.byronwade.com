/**
 * Apex generation types — tournament, rubric, brief, critique.
 */

import { z } from "zod";
import type { DifficultyTierLabel } from "../difficulty-levels";
import type { TechniqueId } from "../technique-library";
import type { PuzzleVisual } from "../visual/composition";

export const RubricScoresSchema = z.object({
  ahaMoment: z.number().min(0).max(100),
  fairness: z.number().min(0).max(100),
  novelty: z.number().min(0).max(100),
  visualCraft: z.number().min(0).max(100),
  shareability: z.number().min(0).max(100),
  techniqueFit: z.number().min(0).max(100),
  hintCraft: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
});

export type RubricScores = z.infer<typeof RubricScoresSchema>;

export const CritiqueSchema = z.object({
  verdict: z.enum(["ship", "revise", "reject"]),
  summary: z.string(),
  strengths: z.array(z.string()).max(6),
  flaws: z.array(z.string()).max(8),
  reviseInstructions: z.array(z.string()).max(6),
  falseLeadQuality: z.number().min(0).max(100),
  ahaPredicted: z.number().min(0).max(100),
  /** Mechanism inventiveness — not catalog uniqueness */
  creativityScore: z.number().min(0).max(100).optional(),
  /** Would a stranger recognize the icons? */
  iconRecognizability: z.number().min(0).max(100).optional(),
  /** Classic rebus cliché without a fresh twist */
  overusedTrope: z.boolean().optional(),
});

export type CritiqueResult = z.infer<typeof CritiqueSchema>;

export const PlayerSimSchema = z.object({
  firstWrongParses: z.array(z.string()).max(5),
  likelySolvePath: z.string(),
  hintUnlockOrderLooksFair: z.boolean(),
  unfairReasons: z.array(z.string()).max(6),
  estimatedSolveRate: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});

export type PlayerSimResult = z.infer<typeof PlayerSimSchema>;

export type PhraseBankEntry = {
  answer: string;
  category: string;
  difficultyHint: number;
  techniqueAffinity: TechniqueId[];
  notes?: string;
  /** Classic trope — fine as anti-inspiration, bad to copy */
  overused?: boolean;
};

export type DiversitySnapshot = {
  recentAnswers: string[];
  recentTechniques: Array<{ id: string; count: number }>;
  recentCategories: Array<{ id: string; count: number }>;
  overusedTechniques: string[];
  underusedTechniques: string[];
  bannedAnswerKeys: string[];
  lookbackDays: number;
};

export type LearningDigest = {
  enabled: boolean;
  avoidPatterns: string[];
  preferPatterns: string[];
  difficultyDriftNotes: string[];
  sampleSize: number;
  /** Apply to scheduled difficulty before generation */
  targetDifficultyDelta: number;
  tooEasy: boolean;
  tooHard: boolean;
  medianSolveSeconds: number | null;
  solveRate: number | null;
  /** Hard technique weights from like/dislike votes */
  likedTechniques: string[];
  dislikedTechniques: string[];
  /** Outcome-weighted hard lists (solve/time/hints/likes) */
  preferAnswerPatterns: string[];
  avoidAnswerPatterns: string[];
  preferThemes: string[];
  avoidThemes: string[];
  /** Daily postmortem rules for tomorrow's invent */
  postmortemRules: string[];
  postmortemPromptBlock: string;
};

export type GenerationBrief = {
  targetDifficulty: number;
  tierLabel: DifficultyTierLabel;
  puzzleType: string;
  theme?: string;
  category?: string;
  componentBudget: { min: number; max: number };
  preferredTechniques: TechniqueId[];
  avoidTechniques: string[];
  phraseSuggestions: PhraseBankEntry[];
  diversity: DiversitySnapshot;
  learning: LearningDigest;
  qualityThreshold: number;
  minFunScore: number;
  minRubricOverall: number;
  candidateCount: number;
  requireNovelty: boolean;
  briefSummary: string;
};

export type ApexCandidate = {
  id: string;
  rebusPuzzle: string;
  answer: string;
  difficulty: number;
  difficultyLevel: DifficultyTierLabel;
  explanation: string;
  category: string;
  hints: string[];
  techniqueId: TechniqueId;
  visual: PuzzleVisual;
  fingerprint: string;
  uniquenessScore: number;
  calibratedDifficulty: number;
  inBand: boolean;
  isUnique: boolean;
  solvable: boolean;
  qualityOverall: number;
  funScore: number;
  publishable: boolean;
  critique?: CritiqueResult;
  playerSim?: PlayerSimResult;
  rubric?: RubricScores;
  tournamentScore?: number;
  rejectReasons: string[];
};

export type ApexEngineResult = {
  winner: ApexCandidate;
  runnersUp: ApexCandidate[];
  brief: GenerationBrief;
  engine: "apex";
  phases: {
    briefMs: number;
    generateMs: number;
    critiqueMs: number;
    selectMs: number;
    totalMs: number;
  };
  thinkingSummary: string;
};
