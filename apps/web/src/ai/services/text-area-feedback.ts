/**
 * AI-Powered Text Area Feedback Service
 *
 * Generates contextual hints, suggestions, and feedback for the text area
 * based on puzzle difficulty, user input, and progress.
 */

import { z } from "zod";
import { generateAIObject, generateAIText, withRetry } from "../client";
import { AI_CONFIG } from "../config";
import { GLOBAL_CONTEXT } from "../config/global";
import { getDifficultyLevel, getSuggestionConfig, getTextAreaConfig } from "../config/text-area";

/**
 * Character-level suggestion
 */
export interface CharacterSuggestion {
  position: number;
  suggestedChar: string;
  confidence: number;
  reason?: string;
}

/**
 * Word-level suggestion
 */
export interface WordSuggestion {
  word: string;
  confidence: number;
  reason?: string;
}

/**
 * Contextual hint for current input
 */
export interface ContextualHint {
  hint: string;
  type: "encouragement" | "direction" | "correction" | "strategy";
  urgency: "low" | "medium" | "high";
}

const SuggestionsSchema = z.object({
  characterSuggestions: z
    .array(
      z.object({
        position: z.number(),
        suggestedChar: z.string().length(1),
        confidence: z.number().min(0).max(1),
        reason: z.string().optional(),
      })
    )
    .optional(),
  wordSuggestions: z
    .array(
      z.object({
        word: z.string(),
        confidence: z.number().min(0).max(1),
        reason: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * Generate character and word-level suggestions based on current input
 */
export async function generateSuggestions(params: {
  currentInput: string;
  correctAnswer: string;
  difficulty: number;
  puzzleType?: string;
  puzzle?: string;
}): Promise<{
  characterSuggestions: CharacterSuggestion[];
  wordSuggestions: WordSuggestion[];
}> {
  const config = getSuggestionConfig(params.difficulty);

  // Don't generate suggestions if disabled
  if (!(config.wordLevel || config.characterLevel)) {
    return {
      characterSuggestions: [],
      wordSuggestions: [],
    };
  }

  const system = `You are an intelligent assistant helping users solve puzzles.
Your role is to provide subtle, helpful suggestions without giving away the answer.

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

SUGGESTION PRINCIPLES:
1. Only suggest when it's genuinely helpful
2. Match the difficulty level - harder puzzles get less help
3. Provide character-level suggestions only for easier puzzles
4. Word suggestions should guide, not solve
5. Confidence scores should reflect certainty (0.0-1.0)
6. Be encouraging but not too obvious`;

  const difficultyLevel = getDifficultyLevel(params.difficulty);
  const helpLevel =
    difficultyLevel === "hard"
      ? "moderate"
      : difficultyLevel === "impossible"
        ? "minimal"
        : "subtle";

  const prompt = `Generate suggestions for a puzzle input:

Current Input: "${params.currentInput}"
Correct Answer: "${params.correctAnswer}"
Difficulty: ${params.difficulty}/10 (${difficultyLevel})
Help Level: ${helpLevel}
${params.puzzle ? `Puzzle: "${params.puzzle}"` : ""}
${params.puzzleType ? `Puzzle Type: ${params.puzzleType}` : ""}

Generate suggestions that:
${config.characterLevel ? "- Provide character-level suggestions for the next 1-3 characters (only if input is very short and puzzle is easier)" : "- Skip character-level suggestions"}
${config.wordLevel ? "- Provide 1-${config.maxSuggestions} word-level suggestions (autocomplete-style)" : "- Skip word-level suggestions"}

For ${difficultyLevel} puzzles:
- ${difficultyLevel === "hard" ? "Provide helpful suggestions after a few characters" : ""}
- ${difficultyLevel === "difficult" ? "Provide moderate suggestions, let user think" : ""}
- ${difficultyLevel === "evil" ? "Provide minimal suggestions, only when really stuck" : ""}
- ${difficultyLevel === "impossible" ? "Provide almost no suggestions, maximum challenge" : ""}

Only suggest if confidence is above ${config.confidenceThreshold}.
Be subtle and encouraging.`;

  try {
    const result = await withRetry(
      async () =>
        await generateAIObject({
          prompt,
          system,
          schema: SuggestionsSchema,
          temperature: AI_CONFIG.generation.temperature.balanced,
          modelType: "fast", // Use fast model for real-time suggestions
        })
    );

    return {
      characterSuggestions: result.characterSuggestions || [],
      wordSuggestions: result.wordSuggestions || [],
    };
  } catch (error) {
    console.warn("[TextAreaFeedback] Failed to generate suggestions:", error);
    // Return empty suggestions on error
    return {
      characterSuggestions: [],
      wordSuggestions: [],
    };
  }
}

/**
 * Generate a contextual hint based on current input and progress
 */
export async function generateContextualHint(params: {
  currentInput: string;
  correctAnswer: string;
  difficulty: number;
  puzzleType?: string;
  puzzle?: string;
  timeSpent?: number; // in seconds
}): Promise<ContextualHint | null> {
  const config = getTextAreaConfig(params.difficulty);

  // Don't generate hints if disabled
  if (!config.showContextualHints) {
    return null;
  }

  const system = `You are providing contextual hints for puzzle solving.
Your hints should be appropriate for the difficulty level and user progress.

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

HINT PRINCIPLES:
1. Match difficulty - harder puzzles get less help
2. Be encouraging and supportive
3. Guide thinking without solving
4. Adapt to user progress`;

  const difficultyLevel = getDifficultyLevel(params.difficulty);
  const progress = calculateProgress(params.currentInput, params.correctAnswer);

  const prompt = `Generate a contextual hint:

Current Input: "${params.currentInput}"
Correct Answer: "${params.correctAnswer}"
Difficulty: ${params.difficulty}/10 (${difficultyLevel})
Progress: ${Math.round(progress * 100)}%
${params.puzzle ? `Puzzle: "${params.puzzle}"` : ""}
${params.puzzleType ? `Puzzle Type: ${params.puzzleType}` : ""}
${params.timeSpent ? `Time Spent: ${params.timeSpent}s` : ""}

Generate a hint that:
- Is appropriate for ${difficultyLevel} difficulty
- ${progress < 0.3 ? "Encourages the user to keep thinking" : ""}
- ${progress >= 0.3 && progress < 0.7 ? "Provides gentle direction" : ""}
- ${progress >= 0.7 ? "Helps them finish strong" : ""}
- Matches the ${config.messageTone} tone

Return a JSON object with:
- hint: string (the hint text)
- type: "encouragement" | "direction" | "correction" | "strategy"
- urgency: "low" | "medium" | "high"`;

  try {
    const result = await withRetry(async () => {
      const response = await generateAIText({
        prompt,
        system,
        temperature: AI_CONFIG.generation.temperature.balanced,
        maxTokens: AI_CONFIG.generation.maxTokens.short,
        modelType: "fast",
      });

      // Parse JSON from response
      try {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ContextualHint;
        }
      } catch (_e) {
        // Fallback if JSON parsing fails
      }

      // Fallback to simple hint
      return {
        hint: response.text.trim(),
        type: "direction" as const,
        urgency: "medium" as const,
      };
    });

    return result;
  } catch (error) {
    console.warn("[TextAreaFeedback] Failed to generate contextual hint:", error);
    return null;
  }
}

/**
 * Generate feedback message for current input state
 */
export async function generateFeedbackMessage(params: {
  currentInput: string;
  correctAnswer: string;
  difficulty: number;
  isValid: boolean;
  isComplete: boolean;
}): Promise<string> {
  const config = getTextAreaConfig(params.difficulty);

  if (params.isComplete && params.isValid) {
    return "Perfect! Press Enter to submit.";
  }

  if (params.isValid && !params.isComplete) {
    return "Looking good! Keep going...";
  }

  // For harder puzzles, provide less feedback
  if (config.messageTone === "challenging") {
    return "";
  }

  if (config.messageTone === "balanced") {
    return "Not quite. Keep thinking...";
  }

  return "Not quite right. Try again...";
}

/**
 * Calculate progress percentage based on input vs answer
 */
function calculateProgress(input: string, answer: string): number {
  const normalizedInput = input.toLowerCase().trim();
  const normalizedAnswer = answer.toLowerCase().trim();

  if (normalizedInput.length === 0) return 0;
  if (normalizedInput.length >= normalizedAnswer.length) return 1;

  // Calculate character-level similarity
  let matches = 0;
  const minLength = Math.min(normalizedInput.length, normalizedAnswer.length);

  for (let i = 0; i < minLength; i++) {
    if (normalizedInput[i] === normalizedAnswer[i]) {
      matches++;
    }
  }

  return matches / normalizedAnswer.length;
}

/**
 * Simple character suggestion based on pattern matching (fallback)
 */
export function getSimpleCharacterSuggestion(
  currentInput: string,
  correctAnswer: string
): string | null {
  const normalizedInput = currentInput.toLowerCase().trim();
  const normalizedAnswer = correctAnswer.toLowerCase().trim();

  if (normalizedInput.length >= normalizedAnswer.length) {
    return null;
  }

  const nextChar = normalizedAnswer[normalizedInput.length];
  return nextChar || null;
}

/**
 * Simple word suggestion based on fuzzy matching (fallback)
 */
export function getSimpleWordSuggestion(
  currentInput: string,
  correctAnswer: string
): string | null {
  const inputWords = currentInput.toLowerCase().trim().split(/\s+/);
  const answerWords = correctAnswer.toLowerCase().trim().split(/\s+/);

  if (inputWords.length >= answerWords.length) {
    return null;
  }

  const currentWord = inputWords[inputWords.length - 1] || "";
  const expectedWord = answerWords[inputWords.length - 1] || "";

  if (!expectedWord) return null;

  // If current word is empty or very short, suggest start of expected word
  if (currentWord.length === 0 || currentWord.length < expectedWord.length / 2) {
    return expectedWord.slice(0, currentWord.length + 1);
  }

  return null;
}
