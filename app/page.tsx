import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import GameBoard from "@/components/GameBoard"
import Layout from "@/components/Layout"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { fetchGameData, isPuzzleCompletedForToday } from "./actions/gameActions"
import { redirect } from "next/navigation"
import type { GameData } from "@/lib/gameSettings"

// Enable PPR for this page
export const experimental_ppr = true

export const metadata: Metadata = {
  title: "Rebuzzle - Daily Rebus Puzzle Game",
  description: "Challenge yourself with our daily rebus puzzle. A new puzzle every day!",
  keywords: ["rebus", "puzzle", "daily puzzle", "word game", "brain teaser"],
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

interface SearchParams {
  preview?: string
  test?: string
}

/**
 * Static shell component - prerendered instantly
 */
function PuzzleShell() {
  return (
    <Layout>
      <div className="py-12 text-center fade-in-up">
        <div className="mb-6">
          <div className="text-6xl mb-4">🧩</div>
          <LoadingSpinner text="Loading today's puzzle..." />
        </div>
      </div>
    </Layout>
  )
}

/**
 * Error component - client component for interactivity
 */
function ErrorDisplay({ error }: { error: Error }) {
  return (
    <Layout>
      <div className="py-12 text-center fade-in-up">
        <div className="mb-6">
          <div className="text-6xl mb-4">😅</div>
          <h1 className="mb-4 text-3xl font-bold text-red-600">Oops! Something went wrong</h1>
          <p className="text-gray-600 mb-6">
            We're having trouble loading today's puzzle. Please try refreshing the page.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200 interactive-element"
          >
            Try Again
          </a>
        </div>
      </div>
    </Layout>
  )
}

/**
 * No puzzle component
 */
function NoPuzzleDisplay() {
  return (
    <Layout>
      <div className="py-12 text-center fade-in-up">
        <div className="mb-6">
          <div className="text-6xl mb-4">🧩</div>
          <h1 className="mb-4 text-3xl font-bold text-gray-700">No Puzzle Available</h1>
          <p className="text-gray-600 mb-6">Check back later for today's puzzle!</p>
          <LoadingSpinner text="Loading new puzzle..." />
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
      redirect("/game-over")
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
