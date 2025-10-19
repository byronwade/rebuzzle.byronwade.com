"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Layout from "@/components/Layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle, Clock, TrendingDown } from "lucide-react"
import Cookies from "js-cookie"

export default function PuzzleFailedPage() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [canRetry, setCanRetry] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [answer, setAnswer] = useState<string>("")

  useEffect(() => {
    // Get failure data from cookies
    const failureData = Cookies.get("puzzle_failure")
    const nextPlayCookie = Cookies.get("next_play_time")

    if (!failureData || !nextPlayCookie) {
      // No failure data, redirect to home
      router.push("/")
      return
    }

    try {
      const data = JSON.parse(failureData)
      setAttempts(data.attempts || 0)
      setAnswer(data.answer || "")

      const nextPlayTime = new Date(nextPlayCookie)

      // Update countdown every second
      const interval = setInterval(() => {
        const now = new Date()
        const diff = nextPlayTime.getTime() - now.getTime()

        if (diff <= 0) {
          setCanRetry(true)
          setTimeLeft("Ready to play!")
          clearInterval(interval)
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((diff % (1000 * 60)) / 1000)

          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
        }
      }, 1000)

      return () => clearInterval(interval)
    } catch (error) {
      console.error("Error parsing failure data:", error)
      router.push("/")
    }
  }, [router])

  const handleRetry = () => {
    if (canRetry) {
      // Clear failure cookies
      Cookies.remove("puzzle_failure")
      Cookies.remove("next_play_time")
      Cookies.remove("puzzle_completed")

      router.push("/")
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <Card className="bg-white rounded-3xl shadow-2xl border-2 border-red-100 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-white text-center">
            <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 animate-pulse">
              <XCircle className="w-16 h-16" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Puzzle Failed</h1>
            <p className="text-red-100 text-lg">Don't worry, you'll get the next one!</p>
          </div>

          {/* Content Section */}
          <div className="p-8 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <TrendingDown className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{attempts}</div>
                <div className="text-sm text-gray-600">Attempts Used</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <Clock className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <div className="text-2xl font-bold text-blue-900">{timeLeft || "Calculating..."}</div>
                <div className="text-sm text-blue-700">Until Next Puzzle</div>
              </div>
            </div>

            {/* Answer Reveal */}
            {answer && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
                <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <span>💡</span> The Answer Was:
                </h3>
                <p className="text-3xl font-bold text-purple-600 text-center uppercase tracking-wide">
                  {answer}
                </p>
              </div>
            )}

            {/* Encouragement */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-3">Keep Improving! 🚀</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Every puzzle helps you get better at pattern recognition</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Tomorrow's puzzle is a fresh challenge</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Use hints strategically - they're there to help you learn</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleRetry}
                disabled={!canRetry}
                size="lg"
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold py-6"
              >
                {canRetry ? "Play Next Puzzle" : `Wait ${timeLeft}`}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/blog")}
                className="flex-1 border-2 text-lg py-6"
              >
                Read Puzzle Tips
              </Button>
            </div>

            {/* Info */}
            <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-200">
              <p>A new puzzle will be available at midnight. Come back then!</p>
              <p className="mt-1">In the meantime, check out our blog for puzzle-solving tips.</p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
