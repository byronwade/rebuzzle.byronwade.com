/**
 * Puzzles Repository
 *
 * Handles all database operations for puzzles
 * with optimized queries and proper caching hints
 */

import { eq, gte, lte, and, desc } from "drizzle-orm"
import { db } from "../client"
import { puzzles, type NewPuzzle, type Puzzle } from "../schema"
import { NotFoundError, wrapDbOperation, type DbResult } from "../errors"

/**
 * Create a new puzzle
 */
export async function createPuzzle(
  data: Omit<NewPuzzle, "id" | "createdAt">
): Promise<DbResult<Puzzle>> {
  return wrapDbOperation(async () => {
    const [puzzle] = await db
      .insert(puzzles)
      .values(data)
      .returning()

    return puzzle!
  })
}

/**
 * Find puzzle by ID
 */
export async function findPuzzleById(
  id: string
): Promise<DbResult<Puzzle>> {
  return wrapDbOperation(async () => {
    const [puzzle] = await db
      .select()
      .from(puzzles)
      .where(eq(puzzles.id, id))
      .limit(1)

    if (!puzzle) {
      throw new NotFoundError("Puzzle", id)
    }

    return puzzle
  })
}

/**
 * Find today's puzzle - most frequently used query
 * Optimized with index on scheduledFor
 */
export async function findTodaysPuzzle(): Promise<DbResult<Puzzle | null>> {
  return wrapDbOperation(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [puzzle] = await db
      .select()
      .from(puzzles)
      .where(
        and(
          gte(puzzles.scheduledFor, today),
          lte(puzzles.scheduledFor, tomorrow)
        )
      )
      .limit(1)

    return puzzle || null
  })
}

/**
 * Find puzzle by scheduled date
 */
export async function findPuzzleByDate(
  date: Date
): Promise<DbResult<Puzzle | null>> {
  return wrapDbOperation(async () => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const [puzzle] = await db
      .select()
      .from(puzzles)
      .where(
        and(
          gte(puzzles.scheduledFor, startOfDay),
          lte(puzzles.scheduledFor, endOfDay)
        )
      )
      .limit(1)

    return puzzle || null
  })
}

/**
 * Find upcoming puzzles
 */
export async function findUpcomingPuzzles(
  limit = 7
): Promise<DbResult<Puzzle[]>> {
  return wrapDbOperation(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return await db
      .select()
      .from(puzzles)
      .where(gte(puzzles.scheduledFor, today))
      .orderBy(puzzles.scheduledFor)
      .limit(limit)
  })
}

/**
 * Find puzzles by difficulty
 */
export async function findPuzzlesByDifficulty(
  difficulty: number,
  limit = 10
): Promise<DbResult<Puzzle[]>> {
  return wrapDbOperation(async () => {
    return await db
      .select()
      .from(puzzles)
      .where(eq(puzzles.difficulty, difficulty))
      .orderBy(desc(puzzles.createdAt))
      .limit(limit)
  })
}

/**
 * Update puzzle
 */
export async function updatePuzzle(
  id: string,
  data: Partial<Omit<NewPuzzle, "id" | "createdAt">>
): Promise<DbResult<Puzzle>> {
  return wrapDbOperation(async () => {
    const [updated] = await db
      .update(puzzles)
      .set(data)
      .where(eq(puzzles.id, id))
      .returning()

    if (!updated) {
      throw new NotFoundError("Puzzle", id)
    }

    return updated
  })
}

/**
 * Delete puzzle
 */
export async function deletePuzzle(
  id: string
): Promise<DbResult<{ deleted: boolean }>> {
  return wrapDbOperation(async () => {
    const deleted = await db
      .delete(puzzles)
      .where(eq(puzzles.id, id))
      .returning()

    return { deleted: deleted.length > 0 }
  })
}

/**
 * Get puzzle statistics
 */
export async function getPuzzleStats(): Promise<DbResult<{
  totalPuzzles: number
  averageDifficulty: number
  earliestScheduled: Date | null
  latestScheduled: Date | null
}>> {
  return wrapDbOperation(async () => {
    const allPuzzles = await db.select().from(puzzles)

    if (allPuzzles.length === 0) {
      return {
        totalPuzzles: 0,
        averageDifficulty: 0,
        earliestScheduled: null,
        latestScheduled: null,
      }
    }

    const avgDifficulty =
      allPuzzles.reduce((sum, p) => sum + p.difficulty, 0) / allPuzzles.length

    const sortedByDate = allPuzzles.sort(
      (a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime()
    )

    return {
      totalPuzzles: allPuzzles.length,
      averageDifficulty: Math.round(avgDifficulty * 10) / 10,
      earliestScheduled: sortedByDate[0]?.scheduledFor || null,
      latestScheduled: sortedByDate[sortedByDate.length - 1]?.scheduledFor || null,
    }
  })
}
