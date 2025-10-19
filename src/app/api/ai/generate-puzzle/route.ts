/**
 * AI Puzzle Generation API
 *
 * Generates dynamic puzzles using AI with quota management and error handling
 */

import { NextResponse } from "next/server"
import { generateRebusPuzzle, generatePuzzleBatch, validatePuzzleQuality, QuotaExceededError, RateLimitError, AIProviderError, createErrorResponse } from "@/ai"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      mode = "single",
      difficulty,
      category,
      theme,
      count = 1,
      validate = true,
    } = body

    console.log("[AI API] Generating puzzle:", { mode, difficulty, category, theme, count })

    // Generate puzzle(s)
    const startTime = Date.now()

    let puzzles

    if (mode === "batch") {
      puzzles = await generatePuzzleBatch({
        count,
        difficulty,
        category,
        theme,
      })
    } else {
      const puzzle = await generateRebusPuzzle({
        difficulty,
        category,
        theme,
      })
      puzzles = [puzzle]
    }

    const generationTime = Date.now() - startTime

    // Optionally validate quality
    let validationResults: Awaited<ReturnType<typeof validatePuzzleQuality>>[] = []
    if (validate && puzzles.length <= 5) {
      // Only validate small batches
      validationResults = await Promise.all(
        puzzles.map((puzzle) => validatePuzzleQuality(puzzle))
      )
    }

    return NextResponse.json({
      success: true,
      puzzles,
      metadata: {
        generationTimeMs: generationTime,
        count: puzzles.length,
        validated: validate && puzzles.length <= 5,
        validationResults: validationResults.length > 0 ? validationResults : undefined,
        provider: "google-gemini",
      },
    })
  } catch (error) {
    console.error("[AI API] Puzzle generation error:", error)

    // Handle quota exceeded
    if (error instanceof QuotaExceededError) {
      const errorResponse = createErrorResponse(error)
      return NextResponse.json(
        {
          success: false,
          ...errorResponse,
          fallback: {
            message: "Using cached puzzles while quota resets",
            redirectTo: "/ai-quota-exceeded",
          },
        },
        { status: 429 }
      )
    }

    // Handle rate limit
    if (error instanceof RateLimitError) {
      const errorResponse = createErrorResponse(error)
      return NextResponse.json(
        {
          success: false,
          ...errorResponse,
          retryAfter: error.retryAfter || 60,
        },
        { status: 429 }
      )
    }

    // Handle provider errors
    if (error instanceof AIProviderError) {
      const errorResponse = createErrorResponse(error)
      return NextResponse.json(
        {
          success: false,
          ...errorResponse,
          fallback: {
            message: "AI service temporarily unavailable. Using cached puzzles.",
            redirectTo: "/ai-error",
          },
        },
        { status: error.statusCode || 503 }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate puzzle",
        details: error instanceof Error ? error.message : "Unknown error",
        fallback: {
          message: "An error occurred. Please try again later.",
        },
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      POST: {
        description: "Generate AI-powered rebus puzzles with Google Gemini",
        body: {
          mode: "single | batch",
          difficulty: "1-10",
          category: "compound_words | phonetic | positional | mathematical | visual_wordplay | idioms | phrases",
          theme: "string (e.g., 'nature', 'technology', 'holidays')",
          count: "number (for batch mode)",
          validate: "boolean (default: true)",
        },
      },
    },
    quotaInfo: {
      provider: "Google AI (Gemini)",
      tier: "Free",
      limits: {
        requestsPerMinute: 15,
        requestsPerDay: 1500,
      },
      note: "Quota resets daily at midnight PST",
    },
    examples: {
      single: {
        mode: "single",
        difficulty: 5,
        category: "compound_words",
        theme: "nature",
      },
      batch: {
        mode: "batch",
        count: 10,
        difficulty: 3,
        theme: "technology",
      },
    },
  })
}
