/**
 * AI Answer Validation API
 *
 * Deprecated for client gameplay scoring. Daily guesses must go through
 * POST /api/puzzles/guess which owns the answer and the daily lock.
 *
 * This endpoint remains for authenticated tooling only: pass puzzleId + guess,
 * never a client-supplied correctAnswer.
 */

import { NextResponse } from "next/server";
import { generateFeedback, validateAnswer } from "@/ai";
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
      guess,
      puzzleId,
      puzzleContext,
      explanation,
      useAI = true,
      attemptsLeft = 0,
    } = body;

    if (!(guess && puzzleId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: guess and puzzleId",
        },
        { status: 400 }
      );
    }

    const puzzle = await db.puzzleOps.findById(String(puzzleId));
    if (!puzzle?.answer) {
      return NextResponse.json({ success: false, error: "Puzzle not found" }, { status: 404 });
    }

    const correctAnswer = puzzle.answer;
    const startTime = Date.now();

    const result = await validateAnswer({
      guess,
      correctAnswer,
      puzzleContext,
      explanation: explanation || puzzle.explanation,
      useAI,
    });

    const validationTime = Date.now() - startTime;

    let feedback;
    if (!result.isCorrect && attemptsLeft > 0) {
      feedback = await generateFeedback({
        guess,
        correctAnswer,
        similarity: result.confidence,
        attemptsLeft,
      });
    }

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        feedback,
      },
      metadata: {
        validationTimeMs: validationTime,
        note: "For scoring and daily lock, use POST /api/puzzles/guess",
      },
    });
  } catch (error) {
    console.error("[AI API] Validation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate answer",
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
        description:
          "Validate a guess against a puzzleId (auth required). Prefer /api/puzzles/guess for gameplay.",
        body: {
          guess: "string",
          puzzleId: "string",
          useAI: "boolean (default: true)",
          attemptsLeft: "number (optional)",
        },
      },
    },
  });
}
