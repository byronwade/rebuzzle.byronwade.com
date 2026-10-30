import { z } from "zod";

/** Editorial evidence is a review claim, never a human solve-time calibration. */
export const ReasoningEvidenceSchema = z.object({
  version: z.literal("editorial-reasoning-v1"),
  operations: z
    .array(
      z.object({
        kind: z.string().trim().min(1).max(40),
        observation: z.string().trim().min(1).max(400),
        inference: z.string().trim().min(1).max(400),
        necessary: z.boolean(),
      })
    )
    .min(2)
    .max(8),
  interacting: z.boolean(),
  finalInterpretation: z.string().trim().min(1).max(100),
  calibration: z.literal("editorial-unplaytested"),
});
export type ReasoningEvidence = z.infer<typeof ReasoningEvidenceSchema>;
