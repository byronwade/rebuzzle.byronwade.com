"use server"

import { cookies } from "next/headers"

/**
 * Set puzzle completion status in cookies
 */
export async function setPuzzleCompleted(answer: string, success: boolean, attempts: number) {
  const cookieStore = await cookies()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  if (success) {
    // Set success cookie
    cookieStore.set("puzzle_completed", "true", {
      expires: tomorrow,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })

    // Store completion data
    cookieStore.set("puzzle_success_data", JSON.stringify({
      answer,
      attempts,
      completedAt: new Date().toISOString(),
    }), {
      expires: tomorrow,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })
  } else {
    // Set failure cookie
    cookieStore.set("puzzle_failed", "true", {
      expires: tomorrow,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })

    // Store failure data
    cookieStore.set("puzzle_failure", JSON.stringify({
      answer,
      attempts,
      failedAt: new Date().toISOString(),
    }), {
      expires: tomorrow,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })

    // Set next play time
    cookieStore.set("next_play_time", tomorrow.toISOString(), {
      expires: tomorrow,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })
  }
}

/**
 * Check if puzzle is completed
 */
export async function isPuzzleCompleted() {
  const cookieStore = await cookies()
  const completed = cookieStore.get("puzzle_completed")
  return completed?.value === "true"
}

/**
 * Check if puzzle failed
 */
export async function isPuzzleFailed() {
  const cookieStore = await cookies()
  const failed = cookieStore.get("puzzle_failed")
  return failed?.value === "true"
}

/**
 * Get next play time
 */
export async function getNextPlayTime() {
  const cookieStore = await cookies()
  const nextPlay = cookieStore.get("next_play_time")
  return nextPlay?.value ? new Date(nextPlay.value) : null
}

/**
 * Clear all puzzle cookies (for new day)
 */
export async function clearPuzzleCookies() {
  const cookieStore = await cookies()

  cookieStore.delete("puzzle_completed")
  cookieStore.delete("puzzle_failed")
  cookieStore.delete("puzzle_success_data")
  cookieStore.delete("puzzle_failure")
  cookieStore.delete("next_play_time")
}

/**
 * Get failure data
 */
export async function getFailureData() {
  const cookieStore = await cookies()
  const failureData = cookieStore.get("puzzle_failure")

  if (!failureData?.value) return null

  try {
    return JSON.parse(failureData.value)
  } catch {
    return null
  }
}
