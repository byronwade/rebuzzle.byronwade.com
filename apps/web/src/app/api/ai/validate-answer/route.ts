/**
 * AI Answer Validation API
 *
 * Intelligent answer checking with fuzzy matching and AI assistance
 */

import { NextResponse } from "next/server";
import { generateFeedback, validateAnswer } from "@/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      guess,
      correctAnswer,
      puzzleContext,
      explanation,
      useAI = true,
      attemptsLeft = 0,
    } = body;

    if (!(guess && correctAnswer)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: guess and correctAnswer",
        },
        { status: 400 }
      );
    }

    console.log("[AI API] Validating answer:", { guess, correctAnswer, useAI });

    const startTime = Date.now();

    // Validate answer
    const result = await validateAnswer({
      guess,
      correctAnswer,
      puzzleContext,
      explanation,
      useAI,
    });

    const validationTime = Date.now() - startTime;

    // Generate helpful feedback if wrong
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
        description: "Validate player's answer with AI assistance",
        body: {
          guess: "string (player's answer)",
          correctAnswer: "string (the correct answer)",
          puzzleContext: "string (optional, the puzzle for context)",
          explanation: "string (optional, how the puzzle works)",
          useAI: "boolean (default: true, enable AI for close matches)",
          attemptsLeft: "number (optional, for generating feedback)",
        },
      },
    },
    example: {
      guess: "sunfower",
      correctAnswer: "sunflower",
      puzzleContext: "☀️ 🌻",
      useAI: true,
      attemptsLeft: 2,
    },
  });
}
