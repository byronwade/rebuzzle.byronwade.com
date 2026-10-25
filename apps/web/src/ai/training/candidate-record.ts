import { createHash } from "node:crypto";
import { z } from "zod";
import type { ApexCandidate } from "../puzzle-agent/apex/types";

export const BlueprintSchema = z.object({
  answer: z.string().trim().min(1).max(120),
  explanation: z.string().min(1).max(8000),
  category: z.string().min(1).max(120),
  difficulty: z.number().min(1).max(10),
  techniqueId: z.string().min(1).max(100),
  hints: z.array(z.string().max(1000)).min(1).max(8),
  visual: z.object({
    layout: z.enum(["row", "stack", "grid", "overlay", "free"]),
    unicodeFallback: z.string().min(1).max(200),
    caption: z.string().max(80).optional(),
    layers: z
      .array(
        z.object({
          kind: z.enum(["pictogram", "text", "operator", "image"]),
          concept: z.string().max(48).optional(),
          content: z.string().max(40).optional(),
          symbol: z.string().max(4).optional(),
          emphasis: z.string().max(20).optional(),
          x: z.number().min(0).max(100).optional(),
          y: z.number().min(0).max(100).optional(),
        })
      )
      .min(1)
      .max(12),
  }),
});

export const CandidateRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  runId: z.string().min(1),
  capturedAt: z.string().datetime(),
  source: z.literal("rebuzzle-generated"),
  blueprint: BlueprintSchema,
  digest: z.string().length(64),
  familyKey: z.string().min(1),
  selected: z.boolean(),
  evaluation: z.object({
    publishable: z.boolean(),
    rejectReasons: z.array(z.string()),
    quality: z.number().min(0).max(100),
    fun: z.number().min(0).max(100),
    uniqueness: z.number().min(0).max(100),
    blindTopVotes: z.number().int().nonnegative(),
    blindRequiredVotes: z.number().int().nonnegative(),
    strongestWrongConfidence: z.number().min(0).max(1),
  }),
});
export type CandidateRecord = z.infer<typeof CandidateRecordSchema>;

export function blueprintDigest(blueprint: CandidateRecord["blueprint"]): string {
  // Reparse into canonical key order; unknown properties cannot change the digest.
  return createHash("sha256")
    .update(JSON.stringify(BlueprintSchema.parse(blueprint)))
    .digest("hex");
}

/** Store explicit fields only: no SVG, image bytes/URLs, prompts, player ids or free-form metadata. */
export function snapshotCandidate(
  candidate: ApexCandidate,
  runId: string,
  selected: boolean
): CandidateRecord {
  const blueprint = BlueprintSchema.parse({
    answer: candidate.answer,
    explanation: candidate.explanation,
    category: candidate.category,
    difficulty: candidate.difficulty,
    techniqueId: candidate.techniqueId,
    hints: candidate.hints,
    visual: {
      layout: candidate.visual.layout,
      unicodeFallback: candidate.visual.unicodeFallback,
      caption: candidate.visual.caption,
      layers: candidate.visual.layers.map((layer) => ({
        kind: layer.kind,
        ...("concept" in layer ? { concept: layer.concept } : {}),
        ...("content" in layer ? { content: layer.content, emphasis: layer.emphasis } : {}),
        ...("symbol" in layer ? { symbol: layer.symbol } : {}),
        x: layer.x,
        y: layer.y,
      })),
    },
  });
  const digest = blueprintDigest(blueprint);
  return CandidateRecordSchema.parse({
    schemaVersion: 1,
    id: `${runId}:${candidate.id}:${digest.slice(0, 16)}`,
    runId,
    capturedAt: new Date().toISOString(),
    source: "rebuzzle-generated",
    blueprint,
    digest,
    familyKey: candidate.noveltyEvidence?.mechanismFamilyKey ?? candidate.techniqueId,
    selected,
    evaluation: {
      publishable: candidate.publishable,
      rejectReasons: candidate.rejectReasons,
      quality: candidate.qualityOverall,
      fun: candidate.funScore,
      uniqueness: candidate.uniquenessScore,
      blindTopVotes: candidate.playerSim?.blindTopTargetFoundBy ?? 0,
      blindRequiredVotes: candidate.playerSim?.blindRequiredVotes ?? 0,
      strongestWrongConfidence: candidate.playerSim?.blindStrongestWrongConfidence ?? 0,
    },
  });
}
