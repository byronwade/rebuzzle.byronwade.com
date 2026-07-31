import { defineTool } from "eve/tools";
import { z } from "zod";
import { scoreRubric } from "../../src/ai/puzzle-agent/apex/rubric";
import type { ApexCandidate } from "../../src/ai/puzzle-agent/apex/types";
import { isKnownTechniqueId } from "../../src/ai/puzzle-agent/quality";
import { CandidatePuzzleSchema } from "../../src/ai/puzzle-agent/schemas";
import type { TechniqueId } from "../../src/ai/puzzle-agent/technique-library";
import { PuzzleVisualSchema } from "../../src/ai/puzzle-agent/visual/composition";

export default defineTool({
  description:
    "Multi-dimensional tournament rubric (aha, fairness, novelty, visual craft, shareability).",
  inputSchema: CandidatePuzzleSchema.extend({
    techniqueId: z.string().optional(),
    visual: PuzzleVisualSchema.optional(),
    uniquenessScore: z.number().optional(),
    funScore: z.number().optional(),
    qualityOverall: z.number().optional(),
    isUnique: z.boolean().optional(),
    solvable: z.boolean().optional(),
    inBand: z.boolean().optional(),
  }),
  async execute(input) {
    const techniqueId = (
      isKnownTechniqueId(input.techniqueId) ? input.techniqueId : "simple_compound"
    ) as TechniqueId;
    const visual = input.visual ?? {
      styleId: "ink-pictogram-v1" as const,
      mode: "unicode" as const,
      layout: "row" as const,
      layers: [
        {
          kind: "text" as const,
          content: input.rebusPuzzle || "?",
          emphasis: "normal" as const,
        },
      ],
      unicodeFallback: input.rebusPuzzle,
    };
    const candidate: ApexCandidate = {
      id: "eve-score-rubric",
      rebusPuzzle: input.rebusPuzzle,
      answer: input.answer,
      difficulty: input.difficulty,
      difficultyLevel: "Hard",
      explanation: input.explanation,
      category: input.category,
      hints: input.hints,
      techniqueId,
      visual,
      fingerprint: "",
      uniquenessScore: input.uniquenessScore ?? 70,
      calibratedDifficulty: input.difficulty,
      inBand: input.inBand ?? true,
      isUnique: input.isUnique ?? true,
      solvable: input.solvable ?? true,
      qualityOverall: input.qualityOverall ?? 70,
      funScore: input.funScore ?? 70,
      publishable: true,
      rejectReasons: [],
    };
    return scoreRubric(candidate);
  },
});
