import { z } from "zod";
import { getDifficultyLevelForScore } from "../difficulty-levels";
import {
  displayLeaksAnswer,
  hintLeaksAnswerEarly,
  isTechniqueAllowedForTarget,
  normalizeAnswerKey,
  TECHNIQUE_IDS,
} from "../quality";
import { buildUnicodeFallback, type PuzzleVisual } from "../visual/composition";
import { listCuratedPictogramIds, resolveCuratedPictogram } from "../visual/curated-pictograms";
import { INK_PICTOGRAM_STYLE_ID } from "../visual/style";
import { answerSeedCuePlanIssues } from "./answer-seed-cues";
import type { AnswerSeedVisualCue } from "./types";

const position = {
  x: z.number().min(10).max(90).optional(),
  y: z.number().min(10).max(90).optional(),
};
const mapping = {
  layerIndices: z.array(z.number().int().min(0).max(11)).min(1).max(12),
  visibleCue: z.string().min(5).max(300),
  deduction: z.string().min(5).max(400),
};
/** Only renderer-supported primitives; model-authored assets/provenance are forbidden. */
export const MechanismPlanSchema = z
  .object({
    answer: z.string().min(1).max(100),
    techniqueId: z.enum(TECHNIQUE_IDS),
    layout: z.enum(["row", "stack", "grid", "overlay", "free"]),
    layers: z
      .array(
        z.discriminatedUnion("kind", [
          z
            .object({
              kind: z.literal("pictogram"),
              concept: z.string().min(1).max(48),
              emojiFallback: z.string().min(1).max(8),
              ...position,
            })
            .strict(),
          z
            .object({
              kind: z.literal("text"),
              content: z.string().min(1).max(40),
              emphasis: z.enum(["normal", "large", "small", "strike", "stacked", "tiny"]),
              ...position,
            })
            .strict(),
          z
            .object({
              kind: z.literal("operator"),
              symbol: z.enum([
                "+",
                "−",
                "-",
                "=",
                "≠",
                "×",
                "÷",
                "/",
                "→",
                "←",
                "↑",
                "↓",
                "↔",
                "(",
                ")",
              ]),
              ...position,
            })
            .strict(),
        ])
      )
      .min(2)
      .max(12),
    deductions: z
      .array(
        z.object({ ...mapping, dependsOn: z.array(z.number().int().min(0).max(5)).max(5) }).strict()
      )
      .min(2)
      .max(6),
    temptingInterpretation: z.string().min(5).max(300),
    correction: z.object(mapping).strict(),
    explanation: z.string().min(20).max(1200),
    hints: z.array(z.string().min(10).max(240)).length(3),
  })
  .strict();
// OpenAI strict structured output requires every property to be required.
// Null is provider-only; runtime boards retain their established optional x/y contract.
const providerPosition = {
  x: z.number().min(10).max(90).nullable(),
  y: z.number().min(10).max(90).nullable(),
};
const runtimeLayers = MechanismPlanSchema.shape.layers.element.options;
export const MechanismPlanProviderSchema = MechanismPlanSchema.extend({
  layers: z
    .array(
      z.union([
        runtimeLayers[0].extend(providerPosition),
        runtimeLayers[1].extend(providerPosition),
        runtimeLayers[2].extend(providerPosition),
      ])
    )
    .min(2)
    .max(12),
});
export type MechanismPlan = z.infer<typeof MechanismPlanSchema>;
export type MechanismPlanContext = {
  answer: string;
  targetDifficulty: number;
  cues: readonly AnswerSeedVisualCue[];
  preferredTechniques?: string[];
  revisionInstructions?: string[];
  previousVisual?: PuzzleVisual;
  answerResearch?: string;
};

/** Structural approval is deterministic; independent solvers still judge fairness/difficulty. */
export function validateMechanismPlan(
  value: unknown,
  context: MechanismPlanContext
): MechanismPlan {
  const plan = MechanismPlanSchema.parse(value);
  const issues = answerSeedCuePlanIssues(context.cues);
  if (normalizeAnswerKey(plan.answer) !== normalizeAnswerKey(context.answer))
    issues.push("Mechanism answer must preserve the fixed answer");
  if (!isTechniqueAllowedForTarget(plan.techniqueId, context.targetDifficulty))
    issues.push("Technique is not allowed for the target tier");
  const parts = plan.layers.filter((l) => l.kind !== "operator").length;
  const budget = getDifficultyLevelForScore(context.targetDifficulty).componentBudget;
  if (parts < budget.min || parts > budget.max)
    issues.push("Mechanism component budget exceeded or too sparse");
  for (const layer of plan.layers) {
    if (layer.kind === "pictogram" && !resolveCuratedPictogram(layer.concept))
      issues.push(`Unreviewed catalog concept: ${layer.concept}`);
    if (plan.layout === "free" && (layer.x === undefined || layer.y === undefined))
      issues.push("Free layout requires coordinates on every layer");
    if (plan.layout !== "free" && (layer.x !== undefined || layer.y !== undefined))
      issues.push("Coordinates require the free layout");
    if (layer.kind === "text" && !/^[A-Za-z0-9 .,'’!?&:-]+$/.test(layer.content))
      issues.push("Text layers must contain words or letter fragments, not unreviewed pictograms");
    if (layer.kind === "text" && displayLeaksAnswer(layer.content, context.answer))
      issues.push("Answer leaks through text layer");
  }
  if (plan.layout === "free") {
    const textCenters = new Set<string>();
    for (const layer of plan.layers) {
      if (layer.kind !== "text") continue;
      const center = `${layer.x}:${layer.y}`;
      if (textCenters.has(center)) {
        issues.push(
          "Coincident text layers overprint rather than form readable containment; separate their centers"
        );
      }
      textCenters.add(center);
    }
  }
  const visual: PuzzleVisual = {
    styleId: INK_PICTOGRAM_STYLE_ID,
    mode: "composed",
    layout: plan.layout,
    layers: plan.layers,
    unicodeFallback: buildUnicodeFallback(plan.layers),
  };

  if (displayLeaksAnswer(visual.unicodeFallback, context.answer))
    issues.push("Answer leaks through board");
  const covered = new Set<number>();
  for (const [index, step] of plan.deductions.entries()) {
    for (const layerIndex of step.layerIndices) {
      if (layerIndex >= plan.layers.length) issues.push("Deduction references missing layer");
      covered.add(layerIndex);
    }
    if (step.dependsOn.some((dependency) => dependency >= index))
      issues.push("Deduction dependency must refer to an earlier step");
  }
  if (!plan.deductions.some((step) => step.dependsOn.length))
    issues.push("At least two deductions must be linked");
  if (plan.layers.some((_, index) => !covered.has(index)))
    issues.push("Every layer needs a visible cue-to-deduction mapping");
  if (plan.correction.layerIndices.some((index) => index >= plan.layers.length))
    issues.push("Correction references missing layer");
  issues.push(...hintLeaksAnswerEarly(plan.hints, context.answer));
  const hintKeys = plan.hints.map(normalizeAnswerKey);
  if (
    new Set(hintKeys).size !== 3 ||
    plan.hints.some((hint) => displayLeaksAnswer(hint, context.answer))
  )
    issues.push("Mechanism hints repeat or leak the answer");
  if (issues.length) throw new Error(`Invalid mechanism plan: ${issues.join("; ")}`);
  return plan;
}

/** One planning call, with no hidden model fallback or repair loop. */
export async function generateMechanismPlan(context: MechanismPlanContext): Promise<MechanismPlan> {
  const cueIssues = answerSeedCuePlanIssues(context.cues);
  if (cueIssues.length) throw new Error(`Invalid mechanism cues: ${cueIssues.join("; ")}`);
  const [{ generateAIObject }, { AI_CONFIG }] = await Promise.all([
    import("../../client"),
    import("../../config"),
  ]);
  const plan = await generateAIObject({
    schema: MechanismPlanProviderSchema,
    modelId: process.env.REBUZZLE_MECHANISM_MODEL?.trim() || "openai/gpt-5.4",
    operation: "mechanism-plan",
    temperature: AI_CONFIG.generation.temperature.creative,
    system:
      "Design a clever, fair visual rebus for the fixed answer. You design the actual board, not decoration. The fixed answer is mandatory, but seedCueInspiration is only optional brainstorming material: freely omit, replace, reorder, or transform any suggested text, operator, or catalog object. Show relationships such as repetition, above/below, or reversal visibly rather than spelling their instructions as REPEAT, OVER, or BACK. You may choose a completely different set of native clues for the same answer. Every actual pictured object must still come from the reviewed catalog. Use only the typed native primitives and exact reviewed catalog concepts. No invented assets, images, arbitrary SVG, hidden letters, or unsupported transforms. Require at least two interacting deductions: a later visible operation must transform or reinterpret the result of an earlier operation, and removing either operation must change the answer. Joining independently decoded chunks, synonym substitution, or merely renaming icons does not count as interacting deductions. Negative examples: LONG + clock + NO + eye and literal HISTORY + REPEAT are easy label rebuses, not high-tier mechanisms; dividing their reading into multiple steps does not make them harder. In each dependent deduction identify the earlier result that is transformed and the visible operation that transforms it. Map every layer to its visible evidence. Name the tempting wrong reading and a specific visible correction. Three distinct progressive hints: attention, relationship, decisive deduction; never disclose the complete answer. The host validates and locks your plan, then independent blind solvers judge it. A statement about a cue is not a substitute for actually drawing it. RENDERING CONTRACT: The compact board is only 320px wide. Text is drawn as real glyphs with width and height, not as zero-size points or containers. x/y are center percentages: nearby centers can make whole words collide. Two words at the same x/y are painted on top of one another, making an unreadable overprint; this NEVER creates an inside/containment relationship. The text SQUARE draws the letters SQUARE, not a square outline. No implicit boxes, borders, enclosures, rotations, mirrors, arrows, or letter movement are drawn from your explanation. Reversal must be authored as reversed visible letters. Row/grid/stack layouts separate layers automatically; prefer them when they express your mechanism. For free layout leave generous whitespace around each word, especially large or stacked text; place related words on separate rows when side-by-side text will not fit at 320px. Each meaningful glyph must remain independently readable without zooming. Use only visible relationships the renderer actually draws. Free layout alone supports x/y centers; use coordinates 10–90 for every free layer and set both coordinates to null otherwise. Return the schema only.",
    prompt: JSON.stringify({
      fixedAnswer: context.answer,
      target: getDifficultyLevelForScore(context.targetDifficulty),
      seedCueInspiration: context.cues,
      preferredTechniques: context.preferredTechniques,
      reviewedCatalogConcepts: listCuratedPictogramIds(),
      answerResearch: context.answerResearch,
      revisionInstructions: context.revisionInstructions,
      previousBoard: context.previousVisual
        ? {
            layout: context.previousVisual.layout,
            layers: context.previousVisual.layers.map((layer) => {
              const { x, y, kind } = layer;
              if (kind === "text")
                return { kind, x, y, content: layer.content, emphasis: layer.emphasis };
              if (kind === "pictogram") return { kind, x, y, concept: layer.concept };
              if (kind === "operator") return { kind, x, y, symbol: layer.symbol };
              return { kind };
            }),
          }
        : undefined,
    }),
  });
  return validateMechanismPlan(
    {
      ...plan,
      layers: plan.layers.map((layer) => ({
        ...layer,
        x: layer.x ?? undefined,
        y: layer.y ?? undefined,
      })),
    },
    context
  );
}

export async function composeMechanismPlan(plan: MechanismPlan, context: MechanismPlanContext) {
  const approved = validateMechanismPlan(plan, context);
  const { composePuzzleVisual } = await import("../visual/compose-visual");
  const composition = await composePuzzleVisual({
    answer: context.answer,
    targetDifficulty: context.targetDifficulty,
    techniqueId: approved.techniqueId,
    layout: approved.layout,
    layers: approved.layers,
    renderImages: false,
    assetUsage: "publication",
  });
  if (composition.issues.length)
    throw new Error(`Mechanism composition failed: ${composition.issues.join("; ")}`);
  return composition;
}
