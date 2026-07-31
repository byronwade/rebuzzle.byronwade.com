/**
 * AI SDK tools for the in-process puzzle ToolLoopAgent.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { CandidatePuzzleSchema } from "./schemas";
import {
  assembleVisualComponents,
  calibratePuzzleDifficulty,
  checkUniqueness,
  craftHintLadder,
  getDifficultyBrief,
  getPuzzleTypeSpec,
  listRecentAnswers,
  listTechniqueLibrary,
  proposeConceptSeeds,
  scorePuzzleQuality,
  stressTestSolvability,
  validatePuzzleCandidate,
} from "./tool-impl";

const withType = CandidatePuzzleSchema.extend({
  puzzleType: z.string().optional(),
  targetDifficulty: z.number().optional(),
  techniqueId: z.string().optional(),
});

export const puzzleAgentTools: ToolSet = {
  get_puzzle_type_spec: tool({
    description:
      "Load generation rules and the target difficulty tier for a puzzle type.",
    inputSchema: z.object({
      puzzleType: z.string(),
      targetDifficulty: z.number().optional(),
    }),
    execute: async (input) => getPuzzleTypeSpec(input),
  }),

  get_difficulty_brief: tool({
    description:
      "Get the canonical difficulty tier brief: band, component budget, techniques, and what to avoid.",
    inputSchema: z.object({
      targetDifficulty: z.number().optional(),
      tier: z.enum(["hard", "difficult", "evil", "impossible"]).optional(),
    }),
    execute: async (input) => getDifficultyBrief(input),
  }),

  list_technique_library: tool({
    description:
      "Look up rebus/visual techniques (how to assemble components for fun, fair puzzles).",
    inputSchema: z.object({
      techniqueIds: z.array(z.string()).optional(),
    }),
    execute: async (input) => listTechniqueLibrary(input),
  }),

  list_recent_answers: tool({
    description: "List recent puzzle answers/tiers to avoid repeats.",
    inputSchema: z.object({
      lookbackDays: z.number().optional(),
      limit: z.number().optional(),
    }),
    execute: async (input) => listRecentAnswers(input),
  }),

  propose_concept_seeds: tool({
    description:
      "Brainstorm concept seeds matched to the difficulty tier (starting points, not final answers).",
    inputSchema: z.object({
      targetDifficulty: z.number(),
      theme: z.string().optional(),
      category: z.string().optional(),
      avoidAnswers: z.array(z.string()).optional(),
    }),
    execute: async (input) => proposeConceptSeeds(input),
  }),

  assemble_visual_components: tool({
    description:
      "Analyze a candidate visual: component count vs tier budget, technique tips, fun score.",
    inputSchema: z.object({
      answer: z.string(),
      rebusPuzzle: z.string(),
      techniqueId: z.string().optional(),
      targetDifficulty: z.number(),
    }),
    execute: async (input) => assembleVisualComponents(input),
  }),

  craft_hint_ladder: tool({
    description:
      "Build a progressive hint ladder styled for the difficulty tier (vague → specific).",
    inputSchema: z.object({
      answer: z.string(),
      explanation: z.string(),
      rebusPuzzle: z.string(),
      targetDifficulty: z.number(),
      existingHints: z.array(z.string()).optional(),
    }),
    execute: async (input) => craftHintLadder(input),
  }),

  stress_test_solvability: tool({
    description:
      "Fairness check: would a clever player solve this with the hint ladder?",
    inputSchema: withType,
    execute: async (input) => stressTestSolvability(input),
  }),

  validate_puzzle: tool({
    description: "Validate candidate against type rules and difficulty band.",
    inputSchema: withType,
    execute: async (input) => validatePuzzleCandidate(input),
  }),

  check_uniqueness: tool({
    description: "Semantic uniqueness vs existing puzzles.",
    inputSchema: withType,
    execute: async (input) => checkUniqueness(input),
  }),

  calibrate_difficulty: tool({
    description:
      "Calibrate difficulty and snap into the target tier band (Hard/Difficult/Evil/Impossible).",
    inputSchema: withType,
    execute: async (input) => calibratePuzzleDifficulty(input),
  }),

  score_quality: tool({
    description:
      "Score quality + fun. Aim for overall ≥ 70, publishable, correct tier fit.",
    inputSchema: withType,
    execute: async (input) => scorePuzzleQuality(input),
  }),
};
