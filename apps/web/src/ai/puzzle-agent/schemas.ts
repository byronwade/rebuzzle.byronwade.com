import { z } from "zod";
import { TECHNIQUE_IDS } from "./quality";
import { PuzzleVisualSchema } from "./visual/composition";

export const DifficultyTierLabelSchema = z.enum(["Hard", "Difficult", "Evil", "Impossible"]);

export const TechniqueIdSchema = z.enum(
  TECHNIQUE_IDS as unknown as [string, ...string[]]
);

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
    visual: PuzzleVisualSchema.describe(
      "Required generative board from compose_puzzle_visual"
    ),
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
});

export type CandidatePuzzle = z.infer<typeof CandidatePuzzleSchema>;
