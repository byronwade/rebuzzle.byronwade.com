'use server'

import { UserStats, calculatePoints, checkAchievements, getLevel, updateDailyChallenge } from '@/lib/gamification'

export async function fetchUserStats(userId: string): Promise<UserStats> {
  // In a real application, this would fetch from a database
  // For now, we'll return some fake data
  return {
    points: 1000,
    streak: 5,
    totalGames: 20,
    wins: 15,
    achievements: ['first_win', 'streak_3'],
    level: 2,
    lastPlayDate: '2023-06-15',
    dailyChallengeStreak: 3
  }
}

export async function updateUserStats(userId: string, gameResult: { success: boolean, isDailyChallenge: boolean }) {
  // In a real application, this would update the user's stats in the database
  const currentStats = await fetchUserStats(userId)
  
  let newStats = { ...currentStats }
  newStats.totalGames += 1
  if (gameResult.success) {
    newStats.wins += 1
    newStats.streak += 1
    newStats.points += calculatePoints(true, newStats.streak, gameResult.isDailyChallenge)
  } else {
    newStats.streak = 0
  }

  newStats = updateDailyChallenge(newStats)
  const newAchievements = checkAchievements(newStats)
  newStats.achievements = [...newStats.achievements, ...newAchievements]
  const { level } = getLevel(newStats.points)
  newStats.level = level

  console.log('Updating user stats:', newStats)
  return { success: true, message: 'User stats updated successfully', newStats }
}

export async function fetchLeaderboard() {
  // In a real application, this would fetch from a database
  return [
    { name: 'Alice', correctAnswers: [1, 1, 0, 1, 1, 0, 1] },
    { name: 'Bob', correctAnswers: [1, 0, 1, 1, 0, 1, 0] },
    { name: 'Charlie', correctAnswers: [0, 1, 1, 0, 1, 1, 1] },
    { name: 'David', correctAnswers: [1, 1, 1, 0, 0, 1, 0] },
    { name: 'Eve', correctAnswers: [0, 0, 1, 1, 1, 0, 1] },
  ]
}

