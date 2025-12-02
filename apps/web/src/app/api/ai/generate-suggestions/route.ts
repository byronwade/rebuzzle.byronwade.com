/**
 * AI Suggestions Generation API
 *
 * Generates character and word-level suggestions for puzzle input
 * Used by desktop app and can be used by web app as REST alternative to server actions
 */

import { NextResponse } from "next/server";
import {
  type CharacterSuggestion,
  type ContextualHint,
  generateContextualHint,
  generateSuggestions,
  type WordSuggestion,
} from "@/ai/services/text-area-feedback";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mode = "suggestions",
      currentInput,
      correctAnswer,
      difficulty = 5,
      puzzleType,
      puzzle,
      timeSpent,
    } = body;

    // Validate required fields
    if (!currentInput && currentInput !== "") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: currentInput",
        },
        { status: 400 }
      );
    }

    if (!correctAnswer) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: correctAnswer",
        },
        { status: 400 }
      );
    }

    console.log("[AI API] Generating suggestions:", { mode, currentInput, puzzleType });

    const startTime = Date.now();

    let result: {
      characterSuggestions?: CharacterSuggestion[];
      wordSuggestions?: WordSuggestion[];
      contextualHint?: ContextualHint | null;
    };

    switch (mode) {
      case "suggestions":
        // Generate character and word-level suggestions
        result = await generateSuggestions({
          currentInput,
          correctAnswer,
          difficulty,
          puzzleType,
          puzzle,
        });
        break;

      case "contextual": {
        // Generate contextual hint based on progress
        const hint = await generateContextualHint({
          currentInput,
          correctAnswer,
          difficulty,
          puzzleType,
          puzzle,
          timeSpent,
        });
        result = { contextualHint: hint };
        break;
      }

      case "both": {
        // Generate both suggestions and contextual hint
        const [suggestions, contextHint] = await Promise.all([
          generateSuggestions({
            currentInput,
            correctAnswer,
            difficulty,
            puzzleType,
            puzzle,
          }),
          generateContextualHint({
            currentInput,
            correctAnswer,
            difficulty,
            puzzleType,
            puzzle,
            timeSpent,
          }),
        ]);
        result = {
          ...suggestions,
          contextualHint: contextHint,
        };
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown mode: ${mode}. Use 'suggestions', 'contextual', or 'both'`,
          },
          { status: 400 }
        );
    }

    const generationTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      ...result,
      metadata: {
        mode,
        generationTimeMs: generationTime,
      },
    });
  } catch (error) {
    console.error("[AI API] Suggestions generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate suggestions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: {
      POST: {
        description: "Generate AI-powered suggestions for puzzle input",
        modes: {
          suggestions: "Generate character and word-level suggestions (default)",
          contextual: "Generate contextual hint based on progress",
          both: "Generate both suggestions and contextual hint",
        },
        body: {
          mode: "suggestions | contextual | both",
          currentInput: "string (user's current typed text)",
          correctAnswer: "string (the puzzle answer)",
          difficulty: "number 1-10 (optional, default: 5)",
          puzzleType: "string (optional, e.g., 'rebus', 'riddle')",
          puzzle: "string (optional, the puzzle text/description)",
          timeSpent: "number (optional, seconds spent - for contextual mode)",
        },
        response: {
          success: "boolean",
          characterSuggestions: "Array<{ position, suggestedChar, confidence, reason? }>",
          wordSuggestions: "Array<{ word, confidence, reason? }>",
          contextualHint: "{ hint, type, urgency } | null",
          metadata: "{ mode, generationTimeMs }",
        },
      },
    },
    examples: {
      suggestions: {
        mode: "suggestions",
        currentInput: "sun",
        correctAnswer: "sunflower",
        difficulty: 3,
        puzzleType: "rebus",
        puzzle: "sun flower",
      },
      contextual: {
        mode: "contextual",
        currentInput: "sun",
        correctAnswer: "sunflower",
        difficulty: 3,
        timeSpent: 45,
      },
      both: {
        mode: "both",
        currentInput: "sun",
        correctAnswer: "sunflower",
        difficulty: 3,
        puzzleType: "rebus",
        puzzle: "sun flower",
        timeSpent: 45,
      },
    },
  });
}
