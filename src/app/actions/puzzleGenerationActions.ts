"use server"

import { cache } from "react"
import { generateMasterPuzzle } from "@/ai/advanced"
import { QuotaExceededError, AIProviderError } from "@/ai"

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0] || new Date().toDateString()
}

/**
 * Calculate daily difficulty (varies by day of week)
 */
function calculateDailyDifficulty(): number {
  const dayOfWeek = new Date().getDay()
  // Sunday = 1 (easiest), Wednesday = 7 (hardest), then back down
  const difficulties = [5, 4, 5, 7, 6, 5, 4] // Sun-Sat
  return difficulties[dayOfWeek] || 5
}

/**
 * Hardcoded fallback puzzles (only used if AI fails)
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
]

/**
 * Cached puzzle generation function - uses Google AI
 * Only runs once per day with caching
 */
const getCachedDailyPuzzle = cache(async (dateString: string) => {
  console.log(`🤖 [AI] Generating NEW puzzle for ${dateString} using Google Gemini...`)

  try {
    const difficulty = calculateDailyDifficulty()

    // Generate puzzle using Google AI (Master Orchestrator)
    const result = await generateMasterPuzzle({
      targetDifficulty: difficulty,
      requireNovelty: true,
      qualityThreshold: 85,
      maxAttempts: 2, // Limit attempts to avoid quota issues
    })

    console.log(`✅ [AI] Google Gemini generated puzzle: ${result.puzzle.answer}`)
    console.log(`📊 [AI] Quality: ${result.metadata.qualityMetrics.scores.overall}, Uniqueness: ${result.metadata.uniquenessScore}`)

    return {
      id: `ai-${dateString}`,
      rebusPuzzle: result.puzzle.rebusPuzzle,
      difficulty: result.puzzle.difficulty,
      answer: result.puzzle.answer,
      explanation: result.puzzle.explanation,
      hints: result.puzzle.hints,
      date: dateString,
      topic: result.puzzle.category,
      keyword: result.puzzle.answer.replace(/\s+/g, ""),
      category: result.puzzle.category,
      relevanceScore: Math.round(result.metadata.qualityMetrics.scores.overall / 10),
      seoMetadata: {
        keywords: [result.puzzle.answer, "rebus puzzle", "AI generated", "brain teaser"],
        description: `Solve this AI-generated rebus puzzle: ${result.puzzle.answer}`,
        ogTitle: `Rebuzzle: ${result.puzzle.answer} Puzzle`,
        ogDescription: `Challenge yourself with today's AI-generated rebus puzzle. Can you decode it?`,
      },
      // Add AI metadata
      aiGenerated: true,
      generationMethod: result.metadata.generationMethod || "ai-master",
      qualityScore: result.metadata.qualityMetrics.scores.overall,
      uniquenessScore: result.metadata.uniquenessScore,
    }
  } catch (error) {
    console.error(`❌ [AI] Failed to generate puzzle with Google AI:`, error)

    // Check if it's a quota error
    if (error instanceof QuotaExceededError) {
      console.warn(`⚠️ [AI] Quota exceeded. Using fallback puzzle.`)
    } else if (error instanceof AIProviderError) {
      console.warn(`⚠️ [AI] Provider error. Using fallback puzzle.`)
    }

    // Use fallback puzzle (with rotation based on date)
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    const fallbackIndex = dayOfYear % FALLBACK_PUZZLES.length
    const fallback = FALLBACK_PUZZLES[fallbackIndex]!

    console.log(`📦 [Fallback] Using pre-made puzzle: ${fallback.answer}`)

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
      aiGenerated: false, // Mark as fallback
      fallbackReason: error instanceof Error ? error.message : "AI generation failed",
    }
  }
})

/**
 * Server action to get today's puzzle (PUBLIC API)
 *
 * This function ALWAYS tries Google AI first, only falls back if:
 * - Quota exceeded
 * - API error
 * - Network issue
 */
export async function getTodaysPuzzle() {
  try {
    const todayString = getTodayDateString()
    const puzzle = await getCachedDailyPuzzle(todayString)

    return {
      success: true,
      puzzle,
      generatedAt: new Date().toISOString(),
      cached: true,
      aiGenerated: puzzle.aiGenerated ?? false,
    }
  } catch (error) {
    console.error("Error in getTodaysPuzzle:", error)

    // Last resort fallback
    const lastResortPuzzle = FALLBACK_PUZZLES[0]!

    return {
      success: true,
      puzzle: {
        id: `emergency-fallback-${getTodayDateString()}`,
        ...lastResortPuzzle,
        date: getTodayDateString(),
        topic: lastResortPuzzle.category,
        keyword: lastResortPuzzle.answer,
        relevanceScore: 5,
        aiGenerated: false,
        fallbackReason: "Emergency fallback - all generation methods failed",
      },
      generatedAt: new Date().toISOString(),
      cached: false,
      fallback: true,
      emergency: true,
    }
  }
}

/**
 * Server action to get a puzzle for a specific date
 */
export async function getPuzzleForDate(dateString: string) {
  try {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD")
    }

    const puzzle = await getCachedDailyPuzzle(dateString)

    return {
      success: true,
      puzzle,
      generatedAt: new Date().toISOString(),
      cached: true,
      aiGenerated: puzzle.aiGenerated ?? false,
    }
  } catch (error) {
    console.error(`Error generating puzzle for ${dateString}:`, error)

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      generatedAt: new Date().toISOString(),
    }
  }
}

/**
 * Generate next puzzle (used by cron job)
 */
export async function generateNextPuzzle() {
  return getTodaysPuzzle()
}

/**
 * Preview puzzle generation (for testing AI)
 */
export async function previewPuzzleGeneration() {
  try {
    console.log("🧪 [Preview] Testing Google AI puzzle generation...")

    const result = await generateMasterPuzzle({
      targetDifficulty: 5,
      requireNovelty: true,
      qualityThreshold: 85,
      maxAttempts: 1,
    })

    return {
      success: true,
      puzzle: result.puzzle,
      metadata: result.metadata,
      message: "Successfully generated puzzle with Google AI",
      provider: "google-gemini",
    }
  } catch (error) {
    console.error("Error in preview:", error)

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: "Would use fallback puzzle in production",
    }
  }
}
