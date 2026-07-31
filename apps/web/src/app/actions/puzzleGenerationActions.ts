"use server";

import { revalidateTag } from "next/cache";
import { generateMasterPuzzle } from "@/ai/advanced";
import { db } from "@/db";
import { getCachedDailyPuzzleFromDb } from "@/lib/cache/daily-puzzle";
import { persistDailyPuzzle } from "@/lib/game/persist-daily-puzzle";
import { logger } from "@/lib/logger";

/**
 * Get today's date string in YYYY-MM-DD format
 *
 * NOTE: In Next.js 16, this function should only be called after accessing
 * uncached data (like headers, cookies, or fetch). For metadata generation,
 * pass the date string as a parameter instead.
 */
function getTodayDateString(date?: Date): string {
  const dateToUse = date || new Date();
  return dateToUse.toISOString().split("T")[0] || dateToUse.toDateString();
}

/**
 * Calculate daily difficulty (varies by day of week)
 *
 * NOTE: In Next.js 16, this function should only be called after accessing
 * uncached data. Pass a date parameter when possible.
 */
function calculateDailyDifficulty(date?: Date): number {
  const dateToUse = date || new Date();
  const dayOfWeek = dateToUse.getUTCDay(); // Use UTC day for consistent behavior across all platforms
  // Sunday = 5 (moderate), Wednesday = 7 (hardest), balanced across week
  // Hard 4–5 · Difficult 6 · Evil 7 · Impossible 8 — rotate across the week
  const difficulties = [5, 4, 6, 8, 7, 5, 4]; // Sun–Sat
  return difficulties[dayOfWeek] || 5;
}

/**
 * Hardcoded fallback puzzles (only used if AI fails AND database fails)
 */
const FALLBACK_PUZZLES = [
  {
    rebusPuzzle: "☀️ 🌻",
    answer: "sunflower",
    difficulty: 3,
    explanation: "Sun (☀️) + Flower (🌻) = Sunflower",
    category: "compound_words",
    hints: ["Think about nature", "Combine two elements", "A yellow flower"],
  },
  {
    rebusPuzzle: "🐝 4️⃣",
    answer: "before",
    difficulty: 4,
    explanation: "Bee (🐝) sounds like 'be' + Four (4️⃣) = Before",
    category: "phonetic",
    hints: ["Think about sounds", "Phonetic wordplay", "Relates to time"],
  },
  {
    rebusPuzzle: "🌙 💡",
    answer: "moonlight",
    difficulty: 5,
    explanation: "Moon (🌙) + Light (💡) = Moonlight",
    category: "compound_words",
    hints: ["Think about nighttime", "Two elements combine", "Natural illumination"],
  },
];

/**
 * Get or generate today's puzzle
 *
 * SMART TOKEN USAGE:
 * 1. Check Data Cache / database first (puzzle already generated for today)
 * 2. If not found, generate with AI (ONE TIME per day)
 * 3. Store in database + revalidateTag("daily-puzzle")
 * 4. All subsequent requests hit "use cache" (NO TOKENS!)
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @param puzzleType - Optional puzzle type (e.g., "rebus", "word-puzzle")
 */
async function getOrGenerateDailyPuzzle(
  dateString: string,
  puzzleType?: string,
  options?: { allowAiGenerate?: boolean; failOnAiError?: boolean }
) {
  const allowAiGenerate = options?.allowAiGenerate !== false;
  const failOnAiError = options?.failOnAiError === true;
  logger.info("Getting puzzle for date", { dateString, allowAiGenerate, failOnAiError });

  // STEP 1: Cross-request cached DB read via Cache Components ("use cache")
  try {
    const cached = await getCachedDailyPuzzleFromDb(dateString);
    if (cached) {
      return cached;
    }
  } catch (dbError) {
    logger.error(
      "Cached daily puzzle lookup failed. Refusing to generate to prevent duplicates.",
      dbError instanceof Error ? dbError : new Error(String(dbError))
    );
    throw new Error(
      "Cannot verify puzzle existence in database. Refusing to generate new puzzle to prevent duplicates. Please check database connection."
    );
  }

  // Double-check once more before generating (race with concurrent requests)
  try {
    const raceCheck = await db.puzzleOps.findByDate(dateString);
    if (raceCheck) {
      revalidateTag("daily-puzzle", "max");
      const cached = await getCachedDailyPuzzleFromDb(dateString);
      if (cached) {
        return cached;
      }
    }
  } catch (finalCheckError) {
    logger.error(
      "Final pre-generation check failed",
      finalCheckError instanceof Error ? finalCheckError : new Error(String(finalCheckError))
    );
  }

  // Interactive play path: never block TTFB on Eve — persist a fast fallback.
  // Cron / regenerate / admin regenerate should call with allowAiGenerate: true.
  if (!allowAiGenerate) {
    const [y, m, d] = dateString.split("-").map(Number);
    const dayOfYear = Math.floor(
      (Date.UTC(y!, (m ?? 1) - 1, d ?? 1) - Date.UTC(y!, 0, 0)) / 86_400_000
    );
    const fallback = FALLBACK_PUZZLES[dayOfYear % FALLBACK_PUZZLES.length]!;
    const persisted = await persistDailyPuzzle({
      dateString,
      puzzleDisplay: fallback.rebusPuzzle,
      puzzleType: "rebus",
      answer: fallback.answer,
      difficulty: fallback.difficulty,
      category: fallback.category,
      explanation: fallback.explanation,
      hints: fallback.hints,
      aiGenerated: false,
      rebusPuzzle: fallback.rebusPuzzle,
      metadataExtra: { fallbackReason: "Play-path fast seed (AI deferred to cron)" },
    });
    return {
      id: persisted.id,
      ...fallback,
      puzzle: fallback.rebusPuzzle,
      puzzleType: "rebus" as const,
      date: dateString,
      topic: fallback.category,
      relevanceScore: 7,
      aiGenerated: false,
      fromDatabase: true,
      fallbackReason: "Play-path fast seed",
    };
  }

  // STEP 2: No puzzle in database — Eve tool agent + AI Gateway (ONCE per day)
  logger.info("Generating new puzzle with Eve tool agent via AI Gateway", {
    provider: "ai-gateway",
    agent: "eve-puzzle",
    willCostTokens: true,
    frequency: "once-per-day",
  });

  try {
    // Parse date string to Date object for difficulty calculation
    const puzzleDate = new Date(`${dateString}T00:00:00Z`);
    const difficulty = calculateDailyDifficulty(puzzleDate);

    // Generate puzzle using AI (Master Orchestrator)
    // Use provided puzzleType, or default to rebus puzzle type for backward compatibility
    // Can be configured via environment variable or parameter
    const typeToUse = puzzleType || process.env.DEFAULT_PUZZLE_TYPE || "rebus";

    const result = await generateMasterPuzzle({
      targetDifficulty: difficulty,
      requireNovelty: true,
      qualityThreshold: 70,
      maxAttempts: 4,
      puzzleType: typeToUse,
    });

    logger.info("AI puzzle generation successful", {
      answer: result.puzzle.answer,
      quality: result.metadata.qualityMetrics?.scores?.overall,
      uniqueness: result.metadata.uniquenessScore,
    });

    // Extract puzzle display field - get the field name for this puzzle type
    const puzzleDisplayField = typeToUse === "rebus" ? "rebusPuzzle" : "puzzle";
    const puzzleAny = result.puzzle as any;
    let puzzleDisplay =
      puzzleAny[puzzleDisplayField] || puzzleAny.puzzle || puzzleAny.rebusPuzzle || "";

    // Safety check: Ensure puzzle text is not the same as answer
    // This can happen if AI mistakenly puts answer in puzzle field
    if (
      puzzleDisplay === result.puzzle.answer ||
      puzzleDisplay.trim() === result.puzzle.answer.trim()
    ) {
      logger.warn("Puzzle text matches answer - using fallback", {
        puzzleDisplay,
        answer: result.puzzle.answer,
        puzzleType: typeToUse,
      });
      // For logic-grid puzzles, construct a proper puzzle text from clues if available
      if (
        typeToUse === "logic-grid" &&
        puzzleAny.clues &&
        Array.isArray(puzzleAny.clues) &&
        puzzleAny.clues.length > 0
      ) {
        puzzleDisplay = puzzleAny.clues.join("\n\n");
      } else if (typeToUse === "logic-grid" && puzzleAny.categories && puzzleAny.items) {
        // Construct a basic puzzle description from categories
        const categoryList = Array.isArray(puzzleAny.categories)
          ? puzzleAny.categories.join(", ")
          : "various categories";
        puzzleDisplay = `A logic grid puzzle involving ${categoryList}. Use deductive reasoning to solve the relationships.`;
      } else {
        // Fallback: use a generic description
        puzzleDisplay = "Solve this puzzle using logical deduction.";
      }
    }

    const visual = result.puzzle.visual;
    if (visual?.unicodeFallback) {
      puzzleDisplay = visual.unicodeFallback;
    }

    // Persist first — clients must receive a real DB id for /api/puzzles/guess
    const persisted = await persistDailyPuzzle({
      dateString,
      puzzleDisplay,
      puzzleType: typeToUse,
      answer: result.puzzle.answer,
      difficulty: result.puzzle.difficulty,
      category: result.puzzle.category || "general",
      explanation: result.puzzle.explanation,
      hints: result.puzzle.hints || [],
      aiGenerated: true,
      rebusPuzzle: typeToUse === "rebus" ? puzzleDisplay : undefined,
      visual,
      metadataExtra: {
        qualityScore: result.metadata.qualityMetrics?.scores?.overall,
        uniquenessScore: result.metadata.uniquenessScore,
        funScore: result.metadata.qualityMetrics?.scores?.fun,
        techniqueId: result.puzzle.techniqueId,
        visualStyleId: visual?.styleId,
      },
    });

    // Best-effort embedding (non-blocking)
    void (async () => {
      try {
        const { generatePuzzleEmbedding, isEmbeddingAvailable } = await import(
          "@/ai/services/embeddings"
        );
        if (isEmbeddingAvailable()) {
          const embedding = await generatePuzzleEmbedding({
            puzzle: puzzleDisplay,
            answer: result.puzzle.answer,
            category: result.puzzle.category,
            puzzleType: typeToUse,
            explanation: result.puzzle.explanation,
          });
          await db.puzzleOps.updateEmbedding(persisted.id, embedding);
        }
      } catch (embeddingError) {
        logger.warn("Failed to generate embedding (non-critical)", {
          error: embeddingError instanceof Error ? embeddingError.message : String(embeddingError),
        });
      }
    })();

    return {
      id: persisted.id,
      puzzle: puzzleDisplay,
      rebusPuzzle: typeToUse === "rebus" ? puzzleDisplay : undefined,
      puzzleType: typeToUse,
      difficulty: result.puzzle.difficulty,
      answer: result.puzzle.answer,
      explanation: result.puzzle.explanation,
      hints: result.puzzle.hints,
      visual,
      date: dateString,
      topic: result.puzzle.category,
      category: result.puzzle.category,
      relevanceScore: Math.round((result.metadata.qualityMetrics?.scores?.overall || 85) / 10),
      aiGenerated: true,
      generationMethod: "ai-master",
      qualityScore: result.metadata.qualityMetrics?.scores?.overall || 0,
      uniquenessScore: result.metadata.uniquenessScore || 0,
      fromDatabase: true,
    };
  } catch (error) {
    logger.error(
      "Failed to generate puzzle with AI",
      error instanceof Error ? error : new Error(String(error)),
      {
        code: error && typeof error === "object" && "code" in error ? error.code : undefined,
      }
    );

    // Admin / Dev regenerate: surface the real failure instead of seeding a fallback.
    if (failOnAiError) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    // STEP 4: AI failed — persist a deterministic fallback so guessing still works
    const [y, m, d] = dateString.split("-").map(Number);
    const dayOfYear = Math.floor(
      (Date.UTC(y!, (m ?? 1) - 1, d ?? 1) - Date.UTC(y!, 0, 0)) / 86_400_000
    );
    const fallback = FALLBACK_PUZZLES[dayOfYear % FALLBACK_PUZZLES.length]!;

    logger.warn("Persisting emergency fallback puzzle", {
      dateString,
      reason: "AI generation failed",
    });

    const persisted = await persistDailyPuzzle({
      dateString,
      puzzleDisplay: fallback.rebusPuzzle,
      puzzleType: "rebus",
      answer: fallback.answer,
      difficulty: fallback.difficulty,
      category: fallback.category,
      explanation: fallback.explanation,
      hints: fallback.hints,
      aiGenerated: false,
      rebusPuzzle: fallback.rebusPuzzle,
      metadataExtra: {
        fallbackReason: error instanceof Error ? error.message : "AI generation failed",
      },
    });

    return {
      id: persisted.id,
      ...fallback,
      puzzle: fallback.rebusPuzzle,
      puzzleType: "rebus",
      date: dateString,
      topic: fallback.category,
      relevanceScore: 7,
      aiGenerated: false,
      fromDatabase: true,
      fallbackReason: error instanceof Error ? error.message : "AI generation failed",
    };
  }
}

/**
 * Server action to get today's puzzle (PUBLIC API)
 *
 * TOKEN EFFICIENCY:
 * - First user of the day: Generates with AI (costs tokens)
 * - Stores in database
 * - All other users: Read from database (FREE!)
 * - Tomorrow: New puzzle generation
 *
 * @param puzzleType - Optional puzzle type (e.g., "rebus", "word-puzzle"). Defaults to DEFAULT_PUZZLE_TYPE or "rebus"
 * @param dateString - Optional date string in YYYY-MM-DD format. If not provided, uses today's date.
 */
export async function getTodaysPuzzle(
  puzzleType?: string,
  dateString?: string,
  options?: { allowAiGenerate?: boolean; failOnAiError?: boolean }
) {
  try {
    // Use provided date string or get today's date
    // NOTE: If called from generateMetadata, dateString should be provided
    // after accessing headers/cookies to satisfy Next.js 16 requirements
    const todayString = dateString || getTodayDateString();
    const puzzle = await getOrGenerateDailyPuzzle(todayString, puzzleType, options);

    return {
      success: true,
      puzzle,
      generatedAt: new Date().toISOString(),
      cached: "fromDatabase" in puzzle && puzzle.fromDatabase === true,
      aiGenerated: puzzle.aiGenerated ?? false,
    };
  } catch (error) {
    logger.error(
      "Error in getTodaysPuzzle",
      error instanceof Error ? error : new Error(String(error))
    );

    // Dev/admin regenerate must not paper over AI Gateway auth failures.
    if (options?.failOnAiError) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    // Last resort — still persist so /api/puzzles/guess can resolve the id
    const lastResortPuzzle = FALLBACK_PUZZLES[0]!;
    const todayString = dateString || getTodayDateString();

    try {
      const persisted = await persistDailyPuzzle({
        dateString: todayString,
        puzzleDisplay: lastResortPuzzle.rebusPuzzle,
        puzzleType: "rebus",
        answer: lastResortPuzzle.answer,
        difficulty: lastResortPuzzle.difficulty,
        category: lastResortPuzzle.category,
        explanation: lastResortPuzzle.explanation,
        hints: lastResortPuzzle.hints,
        aiGenerated: false,
        rebusPuzzle: lastResortPuzzle.rebusPuzzle,
        metadataExtra: { fallbackReason: "Emergency fallback" },
      });

      return {
        success: true,
        puzzle: {
          id: persisted.id,
          ...lastResortPuzzle,
          puzzle: lastResortPuzzle.rebusPuzzle,
          puzzleType: "rebus",
          date: todayString,
          topic: lastResortPuzzle.category,
          relevanceScore: 5,
          aiGenerated: false,
          fromDatabase: true,
          fallbackReason: "Emergency fallback",
        },
        generatedAt: new Date().toISOString(),
        cached: false,
        fallback: true,
        emergency: true,
      };
    } catch (persistError) {
      logger.error(
        "Failed to persist emergency fallback",
        persistError instanceof Error ? persistError : new Error(String(persistError))
      );
      return {
        success: false,
        error: "Unable to load today's puzzle",
        generatedAt: new Date().toISOString(),
      };
    }
  }
}

/**
 * Get puzzle for specific date
 */
export async function getPuzzleForDate(dateString: string) {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    const puzzle = await getOrGenerateDailyPuzzle(dateString);

    return {
      success: true,
      puzzle,
      generatedAt: new Date().toISOString(),
      cached: true,
      aiGenerated: puzzle.aiGenerated ?? false,
    };
  } catch (error) {
    logger.error(
      "Error generating puzzle for date",
      error instanceof Error ? error : new Error(String(error)),
      { dateString }
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Generate next puzzle (used by cron job at midnight)
 */
export async function generateNextPuzzle() {
  return getTodaysPuzzle();
}

/**
 * Preview puzzle generation (for testing AI)
 */
export async function previewPuzzleGeneration() {
  try {
    logger.info("Testing AI puzzle generation");

    const result = await generateMasterPuzzle({
      targetDifficulty: 5,
      requireNovelty: true,
      qualityThreshold: 70,
      maxAttempts: 2,
    });

    return {
      success: true,
      puzzle: result.puzzle,
      metadata: result.metadata,
      message: "Successfully generated puzzle via Eve ToolLoopAgent + AI Gateway",
      provider: "ai-gateway",
    };
  } catch (error) {
    logger.error(
      "Error in puzzle preview",
      error instanceof Error ? error : new Error(String(error))
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: "Would use fallback puzzle in production",
    };
  }
}
