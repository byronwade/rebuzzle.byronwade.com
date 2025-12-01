/**
 * AI Hint Generation API
 *
 * Generates progressive hints for puzzles
 */

import { NextResponse } from "next/server";
import {
  generateAdaptiveHint,
  generateContextualHint,
  generateHints,
} from "@/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mode = "progressive",
      puzzle,
      answer,
      explanation,
      difficulty,
      count = 5,
      // For contextual hints
      previousGuesses,
      hintsUsed,
      // For adaptive hints
      timeSpentSeconds,
      attemptsUsed,
    } = body;

    if (!(puzzle && answer)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: puzzle and answer",
        },
        { status: 400 }
      );
    }

    console.log("[AI API] Generating hints:", { mode, puzzle, answer });

    const startTime = Date.now();

    let hints;

    switch (mode) {
      case "progressive":
        hints = await generateHints({
          puzzle,
          answer,
          explanation: explanation || "",
          difficulty: difficulty || 5,
          count,
        });
        break;

      case "contextual": {
        const contextualHint = await generateContextualHint({
          puzzle,
          answer,
          previousGuesses,
          hintsUsed,
        });
        hints = [{ text: contextualHint, level: hintsUsed + 1 }];
        break;
      }

      case "adaptive": {
        const adaptiveResult = await generateAdaptiveHint({
          puzzle,
          answer,
          difficulty: difficulty || 5,
          timeSpentSeconds: timeSpentSeconds || 0,
          attemptsUsed: attemptsUsed || 0,
        });
        hints = [
          {
            text: adaptiveResult.hint,
            urgency: adaptiveResult.urgency,
          },
        ];
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown mode: ${mode}. Use 'progressive', 'contextual', or 'adaptive'`,
          },
          { status: 400 }
        );
    }

    const generationTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      hints,
      metadata: {
        mode,
        generationTimeMs: generationTime,
        count: Array.isArray(hints) ? hints.length : 1,
      },
    });
  } catch (error) {
    console.error("[AI API] Hint generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate hints",
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
        description: "Generate AI-powered hints for puzzles",
        modes: {
          progressive: "Generate set of progressive hints (default)",
          contextual: "Generate hint based on player progress",
          adaptive: "Generate hint based on time and attempts",
        },
        body: {
          mode: "progressive | contextual | adaptive",
          puzzle: "string (the rebus puzzle)",
          answer: "string (the answer)",
          explanation: "string (optional, how puzzle works)",
          difficulty: "number 1-10 (optional)",
          count: "number (for progressive mode, default: 5)",
          previousGuesses: "string[] (for contextual mode)",
          hintsUsed: "number (for contextual mode)",
          timeSpentSeconds: "number (for adaptive mode)",
          attemptsUsed: "number (for adaptive mode)",
        },
      },
    },
    examples: {
      progressive: {
        mode: "progressive",
        puzzle: "☀️ 🌻",
        answer: "sunflower",
        explanation: "Sun + Flower = Sunflower",
        difficulty: 3,
        count: 5,
      },
      contextual: {
        mode: "contextual",
        puzzle: "☀️ 🌻",
        answer: "sunflower",
        previousGuesses: ["daisy", "rose"],
        hintsUsed: 2,
      },
      adaptive: {
        mode: "adaptive",
        puzzle: "☀️ 🌻",
        answer: "sunflower",
        difficulty: 3,
        timeSpentSeconds: 180,
        attemptsUsed: 4,
      },
    },
  });
}
