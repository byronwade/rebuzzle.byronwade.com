/**
 * Multi-agent solve loop — independent solvers with different biases.
 * Publish only if at least one finds the answer with hints and no strong alt-answer consensus.
 */

import { z } from "zod";
import { generateAIObject } from "../../client";
import { normalizeAnswerKey } from "../quality";

const SolverSchema = z.object({
  guessedAnswer: z.string(),
  usedHints: z.number().min(0).max(5),
  confidence: z.number().min(0).max(1),
  path: z.string(),
  temptingAlt: z.string().optional(),
});

export type SolverBias = "literal" | "phonetic" | "positional";

export type MultiSolveResult = {
  ok: boolean;
  solvers: Array<{
    bias: SolverBias;
    guessedAnswer: string;
    matched: boolean;
    usedHints: number;
    temptingAlt?: string;
  }>;
  reasons: string[];
  estimatedSolveRate: number;
};

async function runBiasedSolver(input: {
  bias: SolverBias;
  rebusPuzzle: string;
  hints: string[];
  pictogramConcepts?: string[];
  layout?: string;
}): Promise<z.infer<typeof SolverSchema>> {
  const biasPrompt =
    input.bias === "literal"
      ? "You read icons as literal nouns and concatenate them."
      : input.bias === "phonetic"
        ? "You look for sounds-like / homophone leaps first."
        : "You treat layout/position (over/under/in/between) as the main clue.";

  return generateAIObject({
    modelType: "fast",
    temperature: 0.4,
    schema: SolverSchema,
    system: `You are a rebus solver with a bias: ${biasPrompt}
Guess the answer. You may use the hint ladder. Prefer a single best guess.`,
    prompt: [
      `Board: ${input.rebusPuzzle}`,
      input.layout ? `Layout: ${input.layout}` : null,
      input.pictogramConcepts?.length
        ? `Icons: ${input.pictogramConcepts.join(", ")}`
        : null,
      `Hints: ${input.hints.map((h, i) => `${i + 1}. ${h}`).join(" | ")}`,
      "Return guessedAnswer, how many hints you needed, confidence, short path, and temptingAlt if any.",
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

/**
 * Run three biased solvers against a candidate board.
 */
export async function runMultiAgentSolve(input: {
  rebusPuzzle: string;
  answer: string;
  hints: string[];
  pictogramConcepts?: string[];
  layout?: string;
}): Promise<MultiSolveResult> {
  const answerKey = normalizeAnswerKey(input.answer);
  const biases: SolverBias[] = ["literal", "phonetic", "positional"];
  const reasons: string[] = [];

  let results: Array<z.infer<typeof SolverSchema> & { bias: SolverBias }>;
  try {
    const settled = await Promise.all(
      biases.map(async (bias) => {
        try {
          const r = await runBiasedSolver({ ...input, bias });
          return { ...r, bias };
        } catch {
          return {
            bias,
            guessedAnswer: "",
            usedHints: 5,
            confidence: 0,
            path: "solver_failed",
            temptingAlt: undefined,
          };
        }
      })
    );
    results = settled;
  } catch {
    return {
      ok: false,
      solvers: [],
      reasons: ["Multi-solve failed entirely"],
      estimatedSolveRate: 0.3,
    };
  }

  const solvers = results.map((r) => {
    const matched = normalizeAnswerKey(r.guessedAnswer) === answerKey;
    return {
      bias: r.bias,
      guessedAnswer: r.guessedAnswer,
      matched,
      usedHints: r.usedHints,
      temptingAlt: r.temptingAlt,
    };
  });

  const matches = solvers.filter((s) => s.matched).length;
  const alts = solvers
    .map((s) => s.temptingAlt)
    .filter((a): a is string => Boolean(a && normalizeAnswerKey(a) !== answerKey));

  // Consensus on a wrong alt is dangerous
  const altCounts = new Map<string, number>();
  for (const alt of alts) {
    const k = normalizeAnswerKey(alt);
    altCounts.set(k, (altCounts.get(k) ?? 0) + 1);
  }
  const strongAlt = [...altCounts.entries()].find(([, n]) => n >= 2);

  if (matches === 0) {
    reasons.push("No biased solver found the answer even with hints");
  }
  if (strongAlt) {
    reasons.push(`Solvers converged on alternate "${strongAlt[0]}" — board is ambiguous`);
  }

  const ok = matches >= 1 && !strongAlt;
  const estimatedSolveRate = Math.max(
    0.15,
    Math.min(0.85, matches / biases.length - (strongAlt ? 0.2 : 0))
  );

  return { ok, solvers, reasons, estimatedSolveRate };
}
