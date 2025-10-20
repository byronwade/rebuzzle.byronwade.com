"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Layout from "@/components/Layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Trophy,
  Flame,
  Target,
  TrendingUp,
  Calendar,
  Award,
  Clock,
  Edit,
} from "lucide-react"
import Link from "next/link"

interface UserStats {
  level: number
  points: number
  streak: number
  totalGames: number
  wins: number
  achievements: string[]
  lastPlayDate: string | null
  dailyChallengeStreak: number
}

export default function ProfilePage() {
  const router = useRouter()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [username, setUsername] = useState("Guest")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load stats from localStorage
    const savedStats = localStorage.getItem("userStats")
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats))
      } catch (error) {
        console.error("Failed to parse stats:", error)
      }
    } else {
      // Initialize default stats
      setStats({
        level: 1,
        points: 0,
        streak: 0,
        totalGames: 0,
        wins: 0,
        achievements: [],
        lastPlayDate: null,
        dailyChallengeStreak: 0,
      })
    }

    // Get username from auth or localStorage
    const storedUsername = localStorage.getItem("username")
    if (storedUsername) {
      setUsername(storedUsername)
    }

    setIsLoading(false)
  }, [])

  if (isLoading || !stats) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0
  const nextLevel = stats.level + 1
  const currentLevelThreshold = stats.level > 1 ? 1000 * (stats.level - 1) : 0
  const nextLevelThreshold = 1000 * stats.level
  const progressToNextLevel = ((stats.points - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100

  const achievementDetails = {
    first_win: { name: "First Victory", icon: "🏆", description: "Won your first puzzle" },
    streak_3: { name: "3-Day Streak", icon: "🔥", description: "Played 3 days in a row" },
    streak_7: { name: "Week Warrior", icon: "⚡", description: "Played 7 days in a row" },
    games_10: { name: "Puzzle Explorer", icon: "🎯", description: "Played 10 games" },
    games_30: { name: "Puzzle Master", icon: "👑", description: "Played 30 games" },
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-purple-200">
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-3xl font-bold">
                  {username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{username}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    Level {stats.level}
                  </Badge>
                  <Badge variant="outline">
                    {stats.points.toLocaleString()} points
                  </Badge>
                </div>
              </div>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Stats Overview */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Statistics
            </h2>

            <div className="space-y-4">
              {/* Level Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Level Progress</span>
                  <span className="font-semibold">
                    {stats.points.toLocaleString()} / {nextLevelThreshold.toLocaleString()}
                  </span>
                </div>
                <Progress value={progressToNextLevel} className="h-3" />
                <p className="text-xs text-gray-500 mt-1">
                  {(nextLevelThreshold - stats.points).toLocaleString()} points to Level {nextLevel}
                </p>
              </div>

              <Separator />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <Target className="w-6 h-6 text-blue-600 mb-2" />
                  <div className="text-2xl font-bold text-blue-900">{stats.totalGames}</div>
                  <div className="text-xs text-blue-700">Games Played</div>
                </div>

                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <Trophy className="w-6 h-6 text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-900">{stats.wins}</div>
                  <div className="text-xs text-green-700">Puzzles Solved</div>
                </div>

                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <Flame className="w-6 h-6 text-orange-600 mb-2" />
                  <div className="text-2xl font-bold text-orange-900">{stats.streak}</div>
                  <div className="text-xs text-orange-700">Current Streak</div>
                </div>

                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
                  <div className="text-2xl font-bold text-purple-900">{winRate}%</div>
                  <div className="text-xs text-purple-700">Win Rate</div>
                </div>
              </div>

              {/* Last Played */}
              {stats.lastPlayDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
                  <Clock className="w-4 h-4" />
                  <span>
                    Last played: {new Date(stats.lastPlayDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Achievements */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Achievements ({stats.achievements.length})
            </h2>

            {stats.achievements.length > 0 ? (
              <div className="space-y-3">
                {stats.achievements.map((achievement) => {
                  const details = achievementDetails[achievement as keyof typeof achievementDetails]
                  return (
                    <div
                      key={achievement}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200"
                    >
                      <div className="text-3xl">{details?.icon || "🏅"}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-purple-900">
                          {details?.name || achievement}
                        </div>
                        <div className="text-xs text-purple-700">
                          {details?.description || "Achievement unlocked!"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-2">No achievements yet</p>
                <p className="text-sm text-gray-500">
                  Keep playing to unlock achievements!
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Activity Section */}
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Recent Activity
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total Points</div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.points.toLocaleString()}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Best Streak</div>
              <div className="text-2xl font-bold text-gray-900">{stats.streak}</div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Daily Streak</div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.dailyChallengeStreak}
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex gap-4 justify-center">
          <Link href="/">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Play Today's Puzzle
            </Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="outline" size="lg">
              View Leaderboard
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
