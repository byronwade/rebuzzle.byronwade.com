/** Shared builders for hand-written demanding reserve boards. */
import { getDifficultyLevelForScore } from "./difficulty-levels";
import type { ReservePuzzle } from "./reserve-puzzles";
import type { PuzzleVisual, VisualLayer } from "./visual/composition";
import type { ReasoningEvidence } from "./visual/reasoning-evidence";
import { INK_PICTOGRAM_STYLE_ID } from "./visual/style";

export type ReasoningOperation = ReasoningEvidence["operations"][number];
export type DemandingReservePuzzle = ReservePuzzle & { reasoningEvidence: ReasoningEvidence };

export const text = (
  content: string,
  emphasis: "normal" | "small" | "large" | "strike" | "stacked" = "normal"
): VisualLayer => ({ kind: "text", content, emphasis });
export const step = (
  kind: ReasoningOperation["kind"],
  observation: string,
  inference: string
): ReasoningOperation => ({ kind, observation, inference, necessary: true });

export function board(
  id: string,
  answer: string,
  layout: "row" | "stack",
  layers: VisualLayer[],
  operations: ReasoningOperation[],
  hints: [string, string, string]
): DemandingReservePuzzle {
  // Keep line breaks for stack boards. This is a fallback representation, not a
  // substitute for the composed board's size and strike cues.
  const unicodeFallback = layers
    .map((layer) =>
      layer.kind === "text" ? layer.content : layer.kind === "operator" ? layer.symbol : ""
    )
    .join(layout === "stack" ? "\n" : " ");
  const visual: PuzzleVisual = {
    styleId: INK_PICTOGRAM_STYLE_ID,
    mode: "composed",
    layout,
    layers,
    unicodeFallback,
  };
  return {
    id: `demanding:${id}`,
    answer,
    rebusPuzzle: unicodeFallback,
    difficulty: 7,
    difficultyLevel: getDifficultyLevelForScore(7).label,
    category: "phrases_and_idioms",
    techniqueId: operations.some((operation) => operation.kind === "size")
      ? "size_or_case_semantics"
      : operations.some(
            (operation) => operation.kind === "containment" || operation.kind === "position"
          )
        ? "spatial_preposition_play"
        : "multi_layer_phonetic",
    visual,
    hints,
    explanation:
      operations.map((operation) => `${operation.observation} ${operation.inference}`).join(" ") +
      ` Together these clues express “${answer}.”`,
    reasoningEvidence: {
      version: "editorial-reasoning-v1",
      operations,
      interacting: true,
      finalInterpretation: answer,
      calibration: "editorial-unplaytested",
    },
  };
}
