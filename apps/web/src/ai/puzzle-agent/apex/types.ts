/**
 * Apex generation types — tournament, rubric, brief, critique.
 */

import { z } from "zod";
import type { DifficultyTierLabel } from "../difficulty-levels";
import type { PuzzleNoveltyEvidence } from "../novelty";
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

// Provider response schemas must require every property under strict JSON
// schema. Nullable creative scores are normalized into conservative defaults
// before the result enters the publication pipeline.
export const CritiqueProviderSchema = CritiqueSchema.extend({
  creativityScore: CritiqueSchema.shape.creativityScore.unwrap().nullable(),
  iconRecognizability: CritiqueSchema.shape.iconRecognizability.unwrap().nullable(),
  overusedTrope: CritiqueSchema.shape.overusedTrope.unwrap().nullable(),
});

export type CritiqueResult = z.infer<typeof CritiqueSchema>;

export const PlayerSimSchema = z.object({
  firstWrongParses: z.array(z.string()).max(5),
  likelySolvePath: z.string(),
  hintUnlockOrderLooksFair: z.boolean(),
  unfairReasons: z.array(z.string()).max(6),
  estimatedSolveRate: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  blindProfileCount: z.number().int().nonnegative().optional(),
  blindProfilesWithTarget: z.number().int().nonnegative().optional(),
  blindTopTargetFoundBy: z.number().int().nonnegative().optional(),
  blindDominantTargetFoundBy: z.number().int().nonnegative().optional(),
  blindProfilesWithTopTarget: z.number().int().nonnegative().optional(),
  blindProfilesWithDominantTarget: z.number().int().nonnegative().optional(),
  blindMeanReciprocalRank: z.number().min(0).max(1).optional(),
  blindStrongestWrongConfidence: z.number().min(0).max(1).optional(),
  blindRequiredVotes: z.number().int().positive().optional(),
  blindProfileResults: z
    .array(
      z.object({
        profileId: z.string().min(1),
        judgeCount: z.number().int().nonnegative(),
        targetFoundBy: z.number().int().nonnegative(),
        topTargetFoundBy: z.number().int().nonnegative(),
        dominantTargetFoundBy: z.number().int().nonnegative(),
        meanReciprocalRank: z.number().min(0).max(1),
        strongestWrongConfidence: z.number().min(0).max(1),
      })
    )
    .max(6)
    .optional(),
  editorialProfileCount: z.number().int().nonnegative().optional(),
  editorialAcceptedProfiles: z.number().int().nonnegative().optional(),
  editorialConfidence: z.number().min(0).max(1).optional(),
  editorialFailureKinds: z.array(z.string().max(40)).max(8).optional(),
  editorialReasons: z.array(z.string().max(320)).max(8).optional(),
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
  noveltyEvidence?: PuzzleNoveltyEvidence;
  calibratedDifficulty: number;
  inBand: boolean;
  isUnique: boolean;
  solvable: boolean;
  qualityOverall: number;
  funScore: number;
  boardRecognitionConfidence?: number;
  boardRecognitionModels?: string[];
  boardConceptVotes?: Record<string, number>;
  boardTextVotes?: Record<string, number>;
  boardOperatorVotes?: Record<string, number>;
  boardRecognitionProfiles?: Array<{
    profileId: string;
    viewportWidth: number;
    tileSize: number;
    confidence: number;
    models: string[];
    conceptVotes: Record<string, number>;
    textVotes: Record<string, number>;
    operatorVotes: Record<string, number>;
    wrappedRows: number;
  }>;
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
