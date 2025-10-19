"use client"

import { Confetti } from "@/components/Confetti"
import { gameSettings } from "@/lib/gameSettings"
import Layout from "@/components/Layout"
import { fetchGameData } from "../actions/gameActions"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Trophy, TrendingUp, Clock, Target, Flame } from "lucide-react"
import { Card } from "@/components/ui/card"
import { CountdownTimer } from "@/components/CountdownTimer"

interface GameData {
  answer: string
  explanation: string
  difficulty: number
}

export default function GameOverPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const [params, setParams] = useState<{ [key: string]: string | string[] | undefined }>({})
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await searchParams
        setParams(resolvedParams)

        const data = await fetchGameData()
        setGameData(data as GameData)

        // Load streak from localStorage
        const stats = localStorage.getItem("userStats")
        if (stats) {
          const parsed = JSON.parse(stats)
          setStreak(parsed.streak || 0)
        }
      } catch (error) {
        console.error("Error loading game data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [searchParams])

  const success = params.success === "true"
  const attempts = typeof params.attempts === "string" ? parseInt(params.attempts, 10) : gameSettings.maxAttempts
  const guess = typeof params.guess === "string" ? params.guess : ""

  const generateShareText = () => {
    const today = new Date().toLocaleDateString()
    const attemptSquares = success
      ? "🟩".repeat(attempts) + "⬜".repeat(gameSettings.maxAttempts - attempts)
      : "🟥".repeat(attempts)

    return `Rebuzzle ${today}
${success ? "✅ Solved!" : "❌ Failed"}
${attemptSquares}
${attempts}/${gameSettings.maxAttempts} attempts
${streak > 0 ? `🔥 ${streak} day streak` : ""}

Play at rebuzzle.com`
  }

  const handleShare = async () => {
    const text = generateShareText()

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rebuzzle Results",
          text: text,
        })
      } catch (err) {
        console.log("Share cancelled")
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading || !gameData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {success && <Confetti />}

      <div className="max-w-2xl mx-auto p-4 py-8">
        {/* Main Result Card - Wordle Style */}
        <Card className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-xl">
          {/* Header */}
          <div className={`p-8 text-center ${success ? "bg-gradient-to-r from-green-50 to-emerald-50" : "bg-gradient-to-r from-red-50 to-orange-50"}`}>
            <div className="text-6xl mb-4 animate-bounce">
              {success ? "🎉" : "😔"}
            </div>
            <h1 className={`text-4xl font-bold mb-2 ${success ? "text-green-600" : "text-red-600"}`}>
              {success ? "Genius!" : "Almost There!"}
            </h1>
            <p className="text-gray-600 text-lg">
              {success ? "You solved today's Rebuzzle!" : "Better luck tomorrow!"}
            </p>
          </div>

          {/* Stats Grid - Wordle Style */}
          <div className="p-6 space-y-6">
            {/* Attempt Visualization */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Your Attempts</h3>
              <div className="flex gap-2 justify-center flex-wrap">
                {[...Array(gameSettings.maxAttempts)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg transition-all ${
                      i < attempts
                        ? success
                          ? "bg-green-500 scale-110"
                          : "bg-red-500"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {i < attempts ? (success ? "✓" : "✗") : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* Answer Reveal */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <div className="text-center space-y-2">
                <div className="text-sm font-semibold text-purple-600 uppercase tracking-wide">The Answer</div>
                <div className="text-4xl font-bold text-purple-900 uppercase tracking-wider">
                  {gameData.answer}
                </div>
                <div className="text-sm text-gray-600 mt-3 leading-relaxed">
                  {gameData.explanation}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                <Target className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold text-blue-900">{attempts}</div>
                <div className="text-xs text-blue-700">Attempts</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-200">
                <Flame className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold text-orange-900">{streak}</div>
                <div className="text-xs text-orange-700">Day Streak</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
                <Trophy className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold text-purple-900">{gameData.difficulty}/10</div>
                <div className="text-xs text-purple-700">Difficulty</div>
              </div>
            </div>

            {/* Share Button - Wordle Style */}
            <Button
              onClick={handleShare}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Share2 className="w-5 h-5 mr-2" />
              {copied ? "Copied to Clipboard!" : "Share Results"}
            </Button>

            {/* Preview of what gets shared */}
            {success && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-xs text-gray-500 mb-2">Share Preview:</div>
                <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">
                  {generateShareText()}
                </pre>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <div className="space-y-3">
              {/* No "Play Again" button - they must wait! */}
              <div className="text-center py-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                <p className="text-purple-900 font-semibold mb-1">🎉 You've completed today's puzzle!</p>
                <p className="text-sm text-purple-700">Come back tomorrow for a new challenge</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link href="/leaderboard" className="block">
                  <Button variant="default" className="w-full bg-purple-600 hover:bg-purple-700 border-2 py-4">
                    🏆 Leaderboard
                  </Button>
                </Link>
                <Link href="/blog" className="block">
                  <Button variant="outline" className="w-full border-2 py-4">
                    📚 Read Tips
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        {/* Next Puzzle Countdown - Real-time */}
        <div className="mt-6 text-center">
          <CountdownTimer />
          <p className="text-xs text-gray-500 mt-3">Come back when the timer hits zero!</p>
        </div>

        {/* Powered by AI badge */}
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-500">
            🤖 Puzzle generated by Google AI · Unique every day
          </span>
        </div>
      </div>
    </Layout>
  )
}
