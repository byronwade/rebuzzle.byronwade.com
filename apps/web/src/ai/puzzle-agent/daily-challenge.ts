import { normalizeAnswerKey } from "./quality";
import { PuzzleVisualSchema } from "./visual/composition";
import { ReasoningEvidenceSchema } from "./visual/reasoning-evidence";

export const DAILY_CHALLENGE_POLICY = "layered-daily-v1";
export const MIN_DAILY_DIFFICULTY = 7;

/** Conservative admission checks, not a prediction of human solve time. */
export function dailyChallengeBlockers(input: {
  difficulty: number;
  answer: string;
  visual?: unknown;
  reasoningEvidence?: unknown;
  reasoningEvidenceSource?: unknown;
}): string[] {
  const blockers: string[] = [];
  const evidence = ReasoningEvidenceSchema.safeParse(input.reasoningEvidence);
  if (
    !evidence.success ||
    !["curated", "independent-editorial"].includes(String(input.reasoningEvidenceSource)) ||
    !evidence.data.interacting ||
    evidence.data.operations.some((operation) => !operation.necessary) ||
    new Set(evidence.data.operations.map((operation) => operation.kind.trim().toLowerCase())).size <
      2 ||
    normalizeAnswerKey(evidence.data.finalInterpretation) !== normalizeAnswerKey(input.answer)
  ) {
    blockers.push(
      "Daily challenge requires reviewed evidence of interacting, necessary inferences"
    );
  }
  if (!Number.isFinite(input.difficulty) || input.difficulty < MIN_DAILY_DIFFICULTY) {
    blockers.push("Daily challenge requires a lateral-thinking difficulty target");
  }
  const parsed = PuzzleVisualSchema.safeParse(input.visual);
  if (!parsed.success) {
    return [...blockers, "Daily challenge requires a validated visual board"];
  }
  const { layers, layout, mode, unicodeFallback } = parsed.data;
  if (mode !== "composed") {
    blockers.push("Daily challenge requires composed clues shared by web and native");
  }
  if (normalizeAnswerKey(unicodeFallback) === normalizeAnswerKey(input.answer)) {
    blockers.push("Daily challenge fallback cannot reveal its answer");
  }
  const cues = layers.filter((layer) => layer.kind !== "operator");
  const literalReading = cues
    .map((layer) =>
      layer.kind === "text" ? layer.content : layer.kind === "pictogram" ? layer.concept : ""
    )
    .join("");
  if (normalizeAnswerKey(literalReading) === normalizeAnswerKey(input.answer)) {
    blockers.push("Daily challenge cannot be the literal names of its visible parts");
  }
  // A high score or an impressive technique name cannot rescue picture + word addition.
  const ordinaryAddition =
    layout === "row" &&
    layers.some((layer) => layer.kind === "operator" && layer.symbol === "+") &&
    layers.every((layer) =>
      layer.kind === "operator"
        ? ["+", "✓", "✔", "✔️"].includes(layer.symbol)
        : layer.kind === "pictogram" || (layer.kind === "text" && layer.emphasis === "normal")
    );
  if (ordinaryAddition) {
    blockers.push("Daily challenge cannot rely only on direct picture or word addition");
  }
  const arithmetic = layers
    .map((layer) =>
      layer.kind === "text" ? layer.content : layer.kind === "operator" ? layer.symbol : "?"
    )
    .join(" ");
  if (
    layout === "row" &&
    /^[\d\s.+×*÷/−=()?-]+$/.test(arithmetic) &&
    /[+×*÷/−-]/.test(arithmetic)
  ) {
    blockers.push("Daily challenge cannot be a plain arithmetic calculation");
  }
  return blockers;
}

export function assertDailyChallenge(input: Parameters<typeof dailyChallengeBlockers>[0]): void {
  const blockers = dailyChallengeBlockers(input);
  if (blockers.length) throw new Error(blockers.join("; "));
}
