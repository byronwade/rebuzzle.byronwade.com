/**
 * AI SDK tools for the in-process puzzle ToolLoopAgent.
 */

import { type ToolSet, tool } from "ai";
import { z } from "zod";
import { critiqueCandidate } from "./apex/critique";
import {
  inspectAnswerSeedCuePlan,
  preflightComposeAnswerSeedCuePlan,
} from "./apex/cue-plan-preflight";
import { buildGenerationBrief } from "./apex/curriculum";
import { applyPlayerSimHeuristics, simulatePlayerSolve } from "./apex/player-sim";
import { scoreRubric } from "./apex/rubric";
import type { AnswerSeedVisualCue, ApexCandidate } from "./apex/types";
import { isKnownTechniqueId } from "./quality";
import { CandidatePuzzleSchema } from "./schemas";
import type { TechniqueId } from "./technique-library";
import {
  assembleVisualComponents,
  calibratePuzzleDifficulty,
  checkUniqueness,
  composePuzzleVisual,
  craftHintLadder,
  generatePictogram,
  getDifficultyBrief,
  getPuzzleTypeSpec,
  listRecentAnswers,
  listTechniqueLibrary,
  proposeConceptSeeds,
  scorePuzzleQuality,
  stressTestSolvability,
  validatePuzzleCandidate,
} from "./tool-impl";
import { PuzzleVisualSchema, VisualLayerSchema } from "./visual/composition";
import {
  CURATED_PICTOGRAM_CATALOG_VERSION,
  listCuratedPictogramIds,
} from "./visual/curated-pictograms";

const withType = CandidatePuzzleSchema.extend({
  puzzleType: z.string().optional(),
  targetDifficulty: z.number().optional(),
  techniqueId: z.string().optional(),
});

const scoreQualitySchema = CandidatePuzzleSchema.extend({
  puzzleType: z.string().optional(),
  targetDifficulty: z.number().optional(),
  techniqueId: z.string().optional(),
  visual: PuzzleVisualSchema.optional(),
});

export const puzzleAgentTools: ToolSet = {
  get_puzzle_type_spec: tool({
    description: "Load generation rules and the target difficulty tier for a puzzle type.",
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
      "Legacy analyzer for a unicode rebus string. Prefer compose_puzzle_visual for generative boards.",
    inputSchema: z.object({
      answer: z.string(),
      rebusPuzzle: z.string(),
      techniqueId: z.string().optional(),
      targetDifficulty: z.number(),
    }),
    execute: async (input) => assembleVisualComponents(input),
  }),

  generate_pictogram: tool({
    description:
      "Generate one Rebuzzle Ink Pictogram v1 SVG (custom emoji) for a concept. Consistent brand style.",
    inputSchema: z.object({
      concept: z.string(),
      role: z.string().optional(),
      emojiFallback: z.string().optional(),
    }),
    execute: async (input) => generatePictogram(input),
  }),

  list_pictogram_catalog: tool({
    description:
      "List exact, reviewed pictogram concept IDs that are immediately eligible for publication. Use these exact nouns in compose_puzzle_visual.",
    inputSchema: z.object({}),
    execute: async () => ({
      version: CURATED_PICTOGRAM_CATALOG_VERSION,
      concepts: listCuratedPictogramIds(),
      rule: "Publication compositions must use these exact concept IDs or an existing approved-cache asset.",
    }),
  }),

  inspect_answer_seed_cues: tool({
    description:
      "Inspect a host-owned answer-seed cue contract: catalog validity, draft layers, and whether a board is missing required cues. Call before compose when an answer-first seed is reserved.",
    inputSchema: z.object({
      cues: z
        .array(
          z.discriminatedUnion("kind", [
            z.object({
              kind: z.literal("catalog"),
              concept: z.string(),
              role: z.enum([
                "word-part",
                "phonetic-anchor",
                "semantic-anchor",
                "structural-anchor",
              ]),
            }),
            z.object({
              kind: z.literal("text"),
              content: z.string(),
              role: z.enum([
                "word-part",
                "phonetic-anchor",
                "semantic-anchor",
                "structural-anchor",
              ]),
            }),
            z.object({
              kind: z.literal("operator"),
              symbol: z.string(),
              role: z.literal("structural-anchor"),
            }),
          ])
        )
        .optional(),
      visual: PuzzleVisualSchema.optional(),
    }),
    execute: async (input) =>
      inspectAnswerSeedCuePlan({
        cues: input.cues as AnswerSeedVisualCue[] | undefined,
        visual: input.visual,
      }),
  }),

  preflight_compose_cue_plan: tool({
    description:
      "Cheap host preflight: compose a board deterministically from an answer-seed cue plan (no invent). Use to prove catalog cues compose before a creative rewrite.",
    inputSchema: z.object({
      answer: z.string(),
      targetDifficulty: z.number(),
      techniqueId: z.string().optional(),
      layout: z.enum(["row", "stack", "grid", "overlay"]).optional(),
      cues: z.array(
        z.discriminatedUnion("kind", [
          z.object({
            kind: z.literal("catalog"),
            concept: z.string(),
            role: z.enum([
              "word-part",
              "phonetic-anchor",
              "semantic-anchor",
              "structural-anchor",
            ]),
          }),
          z.object({
            kind: z.literal("text"),
            content: z.string(),
            role: z.enum([
              "word-part",
              "phonetic-anchor",
              "semantic-anchor",
              "structural-anchor",
            ]),
          }),
          z.object({
            kind: z.literal("operator"),
            symbol: z.string(),
            role: z.literal("structural-anchor"),
          }),
        ])
      ),
    }),
    execute: async (input) => {
      const result = await preflightComposeAnswerSeedCuePlan({
        ...input,
        cues: input.cues as AnswerSeedVisualCue[],
      });
      if (!result.ok) {
        throw new Error(
          `Cue-plan preflight failed (${result.stage}): ${result.issues.join("; ")}`
        );
      }
      return {
        ...result,
        publicationReady: true,
        visual: result.composition?.visual,
        unicodeFallback: result.composition?.visual.unicodeFallback,
      };
    },
  }),

  compose_puzzle_visual: tool({
    description:
      "Build a publication board from reviewed pictograms, text, operators, and optional image tiles. First call list_pictogram_catalog and use exact catalog concept IDs; unknown pictograms fail closed. Every image layer requires one concrete concept that independent blind judges must recognize from the rendered tile. Set rebusPuzzle = unicodeFallback in the final result.",
    inputSchema: z.object({
      answer: z.string(),
      targetDifficulty: z.number(),
      techniqueId: z.string().optional(),
      layout: z.enum(["row", "stack", "grid", "overlay"]).optional(),
      layers: z.array(VisualLayerSchema).min(1).max(12),
      unicodeFallback: z.string().optional(),
      caption: z.string().optional(),
      renderImages: z.boolean().optional(),
    }),
    execute: async (input) => {
      const composition = await composePuzzleVisual(input);
      if (composition.issues.length) {
        throw new Error(
          `Composition rejected: ${composition.issues.join("; ")}. Use the returned tier budget and exact catalog concepts, then compose once more.`
        );
      }
      return { ...composition, publicationReady: true };
    },
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
    description: "Fairness check: would a clever player solve this with the hint ladder?",
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
      "Score quality + fun. Aim for overall ≥ 74, funScore ≥ 68, known techniqueId, composed visual, publishable.",
    inputSchema: scoreQualitySchema,
    execute: async (input) => scorePuzzleQuality(input),
  }),

  get_generation_brief: tool({
    description:
      "Apex curriculum brief: diversity memory, learning digest, phrase-bank seeds, preferred techniques.",
    inputSchema: z.object({
      targetDifficulty: z.number(),
      puzzleType: z.string().optional(),
      theme: z.string().optional(),
      category: z.string().optional(),
      useLearningFeedback: z.boolean().optional(),
    }),
    execute: async (input) => buildGenerationBrief(input),
  }),

  critique_candidate: tool({
    description:
      "Adversarial editor critique — ship/revise/reject with aha, creativity, and icon recognizability scores.",
    inputSchema: z.object({
      rebusPuzzle: z.string(),
      answer: z.string(),
      explanation: z.string(),
      hints: z.array(z.string()),
      techniqueId: z.string(),
      difficulty: z.number(),
      tierLabel: z.enum(["Hard", "Difficult", "Evil", "Impossible"]),
      unicodeFallback: z.string().optional(),
      pictogramConcepts: z.array(z.string()).optional(),
    }),
    execute: async (input) => critiqueCandidate(input),
  }),

  simulate_player_solve: tool({
    description: "Simulate clever players: wrong parses, hint fairness, estimated solve rate.",
    inputSchema: z.object({
      rebusPuzzle: z.string(),
      answer: z.string(),
      explanation: z.string(),
      hints: z.array(z.string()),
      techniqueId: z.string(),
      tierLabel: z.enum(["Hard", "Difficult", "Evil", "Impossible"]),
    }),
    execute: async (input) => {
      const sim = await simulatePlayerSolve(input);
      return applyPlayerSimHeuristics(sim, {
        answer: input.answer,
        hints: input.hints,
        tierLabel: input.tierLabel,
      });
    },
  }),

  score_rubric: tool({
    description:
      "Multi-dimensional tournament rubric (aha, fairness, novelty, visual craft, shareability).",
    inputSchema: scoreQualitySchema.extend({
      uniquenessScore: z.number().optional(),
      calibratedDifficulty: z.number().optional(),
      isUnique: z.boolean().optional(),
      solvable: z.boolean().optional(),
      inBand: z.boolean().optional(),
      funScore: z.number().optional(),
      qualityOverall: z.number().optional(),
    }),
    execute: async (input) => {
      const techniqueId = (
        isKnownTechniqueId(input.techniqueId) ? input.techniqueId : "simple_compound"
      ) as TechniqueId;
      const visual = input.visual ?? {
        styleId: "ink-pictogram-v1" as const,
        mode: "unicode" as const,
        layout: "row" as const,
        layers: [
          { kind: "text" as const, content: input.rebusPuzzle || "?", emphasis: "normal" as const },
        ],
        unicodeFallback: input.rebusPuzzle,
      };
      const candidate: ApexCandidate = {
        id: "tool-score",
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
        calibratedDifficulty: input.calibratedDifficulty ?? input.difficulty,
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
  }),
};
