/**
 * One-tap starter boards for Studio — keep the first session frictionless.
 */

import type { PuzzleVisual } from "@/ai/puzzle-agent/visual/composition";

export type StudioTemplate = {
  id: string;
  label: string;
  blurb: string;
  answer: string;
  techniqueId: string;
  difficulty: number;
  explanation: string;
  hints: [string, string, string];
  /** Catalog concepts joined with + in row layout */
  concepts: string[];
  /** Optional text layers inserted after concepts (or alone) */
  textLayers?: Array<{ content: string; emphasis?: "normal" | "large" | "small" }>;
  layout: PuzzleVisual["layout"];
};

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: "sunflower",
    label: "Sunflower",
    blurb: "Two icons become one compound word",
    answer: "sunflower",
    techniqueId: "simple_compound",
    difficulty: 4,
    explanation:
      "The sun pictogram plus the flower pictogram join left-to-right as the compound word sunflower.",
    hints: ["It's a compound word", "Begins with a daytime light source", "A tall yellow garden plant"],
    concepts: ["sun", "flower"],
    layout: "row",
  },
  {
    id: "doorbell",
    label: "Doorbell",
    blurb: "Door plus bell — classic compound",
    answer: "doorbell",
    techniqueId: "simple_compound",
    difficulty: 4,
    explanation:
      "A door pictogram next to a bell pictogram reads as the compound doorbell.",
    hints: ["Compound household word", "You press this when visiting", "Starts with an entrance"],
    concepts: ["door", "bell"],
    layout: "row",
  },
  {
    id: "big-deal",
    label: "Big deal",
    blurb: "Text size carries half the meaning",
    answer: "big deal",
    techniqueId: "size_or_case_semantics",
    difficulty: 5,
    explanation:
      "The word DEAL is shown large, so the size itself supplies big — reading as big deal.",
    hints: ["Look at the text size", "Not a tiny clue", "A common phrase for something important"],
    concepts: [],
    textLayers: [{ content: "DEAL", emphasis: "large" }],
    layout: "row",
  },
];

/** Plain-language rewrite of common grade failures. */
export function humanizeGradeIssue(issue: string): string {
  const lower = issue.toLowerCase();
  if (lower.includes("answer is already")) return "That answer is taken — try a fresher phrase.";
  if (lower.includes("visible in the board") || lower.includes("leaked"))
    return "The answer shows on the board. Hide it in pictures or wordplay instead.";
  if (lower.includes("explanation"))
    return "Add a short explanation of how the board becomes the answer.";
  if (lower.includes("hint"))
    return "Add three progressive hints that don’t spoil the answer early.";
  if (lower.includes("unknown pictogram") || lower.includes("catalog"))
    return "Pick icons from the catalog so the board stays fair for everyone.";
  if (lower.includes("technique")) return "Choose a technique that matches how your board works.";
  if (lower.includes("quality score") || lower.includes("fun score"))
    return "Tighten the board — clearer icons and a cleaner mapping will raise the score.";
  if (lower.includes("too many cues")) return "Simplify — fewer pieces usually read better.";
  return issue;
}
