import { z } from "zod";
import { TECHNIQUE_IDS } from "./quality";
import { PuzzleVisualSchema } from "./visual/composition";

export const DifficultyTierLabelSchema = z.enum(["Hard", "Difficult", "Evil", "Impossible"]);

export const TechniqueIdSchema = z.enum(TECHNIQUE_IDS as unknown as [string, ...string[]]);

export const PuzzleNoveltyEvidenceSchema = z.object({
  version: z.literal("structural-v1"),
  fingerprint: z.string().length(64),
  answerKey: z.string(),
  mechanismFamilyKey: z.string().length(64),
  mechanismKey: z.string().length(64),
  topologyKey: z.string().length(64),
  cueCombinationKey: z.string().length(64),
  orderedCueKey: z.string().length(64),
  cueTokens: z.array(z.string()).max(12),
  score: z.number().min(0).max(100),
  closestStructuralSimilarity: z.number().min(0).max(1),
  recentMechanismFamilyUses: z.number().int().nonnegative(),
  recentTopologyUses: z.number().int().nonnegative(),
  lookbackDays: z.number().int().positive(),
});

/** Final puzzle shape returned by the Eve / ToolLoop puzzle agent. */
export const PuzzleAgentResultSchema = z.object({
  puzzle: z.object({
    rebusPuzzle: z
      .string()
      .describe("Unicode/share fallback — must match visual.unicodeFallback when visual is set"),
    answer: z.string().min(1),
    difficulty: z.number().min(1).max(10),
    difficultyLevel: DifficultyTierLabelSchema.describe("Canonical tier label"),
    explanation: z.string().min(24),
    category: z.string().min(1),
    hints: z.array(z.string()).min(3).max(6),
    techniqueId: TechniqueIdSchema.describe("Named technique from the library"),
    /** Generative board (custom pictograms, text layers, optional images) */
    visual: PuzzleVisualSchema.describe("Required generative board from compose_puzzle_visual"),
  }),
  metadata: z.object({
    fingerprint: z.string(),
    uniquenessScore: z.number(),
    calibratedDifficulty: z.number(),
    difficultyLevel: DifficultyTierLabelSchema,
    qualityScore: z.number(),
    qualityVerdict: z.enum(["excellent", "good", "acceptable", "needs_work", "reject"]),
    funScore: z.number().optional(),
    generationAttempts: z.number().optional(),
    thinkingSummary: z.string().optional(),
    visualStyleId: z.string().optional(),
    /** Calibrated player-sim solve rate (0–1) */
    estimatedSolveRate: z.number().min(0).max(1).optional(),
    /** Rolling sim bias applied (live − estimated), if any */
    simCalibrationBias: z.number().optional(),
    /** Auditable evidence from blind rendered-board recognition. */
    boardRecognitionConfidence: z.number().min(0).max(1).optional(),
    boardRecognitionModels: z.array(z.string()).optional(),
    boardConceptVotes: z.record(z.string(), z.number().int().nonnegative()).optional(),
    boardRecognitionProfiles: z
      .array(
        z.object({
          profileId: z.string(),
          viewportWidth: z.number().int().positive(),
          tileSize: z.number().int().positive(),
          confidence: z.number().min(0).max(1),
          models: z.array(z.string()),
          conceptVotes: z.record(z.string(), z.number().int().nonnegative()),
          wrappedRows: z.number().int().nonnegative(),
        })
      )
      .max(6)
      .optional(),
    playabilityEvidence: z
      .object({
        blind: z.object({
          profileCount: z.number().int().nonnegative(),
          profilesWithTarget: z.number().int().nonnegative(),
          profilesWithTopTarget: z.number().int().nonnegative(),
          profilesWithDominantTarget: z.number().int().nonnegative(),
          topTargetFoundBy: z.number().int().nonnegative(),
          dominantTargetFoundBy: z.number().int().nonnegative(),
          meanReciprocalRank: z.number().min(0).max(1),
          strongestWrongConfidence: z.number().min(0).max(1),
          requiredVotes: z.number().int().positive(),
          profiles: z
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
            .max(6),
        }),
        editorial: z.object({
          profileCount: z.number().int().nonnegative(),
          acceptedProfiles: z.number().int().nonnegative(),
          confidence: z.number().min(0).max(1),
          failureKinds: z.array(z.string().max(40)).max(8),
        }),
      })
      .optional(),
    /** Searchable archive evidence proving answer, mechanism, topology, and cue novelty. */
    noveltyEvidence: PuzzleNoveltyEvidenceSchema.optional(),
  }),
  status: z.enum(["success", "retry", "failed"]),
  recommendations: z.array(z.string()).default([]),
});

export type PuzzleAgentResult = z.infer<typeof PuzzleAgentResultSchema>;

export const CandidatePuzzleSchema = z.object({
  rebusPuzzle: z.string(),
  answer: z.string(),
  difficulty: z.number().min(1).max(10),
  explanation: z.string(),
  category: z.string(),
  hints: z.array(z.string()).min(1),
  puzzleType: z.string().optional(),
  visual: PuzzleVisualSchema.optional(),
});

export type CandidatePuzzle = z.infer<typeof CandidatePuzzleSchema>;
