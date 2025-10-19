"use server"

import { cache } from "react"
import { generateMasterPuzzle } from "@/ai/advanced"
import { QuotaExceededError, AIProviderError } from "@/ai"
import { PuzzlesRepo } from "@/db"

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
  // Sunday = 5 (moderate), Wednesday = 7 (hardest), balanced across week
  const difficulties = [5, 4, 5, 7, 6, 5, 4] // Sun-Sat
  return difficulties[dayOfWeek] || 5
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
]

/**
 * Get or generate today's puzzle
 *
 * SMART TOKEN USAGE:
 * 1. Check database first (puzzle already generated for today)
 * 2. If not found, generate with AI (ONE TIME per day)
 * 3. Store in database for all users
 * 4. All subsequent requests use database (NO TOKENS!)
 */
const getCachedDailyPuzzle = cache(async (dateString: string) => {
  console.log(`📅 [Puzzle] Getting puzzle for ${dateString}...`)

  // STEP 1: Check if puzzle already exists in database for today
  try {
    const existingPuzzle = await PuzzlesRepo.findTodaysPuzzle()

    if (existingPuzzle.success && existingPuzzle.data) {
      console.log(`✅ [Database] Found existing puzzle for today: ${existingPuzzle.data.answer}`)
      console.log(`💰 [Tokens] SAVED - using database puzzle (no AI call needed!)`)

      // Return puzzle from database
      return {
        id: existingPuzzle.data.id,
        rebusPuzzle: existingPuzzle.data.rebusPuzzle,
        difficulty: existingPuzzle.data.difficulty,
        answer: existingPuzzle.data.answer,
        explanation: existingPuzzle.data.explanation,
        hints: (existingPuzzle.data.metadata as any)?.hints || ["No hints available"],
        date: dateString,
        topic: (existingPuzzle.data.metadata as any)?.topic || "General",
        keyword: existingPuzzle.data.answer.replace(/\s+/g, ""),
        category: (existingPuzzle.data.metadata as any)?.category || "general",
        relevanceScore: 8,
        seoMetadata: (existingPuzzle.data.metadata as any)?.seoMetadata || {},
        aiGenerated: true,
        fromDatabase: true, // Mark as from database
      }
    }
  } catch (dbError) {
    console.warn(`⚠️ [Database] Failed to check for existing puzzle:`, dbError)
  }

  // STEP 2: No puzzle in database - generate with Google AI (ONE TIME!)
  console.log(`🤖 [AI] No puzzle in database - generating NEW puzzle using Google Gemini...`)
  console.log(`💰 [Tokens] This will cost tokens - but only happens ONCE per day!`)

  try {
    const difficulty = calculateDailyDifficulty()

    // Generate puzzle using Google AI (Master Orchestrator)
    const result = await generateMasterPuzzle({
      targetDifficulty: difficulty,
      requireNovelty: true,
      qualityThreshold: 85,
      maxAttempts: 2,
    })

    console.log(`✅ [AI] Google Gemini generated puzzle: ${result.puzzle.answer}`)
    console.log(`📊 [AI] Quality: ${result.metadata.qualityMetrics?.scores?.overall}, Uniqueness: ${result.metadata.uniquenessScore}`)

    const puzzleData = {
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
      relevanceScore: Math.round((result.metadata.qualityMetrics?.scores?.overall || 85) / 10),
      seoMetadata: {
        keywords: [result.puzzle.answer, "rebus puzzle", "AI generated", "brain teaser"],
        description: `Solve this AI-generated rebus puzzle: ${result.puzzle.answer}`,
        ogTitle: `Rebuzzle: ${result.puzzle.answer} Puzzle`,
        ogDescription: `Challenge yourself with today's AI-generated rebus puzzle. Can you decode it?`,
      },
      aiGenerated: true,
      generationMethod: "ai-master",
      qualityScore: result.metadata.qualityMetrics?.scores?.overall || 0,
      uniquenessScore: result.metadata.uniquenessScore || 0,
    }

    // STEP 3: Store in database for all future users today
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await PuzzlesRepo.createPuzzle({
        rebusPuzzle: result.puzzle.rebusPuzzle,
        answer: result.puzzle.answer,
        explanation: result.puzzle.explanation,
        difficulty: result.puzzle.difficulty,
        scheduledFor: today,
        metadata: {
          hints: result.puzzle.hints,
          topic: result.puzzle.category,
          keyword: result.puzzle.answer.replace(/\s+/g, ""),
          category: result.puzzle.category,
          seoMetadata: puzzleData.seoMetadata,
          aiGenerated: true,
          qualityScore: result.metadata.qualityMetrics?.scores?.overall,
          uniquenessScore: result.metadata.uniquenessScore,
          generatedAt: new Date().toISOString(),
        },
      })

      console.log(`💾 [Database] Stored puzzle for all users today!`)
      console.log(`💰 [Tokens] All future requests will use database (FREE!)`)
    } catch (saveError) {
      console.error(`⚠️ [Database] Failed to store puzzle:`, saveError)
      console.warn(`⚠️ [Warning] Puzzle won't persist across requests - will regenerate (uses more tokens!)`)
    }

    return puzzleData
  } catch (error) {
    console.error(`❌ [AI] Failed to generate puzzle with Google AI:`, error)

    // STEP 4: AI failed - use emergency fallback
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    const fallbackIndex = dayOfYear % FALLBACK_PUZZLES.length
    const fallback = FALLBACK_PUZZLES[fallbackIndex]!

    console.log(`📦 [Fallback] Using emergency puzzle: ${fallback.answer}`)

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
    }
  }
})

/**
 * Server action to get today's puzzle (PUBLIC API)
 *
 * TOKEN EFFICIENCY:
 * - First user of the day: Generates with AI (costs tokens)
 * - Stores in database
 * - All other users: Read from database (FREE!)
 * - Tomorrow: New puzzle generation
 */
export async function getTodaysPuzzle() {
  try {
    const todayString = getTodayDateString()
    const puzzle = await getCachedDailyPuzzle(todayString)

    return {
      success: true,
      puzzle,
      generatedAt: new Date().toISOString(),
      cached: puzzle.fromDatabase || false,
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
        fallbackReason: "Emergency fallback",
      },
      generatedAt: new Date().toISOString(),
      cached: false,
      fallback: true,
      emergency: true,
    }
  }
}

/**
 * Get puzzle for specific date
 */
export async function getPuzzleForDate(dateString: string) {
  try {
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
 * Generate next puzzle (used by cron job at midnight)
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
