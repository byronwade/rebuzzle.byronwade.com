/**
 * AI SDK tools for the in-process puzzle ToolLoopAgent.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { CandidatePuzzleSchema } from "./schemas";
import {
  calibratePuzzleDifficulty,
  checkUniqueness,
  getPuzzleTypeSpec,
  listRecentAnswers,
  scorePuzzleQuality,
  validatePuzzleCandidate,
} from "./tool-impl";

const withType = CandidatePuzzleSchema.extend({
  puzzleType: z.string().optional(),
});

export const puzzleAgentTools: ToolSet = {
  get_puzzle_type_spec: tool({
    description:
      "Load generation rules, categories, and guidance for a puzzle type (rebus, riddle, etc.).",
    inputSchema: z.object({
      puzzleType: z.string().describe("Puzzle type id, e.g. rebus"),
    }),
    execute: async (input) => getPuzzleTypeSpec(input),
  }),

  list_recent_answers: tool({
    description:
      "List recent puzzle answers so the new puzzle stays unique and avoids repeats.",
    inputSchema: z.object({
      lookbackDays: z.number().optional(),
      limit: z.number().optional(),
    }),
    execute: async (input) => listRecentAnswers(input),
  }),

  validate_puzzle: tool({
    description:
      "Validate a candidate against the puzzle-type schema and hard rules before uniqueness/quality.",
    inputSchema: withType,
    execute: async (input) => validatePuzzleCandidate(input),
  }),

  check_uniqueness: tool({
    description:
      "Check semantic uniqueness against existing puzzles. Call after you have a full candidate.",
    inputSchema: withType,
    execute: async (input) => checkUniqueness(input),
  }),

  calibrate_difficulty: tool({
    description:
      "Calibrate the difficulty rating for a candidate using type config or AI calibration.",
    inputSchema: withType,
    execute: async (input) => calibratePuzzleDifficulty(input),
  }),

  score_quality: tool({
    description:
      "Score clarity/solvability/structure of a candidate. Aim for overall >= 70 and no blocking issues.",
    inputSchema: withType,
    execute: async (input) => scorePuzzleQuality(input),
  }),
};
