/**
 * AI SDK tools for the in-process puzzle ToolLoopAgent.
 */

import { type ToolSet, tool } from "ai";
import { z } from "zod";
import { buildGenerationBrief } from "./apex/curriculum";
import { critiqueCandidate } from "./apex/critique";
import { applyPlayerSimHeuristics, simulatePlayerSolve } from "./apex/player-sim";
import { scoreRubric } from "./apex/rubric";
import type { ApexCandidate } from "./apex/types";
import { isKnownTechniqueId } from "./quality";
import { CandidatePuzzleSchema } from "./schemas";
import {
  assembleVisualComponents,
  calibratePuzzleDifficulty,
  checkAntiCloneTool,
  checkIdiomFairnessTool,
  checkUniqueness,
  composePuzzleVisual,
  craftHintLadder,
  expandWordplayNeighbors,
  generatePictogram,
  getDifficultyBrief,
  getPuzzleTypeSpec,
  listRecentAnswers,
  listTechniqueLibrary,
  lookupBrandLogo,
  lookupPhoneticCuesTool,
  lookupWordSensesTool,
  proposeConceptSeeds,
  researchCulturalPulseTool,
  scoreHintFairnessTool,
  scorePuzzleQuality,
  scoreShareabilityTool,
  stressTestSolvability,
  validateBrandConstraintsTool,
  validatePuzzleCandidate,
} from "./tool-impl";
import { PuzzleVisualSchema, VisualLayerSchema } from "./visual/composition";
import type { TechniqueId } from "./technique-library";

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
      "Generate one Rebuzzle Ink Pictogram v1 SVG (custom emoji) for a concept. Uses SVGL brand logos when the concept is a household brand, else open icon packs, else LLM draw.",
    inputSchema: z.object({
      concept: z.string(),
      role: z.string().optional(),
      emojiFallback: z.string().optional(),
      preferBrand: z.boolean().optional(),
    }),
    execute: async (input) => generatePictogram(input),
  }),

  lookup_brand_logo: tool({
    description:
      "Look up a company/product logo via SVGL (cached catalog). Use for brand_logo_wordplay pictogram layers.",
    inputSchema: z.object({
      concept: z.string(),
    }),
    execute: async (input) => lookupBrandLogo(input),
  }),

  expand_wordplay: tool({
    description:
      "Expand a seed with Datamuse lexical neighbors (homophones, rhymes, means-like, associations) for smarter rebus invention.",
    inputSchema: z.object({
      seed: z.string(),
      limit: z.number().optional(),
    }),
    execute: async (input) => expandWordplayNeighbors(input),
  }),

  research_cultural_pulse: tool({
    description:
      "People-scored cultural research (last30days-inspired): Reddit/HN/Polymarket engagement for fresh invent inspiration. Use phraseSeeds as cousins, not copy-paste headlines.",
    inputSchema: z.object({
      theme: z.string().optional(),
      category: z.string().optional(),
      query: z.string().optional(),
    }),
    execute: async (input) => researchCulturalPulseTool(input),
  }),

  lookup_phonetic_cues: tool({
    description:
      "Local phonetic graph: drawable pictogram cues → spoken syllables for ONE fair sound leap.",
    inputSchema: z.object({
      seed: z.string(),
      limit: z.number().optional(),
    }),
    execute: async (input) => lookupPhoneticCuesTool(input),
  }),

  lookup_word_senses: tool({
    description:
      "Free Dictionary sense check — confirm a pictogram noun has a concrete drawable reading.",
    inputSchema: z.object({
      word: z.string(),
    }),
    execute: async (input) => lookupWordSensesTool(input),
  }),

  score_hint_fairness: tool({
    description:
      "Score whether the hint ladder unlocks fairly (device → structure → fragment → letter).",
    inputSchema: z.object({
      hints: z.array(z.string()),
      answer: z.string(),
      tierLabel: z.string().optional(),
    }),
    execute: async (input) => scoreHintFairnessTool(input),
  }),

  score_shareability: tool({
    description:
      "Score unicodeFallback share text — reject emoji salad and answer leaks.",
    inputSchema: z.object({
      unicodeFallback: z.string(),
      answer: z.string(),
      pictogramCount: z.number().optional(),
      hasStyledText: z.boolean().optional(),
    }),
    execute: async (input) => scoreShareabilityTool(input),
  }),

  check_anti_clone: tool({
    description:
      "Near-duplicate check vs recent puzzles (lexical + optional embeddings).",
    inputSchema: z.object({
      rebusPuzzle: z.string(),
      answer: z.string(),
      explanation: z.string().optional(),
      category: z.string().optional(),
      techniqueId: z.string().optional(),
    }),
    execute: async (input) => checkAntiCloneTool(input),
  }),

  validate_brand_constraints: tool({
    description:
      "Hard gates for brand_logo_wordplay: SVGL mark + non-brand beat required.",
    inputSchema: z.object({
      techniqueId: z.string().optional(),
      answer: z.string(),
      visual: PuzzleVisualSchema.optional(),
    }),
    execute: async (input) => validateBrandConstraintsTool(input),
  }),

  check_idiom_fairness: tool({
    description:
      "Idiom recognition-frequency gate — prefer well-known phrases for daily puzzles.",
    inputSchema: z.object({
      phrase: z.string(),
      minFreq: z.number().optional(),
    }),
    execute: async (input) => checkIdiomFairnessTool(input),
  }),

  compose_puzzle_visual: tool({
    description:
      "Build a generative puzzle board from layers (pictogram / text / operator / optional image). Generates custom SVGs, scores budget + fun. Set rebusPuzzle = unicodeFallback in the final result.",
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
    execute: async (input) => composePuzzleVisual(input),
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
      pictogramSvgs: z.array(z.string()).optional(),
      iconRecognitionNotes: z.array(z.string()).optional(),
    }),
    execute: async (input) => critiqueCandidate(input),
  }),

  simulate_player_solve: tool({
    description:
      "Simulate clever players: wrong parses, hint fairness, estimated solve rate.",
    inputSchema: z.object({
      rebusPuzzle: z.string(),
      answer: z.string(),
      explanation: z.string(),
      hints: z.array(z.string()),
      techniqueId: z.string(),
      tierLabel: z.enum(["Hard", "Difficult", "Evil", "Impossible"]),
      layout: z.string().optional(),
      pictogramConcepts: z.array(z.string()).optional(),
      textLayers: z.array(z.string()).optional(),
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
        layers: [{ kind: "text" as const, content: input.rebusPuzzle || "?", emphasis: "normal" as const }],
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
