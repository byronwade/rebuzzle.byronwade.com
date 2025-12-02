"use server";

import { cache } from "react";
import { generateMasterPuzzle } from "@/ai/advanced";
import { db } from "@/db";
import type { Puzzle } from "@/db/models";
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
  const dayOfWeek = dateToUse.getDay();
  // Sunday = 5 (moderate), Wednesday = 7 (hardest), balanced across week
  const difficulties = [5, 4, 5, 7, 6, 5, 4]; // Sun-Sat
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
 * 1. Check database first (puzzle already generated for today)
 * 2. If not found, generate with AI (ONE TIME per day)
 * 3. Store in database for all users
 * 4. All subsequent requests use database (NO TOKENS!)
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @param puzzleType - Optional puzzle type (e.g., "rebus", "word-puzzle")
 */
const getCachedDailyPuzzle = cache(async (dateString: string, puzzleType?: string) => {
  logger.info("Getting puzzle for date", { dateString });

  // Helper function to format puzzle from database
  const formatPuzzleFromDb = (puzzle: Puzzle) => {
    let puzzleDisplay = puzzle.puzzle || puzzle.rebusPuzzle || "";

    // Safety check: If puzzle text matches answer, it's likely corrupted data
    if (puzzleDisplay === puzzle.answer || puzzleDisplay.trim() === puzzle.answer.trim()) {
      logger.warn("Puzzle data may be corrupted - text matches answer", {
        puzzleDisplay,
        answer: puzzle.answer,
      });
      // Try to reconstruct from metadata or use fallback
      if ((puzzle.metadata as any)?.clues && Array.isArray((puzzle.metadata as any).clues)) {
        puzzleDisplay = (puzzle.metadata as any).clues.join("\n\n");
      } else {
        puzzleDisplay = "A logic grid puzzle. Use deductive reasoning to solve the relationships.";
      }
    }

    const puzzleType = puzzle.puzzleType || puzzle.metadata?.puzzleType || "rebus";

    return {
      id: puzzle.id,
      puzzle: puzzleDisplay,
      puzzleType,
      rebusPuzzle: puzzleType === "rebus" ? puzzleDisplay : undefined,
      difficulty:
        typeof puzzle.difficulty === "number"
          ? puzzle.difficulty
          : puzzle.difficulty === "easy"
            ? 3
            : puzzle.difficulty === "medium"
              ? 5
              : 7,
      answer: puzzle.answer,
      explanation: puzzle.explanation || "",
      hints: puzzle.metadata?.hints || puzzle.hints || ["No hints available"],
      date: dateString,
      topic: puzzle.metadata?.topic || "General",
      keyword: puzzle.answer.replace(/\s+/g, ""),
      category: puzzle.metadata?.category || puzzle.category || "general",
      relevanceScore: 8,
      seoMetadata: puzzle.metadata?.seoMetadata || {},
      aiGenerated: true,
      fromDatabase: true,
    };
  };

  // STEP 1: Check if puzzle already exists in database for today
  // Try multiple times to handle transient database errors
  let existingPuzzle: Puzzle | null = null;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      existingPuzzle = await db.puzzleOps.findTodaysPuzzle();

      if (existingPuzzle) {
        logger.info("Found existing puzzle in database", {
          answer: existingPuzzle.answer,
          tokensSaved: true,
          attempt,
        });
        return formatPuzzleFromDb(existingPuzzle);
      }

      // No puzzle found, but database query succeeded
      // Break out of retry loop to proceed with generation
      break;
    } catch (dbError) {
      const isLastAttempt = attempt === maxRetries;
      logger.warn(`Database query failed (attempt ${attempt}/${maxRetries})`, {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });

      if (isLastAttempt) {
        // On final failure, refuse to generate to prevent duplicates
        logger.error(
          "All database query attempts failed. Refusing to generate puzzle to prevent duplicates.",
          dbError instanceof Error ? dbError : new Error(String(dbError))
        );
        throw new Error(
          "Cannot verify puzzle existence in database. Refusing to generate new puzzle to prevent duplicates. Please check database connection."
        );
      }

      // Wait a bit before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }

  // Double-check one more time right before generating
  // This prevents race conditions where another request created the puzzle
  try {
    existingPuzzle = await db.puzzleOps.findTodaysPuzzle();
    if (existingPuzzle) {
      logger.info("Found puzzle on final pre-generation check - another request created it", {
        answer: existingPuzzle.answer,
      });
      return formatPuzzleFromDb(existingPuzzle);
    }
  } catch (finalCheckError) {
    logger.error(
      "Final pre-generation check failed",
      finalCheckError instanceof Error ? finalCheckError : new Error(String(finalCheckError))
    );
    // Still proceed with generation since we've already verified no puzzle exists
    // This is a last-ditch check, so failure here is less critical
  }

  // STEP 2: No puzzle in database - generate with Google AI (ONE TIME!)
  logger.info("Generating new puzzle with AI", {
    provider: "google-gemini",
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
      maxAttempts: 3, // Increased from 2 to 3 for better chance of success
      puzzleType: typeToUse, // Use config-driven puzzle type
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

    // Extract puzzle data - handle both rebus and other puzzle types
    const puzzleData: any = {
      id: `ai-${dateString}`,
      puzzle: puzzleDisplay, // Generic puzzle field (works for all types)
      puzzleType: typeToUse, // Store puzzle type
      difficulty: result.puzzle.difficulty,
      answer: result.puzzle.answer,
      explanation: result.puzzle.explanation,
      hints: result.puzzle.hints,
      date: dateString,
      topic: result.puzzle.category,
      keyword: result.puzzle.answer.replace(/\s+/g, ""),
      category: result.puzzle.category,
      relevanceScore: Math.round((result.metadata.qualityMetrics?.scores?.overall || 85) / 10),
      seoMetadata: {
        keywords: [result.puzzle.answer, `${typeToUse} puzzle`, "AI generated", "brain teaser"],
        description: `Solve this AI-generated ${typeToUse} puzzle: ${result.puzzle.answer}`,
        ogTitle: `Rebuzzle: ${result.puzzle.answer} Puzzle`,
        ogDescription: `Challenge yourself with today's AI-generated ${typeToUse} puzzle. Can you solve it?`,
      },
      aiGenerated: true,
      generationMethod: "ai-master",
      qualityScore: result.metadata.qualityMetrics?.scores?.overall || 0,
      uniquenessScore: result.metadata.uniquenessScore || 0,
    };

    // Add legacy rebusPuzzle field for backward compatibility
    if (typeToUse === "rebus" && puzzleDisplay) {
      puzzleData.rebusPuzzle = puzzleDisplay;
    }

    // Add any other puzzle-specific fields
    for (const key of Object.keys(result.puzzle)) {
      if (
        !puzzleData[key] &&
        key !== "difficulty" &&
        key !== "answer" &&
        key !== "explanation" &&
        key !== "hints" &&
        key !== "category" &&
        key !== puzzleDisplayField
      ) {
        puzzleData[key] = (result.puzzle as Record<string, any>)[key];
      }
    }

    // STEP 3: Store in database for all future users today
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const puzzle = {
        id: crypto.randomUUID(),
        puzzle: puzzleData.puzzle, // Generic puzzle field
        puzzleType: typeToUse, // Store puzzle type
        answer: result.puzzle.answer,
        difficulty: (result.puzzle.difficulty <= 3
          ? "easy"
          : result.puzzle.difficulty <= 7
            ? "medium"
            : "hard") as "easy" | "medium" | "hard",
        category: result.puzzle.category || "general",
        explanation: result.puzzle.explanation,
        hints: result.puzzle.hints || [],
        publishedAt: today,
        createdAt: new Date(),
        active: true,
        metadata: {
          topic: result.puzzle.category,
          keyword: result.puzzle.answer.replace(/\s+/g, ""),
          category: result.puzzle.category,
          puzzleType: typeToUse, // Store in metadata too
          seoMetadata: puzzleData.seoMetadata,
          aiGenerated: true,
          qualityScore: result.metadata.qualityMetrics?.scores?.overall,
          uniquenessScore: result.metadata.uniquenessScore,
          generatedAt: new Date().toISOString(),
        },
        // Legacy field for backward compatibility
        rebusPuzzle: typeToUse === "rebus" ? puzzleData.puzzle : undefined,
      };

      await db.puzzleOps.create(puzzle);

      logger.info("Puzzle stored in database", {
        puzzleId: puzzle.id,
        futureRequestsFree: true,
      });

      // Generate embedding asynchronously (non-blocking)
      // This enables semantic search and recommendations
      (async () => {
        try {
          const { generatePuzzleEmbedding, isEmbeddingAvailable } = await import(
            "@/ai/services/embeddings"
          );
          if (isEmbeddingAvailable()) {
            const embedding = await generatePuzzleEmbedding({
              puzzle: puzzle.puzzle,
              answer: puzzle.answer,
              category: puzzle.category,
              puzzleType: typeToUse,
              explanation: puzzle.explanation,
            });

            // Update puzzle with embedding using puzzleOps
            await db.puzzleOps.updateEmbedding(puzzle.id, embedding);
            logger.info("Generated puzzle embedding for semantic search");
          }
        } catch (embeddingError) {
          logger.warn("Failed to generate embedding (non-critical)", {
            error:
              embeddingError instanceof Error ? embeddingError.message : String(embeddingError),
          });
        }
      })();
    } catch (saveError) {
      logger.error(
        "Failed to store puzzle - will regenerate on next request",
        saveError instanceof Error ? saveError : new Error(String(saveError)),
        { willUseMoreTokens: true }
      );
    }

    return puzzleData;
  } catch (error) {
    logger.error(
      "Failed to generate puzzle with AI",
      error instanceof Error ? error : new Error(String(error)),
      {
        code: error && typeof error === "object" && "code" in error ? error.code : undefined,
      }
    );

    // STEP 4: AI failed - use emergency fallback
    // Use the dateString parameter to calculate day of year
    const puzzleDate = new Date(`${dateString}T00:00:00Z`);
    const yearStart = new Date(puzzleDate.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((puzzleDate.getTime() - yearStart.getTime()) / 86_400_000);
    const fallbackIndex = dayOfYear % FALLBACK_PUZZLES.length;
    const fallback = FALLBACK_PUZZLES[fallbackIndex]!;

    logger.warn("Using emergency fallback puzzle", {
      answer: fallback.answer,
      reason: "AI generation failed",
    });

    return {
      id: `fallback-${dateString}`,
      ...fallback,
      date: dateString,
      topic: fallback.category,
      keyword: fallback.answer,
      relevanceScore: 7,
      seoMetadata: {
        keywords: [fallback.answer, "rebus puzzle", "word game", "brain teaser"],
        description: `Solve this rebus puzzle: ${fallback.answer}`,
        ogTitle: `Rebuzzle: ${fallback.answer} Puzzle`,
        ogDescription: `Challenge yourself with today's rebus puzzle.`,
      },
      aiGenerated: false,
      fallbackReason: error instanceof Error ? error.message : "AI generation failed",
    };
  }
});

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
export async function getTodaysPuzzle(puzzleType?: string, dateString?: string) {
  try {
    // Use provided date string or get today's date
    // NOTE: If called from generateMetadata, dateString should be provided
    // after accessing headers/cookies to satisfy Next.js 16 requirements
    const todayString = dateString || getTodayDateString();
    const puzzle = await getCachedDailyPuzzle(todayString, puzzleType);

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

    // Last resort fallback
    const lastResortPuzzle = FALLBACK_PUZZLES[0]!;
    // Use provided date string or get today's date
    const todayString = dateString || getTodayDateString();

    return {
      success: true,
      puzzle: {
        id: `emergency-fallback-${todayString}`,
        ...lastResortPuzzle,
        date: todayString,
        topic: lastResortPuzzle.category,
        keyword: lastResortPuzzle.answer,
        relevanceScore: 5,
        aiGenerated: false,
        fallbackReason: "Emergency fallback",
      },
      generatedAt: new Date().toISOString(),
      cached: false,
      fallback: true,
      emergency: true,
    };
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

    const puzzle = await getCachedDailyPuzzle(dateString);

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
      qualityThreshold: 70, // Lowered for more realistic testing
      maxAttempts: 1,
    });

    return {
      success: true,
      puzzle: result.puzzle,
      metadata: result.metadata,
      message: "Successfully generated puzzle with Google AI",
      provider: "google-gemini",
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
