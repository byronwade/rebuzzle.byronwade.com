import { z } from "zod";

/** Final puzzle shape returned by the Eve / ToolLoop puzzle agent. */
export const PuzzleAgentResultSchema = z.object({
  puzzle: z.object({
    rebusPuzzle: z.string().describe("Visual / prompt content shown to the player"),
    answer: z.string().min(1),
    difficulty: z.number().min(1).max(10),
    explanation: z.string().min(1),
    category: z.string().min(1),
    hints: z.array(z.string()).min(2).max(6),
  }),
  metadata: z.object({
    fingerprint: z.string(),
    uniquenessScore: z.number(),
    calibratedDifficulty: z.number(),
    qualityScore: z.number(),
    qualityVerdict: z.enum(["excellent", "good", "acceptable", "needs_work", "reject"]),
    generationAttempts: z.number().optional(),
    thinkingSummary: z.string().optional(),
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
