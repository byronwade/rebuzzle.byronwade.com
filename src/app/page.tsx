import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import GameBoard from "@/components/GameBoard"
import Layout from "@/components/Layout"
import { PuzzleSkeleton } from "@/components/PuzzleSkeleton"
import { fetchGameData, isPuzzleCompletedForToday } from "./actions/gameActions"
import { redirect } from "next/navigation"
import type { GameData } from "@/lib/gameSettings"

// PPR enabled globally via cacheComponents in next.config.mjs

export const metadata: Metadata = {
  title: "Rebuzzle - Daily Rebus Puzzle Game | AI-Powered Brain Teasers",
  description: "Challenge yourself with our daily AI-generated rebus puzzle. New unique puzzles every day with adaptive difficulty!",
  keywords: ["rebus", "puzzle", "daily puzzle", "word game", "brain teaser", "AI puzzles"],
  openGraph: {
    title: "Rebuzzle - Daily Rebus Puzzle Game",
    description: "Challenge yourself with AI-generated rebus puzzles. New unique puzzles daily!",
    type: "website",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#8b5cf6",
}

interface SearchParams {
  preview?: string
  test?: string
}

/**
 * Static shell component - prerendered instantly with skeleton
 */
function PuzzleShell() {
  return (
    <Layout>
      <PuzzleSkeleton />
    </Layout>
  )
}

/**
 * Error component - with better styling
 */
function ErrorDisplay({ error }: { error: Error }) {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center animate-bounce">
            <span className="text-5xl">😅</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-red-600 mb-3">Oops! Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We're having trouble loading today's puzzle. Please try refreshing the page.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Try Again
          </a>
        </div>
      </div>
    </Layout>
  )
}

/**
 * No puzzle component - enhanced design
 */
function NoPuzzleDisplay() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-5xl animate-pulse">🧩</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-3">No Puzzle Available</h1>
            <p className="text-gray-600">Check back later for today's puzzle!</p>
          </div>
          <div className="flex gap-2 justify-center">
            <div className="h-2 w-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </Layout>
  )
}

/**
 * Dynamic puzzle content - will be streamed with PPR
 */
async function PuzzleContent({ params }: { params: { preview: boolean; test: boolean } }) {
  try {
    // Check if the puzzle is completed for today
    const isCompleted = await isPuzzleCompletedForToday()

    // Fetch game data
    const gameData = await fetchGameData(params.preview, isCompleted)

    // Handle redirection for completed puzzles
    if (gameData.shouldRedirect) {
      // Check if puzzle was completed successfully
      if (gameData.isCompleted) {
        redirect("/game-over?success=true")
      } else {
        redirect("/puzzle-failed")
      }
    }

    // Handle no puzzle available
    if (!gameData.rebusPuzzle) {
      return <NoPuzzleDisplay />
    }

    return (
      <Layout>
        <GameBoard gameData={gameData} />
      </Layout>
    )
  } catch (error) {
    console.error("Error in PuzzleContent:", error)
    return <ErrorDisplay error={error as Error} />
  }
}

/**
 * Home page with PPR optimization
 *
 * With PPR enabled:
 * 1. Static shell renders instantly
 * 2. Dynamic content streams in as ready
 * 3. User sees content faster
 */
export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams

  return (
    <Suspense fallback={<PuzzleShell />}>
      <PuzzleContent
        params={{
          preview: params?.preview === "true",
          test: params?.test === "true",
        }}
      />
    </Suspense>
  )
}
