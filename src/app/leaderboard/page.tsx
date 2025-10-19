"use client"

import { useEffect, useState } from "react"
import Layout from "@/components/Layout"
import { Card } from "@/components/ui/card"
import { Trophy, Medal, Award, TrendingUp, Flame, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  streak: number
  gamesPlayed: number
  winRate: number
  avatar?: string
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [timeframe, setTimeframe] = useState<"today" | "week" | "allTime">("today")
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    // Load leaderboard data from localStorage or API
    const mockLeaderboard: LeaderboardEntry[] = [
      { rank: 1, name: "PuzzleMaster", score: 5280, streak: 15, gamesPlayed: 20, winRate: 95 },
      { rank: 2, name: "RebusPro", score: 4950, streak: 12, gamesPlayed: 18, winRate: 92 },
      { rank: 3, name: "BrainTeaser", score: 4720, streak: 10, gamesPlayed: 17, winRate: 88 },
      { rank: 4, name: "QuickThinker", score: 4500, streak: 8, gamesPlayed: 16, winRate: 85 },
      { rank: 5, name: "SmartSolver", score: 4280, streak: 7, gamesPlayed: 15, winRate: 82 },
      { rank: 6, name: "CleverMind", score: 4100, streak: 6, gamesPlayed: 14, winRate: 80 },
      { rank: 7, name: "SharpEye", score: 3950, streak: 5, gamesPlayed: 13, winRate: 78 },
      { rank: 8, name: "PatternSeeker", score: 3800, streak: 5, gamesPlayed: 12, winRate: 75 },
      { rank: 9, name: "RiddleKing", score: 3650, streak: 4, gamesPlayed: 11, winRate: 72 },
      { rank: 10, name: "MindBender", score: 3500, streak: 3, gamesPlayed: 10, winRate: 70 },
    ]

    setLeaderboard(mockLeaderboard)

    // Get user's rank from stats
    const stats = localStorage.getItem("userStats")
    if (stats) {
      const parsed = JSON.parse(stats)
      // Calculate user's hypothetical rank
      const userScore = parsed.points || 0
      const rank = mockLeaderboard.filter(e => e.score > userScore).length + 1
      setUserRank(rank <= 10 ? rank : null)
    }
  }, [timeframe])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-500" />
      case 2:
        return <Medal className="w-8 h-8 text-gray-400" />
      case 3:
        return <Award className="w-8 h-8 text-orange-600" />
      default:
        return <div className="w-8 h-8 flex items-center justify-center text-gray-600 font-bold">#{rank}</div>
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-yellow-500" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Leaderboard
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Compete with players worldwide!
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-2 justify-center mb-6">
          {(["today", "week", "allTime"] as const).map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? "default" : "outline"}
              onClick={() => setTimeframe(tf)}
              className="capitalize"
            >
              {tf === "allTime" ? "All Time" : tf}
            </Button>
          ))}
        </div>

        {/* User's Rank (if in top 10) */}
        {userRank && userRank <= 10 && (
          <Card className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-purple-600" />
                <span className="font-semibold text-purple-900">You're #{userRank}!</span>
              </div>
              <span className="text-sm text-purple-700">Keep it up! 🔥</span>
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="overflow-hidden">
          <div className="divide-y divide-gray-100">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  entry.rank <= 3 ? "bg-gradient-to-r from-yellow-50/50 to-transparent" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank Icon */}
                  <div className="w-12 flex-shrink-0">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-lg truncate">
                      {entry.name}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {entry.gamesPlayed} games
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {entry.winRate}% win rate
                      </span>
                      {entry.streak > 0 && (
                        <span className="flex items-center gap-1 text-orange-600 font-semibold">
                          <Flame className="w-3 h-3" />
                          {entry.streak} day streak
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-purple-600">
                      {entry.score.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">points</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Call to Action */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-gray-600">
            Want to climb the leaderboard? Keep your streak alive!
          </p>
          <Link href="/">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Back to Puzzle
            </Button>
          </Link>
        </div>

        {/* Info Box */}
        <Card className="mt-6 p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">How Scoring Works</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Solve with fewer attempts = more points</li>
            <li>• Using hints reduces your score</li>
            <li>• Daily streaks multiply your points</li>
            <li>• Harder puzzles = bigger rewards</li>
          </ul>
        </Card>
      </div>
    </Layout>
  )
}
