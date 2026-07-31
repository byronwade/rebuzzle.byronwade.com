/**
 * AI Suggestions Generation API
 *
 * Auth + puzzleId required. Answer is loaded server-side — never trust
 * a client-supplied correctAnswer.
 */

import { NextResponse } from "next/server";
import {
  type CharacterSuggestion,
  type ContextualHint,
  generateContextualHint,
  generateSuggestions,
  type WordSuggestion,
} from "@/ai/services/text-area-feedback";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { rateLimiters } from "@/lib/middleware/rate-limit";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const limit = await rateLimiters.ai(req);
    if (limit && !limit.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      mode = "suggestions",
      currentInput,
      puzzleId,
      difficulty = 5,
      puzzleType,
      puzzle,
      timeSpent,
    } = body;

    if (!currentInput && currentInput !== "") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: currentInput",
        },
        { status: 400 }
      );
    }

    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: puzzleId",
        },
        { status: 400 }
      );
    }

    const puzzleDoc = await db.puzzleOps.findById(puzzleId);
    if (!puzzleDoc?.answer) {
      return NextResponse.json({ success: false, error: "Puzzle not found" }, { status: 404 });
    }

    const correctAnswer = puzzleDoc.answer;
    const startTime = Date.now();

    let result: {
      characterSuggestions?: CharacterSuggestion[];
      wordSuggestions?: WordSuggestion[];
      contextualHint?: ContextualHint | null;
    };

    switch (mode) {
      case "suggestions":
        result = await generateSuggestions({
          currentInput,
          correctAnswer,
          difficulty,
          puzzleType,
          puzzle,
        });
        break;

      case "contextual": {
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
        description: "Generate AI-powered suggestions for puzzle input (auth + puzzleId)",
        body: {
          mode: "suggestions | contextual | both",
          currentInput: "string",
          puzzleId: "string",
          difficulty: "number 1-10 (optional)",
          puzzleType: "string (optional)",
          puzzle: "string (optional)",
          timeSpent: "number (optional)",
        },
      },
    },
  });
}
