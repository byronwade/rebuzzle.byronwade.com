/**
 * AI-Powered Puzzle Generation Service
 *
 * Generates creative, unique rebus puzzles using AI
 */

import { z } from "zod";
import { generateAIObject, withRetry } from "../client";
import { AI_CONFIG } from "../config";

// Schema for generated puzzle
const PuzzleSchema = z.object({
  rebusPuzzle: z.string().describe("The visual rebus representation using emojis and text"),
  answer: z.string().describe("The answer to the puzzle (single word or phrase)"),
  difficulty: z.number().min(1).max(10).describe("Difficulty rating from 1-10"),
  explanation: z.string().describe("Clear explanation of how the rebus represents the answer"),
  category: z
    .enum([
      "compound_words",
      "phonetic",
      "positional",
      "mathematical",
      "visual_wordplay",
      "idioms",
      "phrases",
    ])
    .describe("The type of rebus puzzle"),
  hints: z.array(z.string()).min(2).max(5).describe("Progressive hints from subtle to obvious"),
});

export type GeneratedPuzzle = z.infer<typeof PuzzleSchema>;

/**
 * Generate a single rebus puzzle with AI
 */
export async function generateRebusPuzzle(params?: {
  difficulty?: number;
  category?: string;
  theme?: string;
  avoidWords?: string[];
}): Promise<GeneratedPuzzle> {
  const system = `You are an expert rebus puzzle creator. A rebus puzzle uses pictures, symbols, emojis, and letter positioning to represent words or phrases.

RULES:
1. Use emojis creatively to represent words or sounds
2. Use letter positioning (up/down, inside/outside, etc.) for wordplay
3. Combine phonetic sounds with visual elements
4. Make puzzles clever but solvable
5. Provide clear explanations
6. Ensure difficulty matches the requested level (1=easy, 10=hard)

GOOD EXAMPLES:
- "☀️ 🌻" = "sunflower" (sun + flower)
- "🐝 4️⃣" = "before" (bee + four)
- "TOWN ⬇️" = "downtown" (town going down)
- "👁️ 🔍" = "see through" (see + through)

AVOID:
- Obscure references
- Too many elements (keep it 2-4 elements max)
- Unclear visual representations
- Offensive content`;

  const difficultyLevel = params?.difficulty ?? 5;
  const category = params?.category ?? "any";
  const theme = params?.theme ?? "general";
  const avoid = params?.avoidWords?.join(", ") || "none";

  const prompt = `Generate a creative rebus puzzle with these requirements:
- Difficulty: ${difficultyLevel}/10
- Category: ${category}
- Theme: ${theme}
- Avoid these words: ${avoid}

Create a unique, engaging rebus that would be fun to solve. Make it visually appealing with appropriate emojis.`;

  return await withRetry(
    async () =>
      await generateAIObject({
        prompt,
        system,
        schema: PuzzleSchema,
        temperature: AI_CONFIG.generation.temperature.creative,
        modelType: "creative",
      })
  );
}

/**
 * Generate multiple puzzle variations
 */
export async function generatePuzzleBatch(params: {
  count: number;
  difficulty?: number;
  category?: string;
  theme?: string;
}): Promise<GeneratedPuzzle[]> {
  const system = `You are an expert rebus puzzle creator. Generate a diverse set of creative rebus puzzles.

Each puzzle should be unique and follow rebus principles:
- Use emojis, symbols, and text positioning
- Make them solvable but clever
- Provide clear explanations
- Include progressive hints

Ensure variety in the puzzles - don't repeat similar patterns.`;

  const BatchSchema = z.object({
    puzzles: z.array(PuzzleSchema).min(params.count).max(params.count),
  });

  const prompt = `Generate ${params.count} unique rebus puzzles:
- Difficulty range: ${params.difficulty ?? 5}/10
- Category: ${params.category ?? "mixed"}
- Theme: ${params.theme ?? "general"}

Make each puzzle different in style and approach.`;

  const result = await withRetry(
    async () =>
      await generateAIObject({
        prompt,
        system,
        schema: BatchSchema,
        temperature: AI_CONFIG.generation.temperature.creative,
        modelType: "creative",
      })
  );

  return result.puzzles;
}

/**
 * Generate puzzle for specific word/phrase
 */
export async function generatePuzzleForAnswer(params: {
  answer: string;
  difficulty?: number;
  style?: "emoji" | "text" | "mixed";
}): Promise<GeneratedPuzzle> {
  const system = `You are an expert at creating rebus puzzles for specific words or phrases.

Create a visual rebus representation that cleverly leads to the target answer.
Use emojis, symbols, text positioning, and wordplay.`;

  const prompt = `Create a rebus puzzle for the answer: "${params.answer}"

Requirements:
- Difficulty: ${params.difficulty ?? 5}/10
- Style: ${params.style ?? "mixed"}
- Make it creative and fun
- Include clear explanation
- Provide progressive hints

The puzzle should visually represent "${params.answer}" in a clever way.`;

  return await withRetry(
    async () =>
      await generateAIObject({
        prompt,
        system,
        schema: PuzzleSchema,
        temperature: AI_CONFIG.generation.temperature.creative,
        modelType: "smart",
      })
  );
}

/**
 * Improve an existing puzzle
 */
export async function improvePuzzle(params: {
  currentPuzzle: string;
  currentAnswer: string;
  currentExplanation?: string;
  targetDifficulty?: number;
}): Promise<GeneratedPuzzle> {
  const system = `You are an expert at improving rebus puzzles.
Make them more creative, clearer, or adjust difficulty while maintaining the same answer.`;

  const prompt = `Improve this rebus puzzle:
Current: "${params.currentPuzzle}"
Answer: "${params.currentAnswer}"
${params.currentExplanation ? `Explanation: "${params.currentExplanation}"` : ""}

Target difficulty: ${params.targetDifficulty ?? 5}/10

Create an improved version that is more creative, clear, or appropriately difficult.
Keep the same answer but enhance the visual representation.`;

  return await withRetry(
    async () =>
      await generateAIObject({
        prompt,
        system,
        schema: PuzzleSchema,
        temperature: AI_CONFIG.generation.temperature.creative,
        modelType: "smart",
      })
  );
}

/**
 * Generate themed puzzle set (for events, holidays, etc.)
 */
export async function generateThemedSet(params: {
  theme: string;
  count: number;
  difficulty?: number;
}): Promise<GeneratedPuzzle[]> {
  const system = `You are creating a themed set of rebus puzzles.
All puzzles should relate to the theme while being diverse in style.`;

  const BatchSchema = z.object({
    puzzles: z.array(PuzzleSchema).min(params.count).max(params.count),
  });

  const prompt = `Create ${params.count} rebus puzzles themed around: "${params.theme}"

Requirements:
- All puzzles relate to the theme
- Variety in difficulty and style
- Appropriate for general audience
- Creative and fun
- Difficulty around ${params.difficulty ?? 5}/10

Examples for theme inspiration:
- Holidays: seasonal words and celebrations
- Nature: animals, plants, weather
- Technology: modern gadgets and concepts
- Food: dishes, ingredients, cooking`;

  const result = await withRetry(
    async () =>
      await generateAIObject({
        prompt,
        system,
        schema: BatchSchema,
        temperature: AI_CONFIG.generation.temperature.creative,
        modelType: "creative",
      })
  );

  return result.puzzles;
}

/**
 * Validate puzzle quality
 */
export async function validatePuzzleQuality(puzzle: GeneratedPuzzle): Promise<{
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}> {
  const ValidationSchema = z.object({
    isValid: z.boolean(),
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
    suggestions: z.array(z.string()),
  });

  const prompt = `Evaluate this rebus puzzle for quality:

Puzzle: "${puzzle.rebusPuzzle}"
Answer: "${puzzle.answer}"
Explanation: "${puzzle.explanation}"
Difficulty: ${puzzle.difficulty}/10

Assess:
1. Is the visual representation clear and logical?
2. Does it make sense when explained?
3. Is the difficulty appropriate?
4. Are there any ambiguities?
5. Is it family-friendly?

Provide:
- Overall validity
- Quality score (0-100)
- List of issues if any
- Suggestions for improvement`;

  return await withRetry(
    async () =>
      await generateAIObject({
        prompt,
        system:
          "You are a puzzle quality expert. Evaluate puzzles objectively and provide constructive feedback.",
        schema: ValidationSchema,
        temperature: AI_CONFIG.generation.temperature.factual,
        modelType: "smart",
      })
  );
}
