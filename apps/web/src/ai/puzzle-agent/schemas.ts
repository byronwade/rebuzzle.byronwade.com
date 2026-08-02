import { z } from "zod";
import { TECHNIQUE_IDS } from "./quality";
import { PuzzleVisualSchema } from "./visual/composition";
import { INK_PICTOGRAM_STYLE_ID } from "./visual/style";

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

/**
 * Provider-facing visual contract for strict structured output.
 *
 * OpenAI strict JSON Schema requires every declared object property to appear
 * in `required`. Fields that are optional in Rebuzzle's persisted/runtime
 * shape are therefore required-but-nullable here, then normalized below.
 */
const StrictPictogramLayerSchema = z.object({
  kind: z.literal("pictogram"),
  concept: z.string().min(1).max(48),
  role: z.string().nullable(),
  svg: z.string().nullable(),
  assetId: z.string().max(80).nullable(),
  source: z.enum(["catalog", "generated", "approved-cache"]).nullable(),
  seenAs: z.string().max(80).nullable(),
  recognitionConfidence: z.number().min(0).max(1).nullable(),
  recognitionProfiles: z
    .array(
      z.object({
        tileSize: z.number().int().positive(),
        seenAs: z.string().max(80),
        confidence: z.number().min(0).max(1),
      })
    )
    .max(4)
    .nullable(),
  emojiFallback: z.string().min(1).max(8),
});

const StrictTextLayerSchema = z.object({
  kind: z.literal("text"),
  content: z.string().min(1).max(40),
  emphasis: z.enum(["normal", "large", "small", "strike", "stacked", "tiny"]),
});

const StrictOperatorLayerSchema = z.object({
  kind: z.literal("operator"),
  symbol: z.string().min(1).max(4),
});

const StrictImageLayerSchema = z.object({
  kind: z.literal("image"),
  concept: z.string().trim().min(1).max(48),
  prompt: z.string().min(8).max(400),
  alt: z.string().min(1).max(120),
  src: z.string().nullable(),
});

const StrictPuzzleVisualSchema = z.object({
  styleId: z.literal(INK_PICTOGRAM_STYLE_ID),
  mode: z.enum(["composed", "unicode", "hybrid"]),
  layout: z.enum(["row", "stack", "grid", "overlay"]),
  layers: z
    .array(
      z.discriminatedUnion("kind", [
        StrictPictogramLayerSchema,
        StrictTextLayerSchema,
        StrictOperatorLayerSchema,
        StrictImageLayerSchema,
      ])
    )
    .min(1)
    .max(12),
  unicodeFallback: z.string().min(1).max(200),
  caption: z.string().max(80).nullable(),
});

/**
 * The model owns only the creative draft. All publication evidence and scores
 * are computed by Rebuzzle after generation and are intentionally excluded.
 */
export const PuzzleAgentDraftSchema = z.object({
  puzzle: z.object({
    rebusPuzzle: z.string().describe("Unicode/share fallback — must match visual.unicodeFallback"),
    answer: z.string().min(1),
    difficulty: z.number().min(1).max(10),
    difficultyLevel: DifficultyTierLabelSchema,
    explanation: z.string().min(24),
    category: z.string().min(1),
    hints: z.array(z.string()).min(3).max(6),
    techniqueId: TechniqueIdSchema,
    visual: StrictPuzzleVisualSchema,
  }),
  thinkingSummary: z.string().max(1200).nullable(),
  recommendations: z.array(z.string().max(300)).max(8),
});

export type PuzzleAgentDraft = z.infer<typeof PuzzleAgentDraftSchema>;

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
    boardTextVotes: z.record(z.string(), z.number().int().nonnegative()).optional(),
    boardOperatorVotes: z.record(z.string(), z.number().int().nonnegative()).optional(),
    boardRecognitionProfiles: z
      .array(
        z.object({
          profileId: z.string(),
          viewportWidth: z.number().int().positive(),
          tileSize: z.number().int().positive(),
          confidence: z.number().min(0).max(1),
          models: z.array(z.string()),
          conceptVotes: z.record(z.string(), z.number().int().nonnegative()),
          textVotes: z.record(z.string(), z.number().int().nonnegative()),
          operatorVotes: z.record(z.string(), z.number().int().nonnegative()),
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

/** Convert strict provider nulls into the optional runtime visual shape. */
export function normalizePuzzleAgentDraft(draft: PuzzleAgentDraft): {
  puzzle: PuzzleAgentResult["puzzle"];
  thinkingSummary?: string;
  recommendations: string[];
} {
  const layers = draft.puzzle.visual.layers.map((layer) => {
    if (layer.kind === "pictogram") {
      return {
        kind: layer.kind,
        concept: layer.concept,
        emojiFallback: layer.emojiFallback,
        ...(layer.role === null ? {} : { role: layer.role }),
        ...(layer.svg === null ? {} : { svg: layer.svg }),
        ...(layer.assetId === null ? {} : { assetId: layer.assetId }),
        ...(layer.source === null ? {} : { source: layer.source }),
        ...(layer.seenAs === null ? {} : { seenAs: layer.seenAs }),
        ...(layer.recognitionConfidence === null
          ? {}
          : { recognitionConfidence: layer.recognitionConfidence }),
        ...(layer.recognitionProfiles === null
          ? {}
          : { recognitionProfiles: layer.recognitionProfiles }),
      };
    }

    if (layer.kind === "image") {
      return {
        kind: layer.kind,
        concept: layer.concept,
        prompt: layer.prompt,
        alt: layer.alt,
        ...(layer.src === null ? {} : { src: layer.src }),
      };
    }

    return layer;
  });

  const visual = PuzzleVisualSchema.parse({
    styleId: draft.puzzle.visual.styleId,
    mode: draft.puzzle.visual.mode,
    layout: draft.puzzle.visual.layout,
    layers,
    unicodeFallback: draft.puzzle.visual.unicodeFallback,
    ...(draft.puzzle.visual.caption === null ? {} : { caption: draft.puzzle.visual.caption }),
  });

  return {
    puzzle: {
      ...draft.puzzle,
      visual,
    },
    ...(draft.thinkingSummary === null ? {} : { thinkingSummary: draft.thinkingSummary }),
    recommendations: draft.recommendations,
  };
}

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
