import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import GameBoard from "@/components/GameBoard";
import Layout from "@/components/Layout";
import { PuzzleSkeleton } from "@/components/PuzzleSkeleton";
import { generatePuzzleMetadata } from "@/lib/seo/metadata";
import {
  generateFAQPageSchema,
  generateGameSchema,
  generateHowToSchema,
} from "@/lib/seo/structured-data";
import { fetchGameData, isPuzzleCompletedForToday } from "./actions/gameActions";

// Note: Page is dynamic by default due to use of headers() and dynamic data fetching
// cacheComponents mode ensures fresh puzzle data while optimizing component caching

/**
 * Generate dynamic metadata based on today's puzzle
 */
export async function generateMetadata(): Promise<Metadata> {
  // In Cache Components mode, generateMetadata is called during prerendering
  // Return simple metadata without fetching to avoid new Date() issues
  // The page component will handle dynamic metadata via client-side updates if needed
  return generatePuzzleMetadata({
    answer: "rebus puzzle",
    puzzleType: "rebus",
    difficulty: 5,
    explanation:
      "Daily rebus puzzle game - The ultimate Wordle alternative with multiple puzzle types!",
  });
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#8b5cf6",
};

interface SearchParams {
  preview?: string;
  test?: string;
}

/**
 * Static shell component - prerendered instantly with skeleton
 */
function PuzzleShell() {
  return (
    <Layout>
      <PuzzleSkeleton />
    </Layout>
  );
}

/**
 * Error component - with better styling and accessibility
 */
function ErrorDisplay({ error }: { error: Error }) {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <div
          aria-labelledby="error-title"
          className="space-y-4 rounded-3xl border border-destructive/20 bg-card px-4 py-3 text-center shadow-xl md:px-6"
          role="alert"
        >
          <div
            aria-hidden="true"
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 motion-safe:animate-bounce motion-reduce:animate-none"
          >
            <span className="text-4xl">😅</span>
          </div>
          <div>
            <h1
              className="mb-2 font-semibold text-base text-destructive md:text-lg"
              id="error-title"
            >
              Oops! Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm">
              We're having trouble loading today's puzzle. Please try refreshing the page.
            </p>
          </div>
          <a
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            href="/"
          >
            Try Again
          </a>
        </div>
      </div>
    </Layout>
  );
}

/**
 * No puzzle component - enhanced design with accessibility
 */
function NoPuzzleDisplay() {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <div
          aria-labelledby="no-puzzle-title"
          className="space-y-4 rounded-3xl border border-border bg-card px-4 py-3 text-center shadow-xl md:px-6"
          role="status"
        >
          <div
            aria-hidden="true"
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 motion-safe:animate-pulse motion-reduce:animate-none"
          >
            <span className="text-4xl">🧩</span>
          </div>
          <div>
            <h1
              className="mb-2 font-semibold text-base text-foreground md:text-lg"
              id="no-puzzle-title"
            >
              No Puzzle Available
            </h1>
            <p className="text-muted-foreground text-sm">Check back later for today's puzzle!</p>
          </div>
          <div aria-hidden="true" className="flex justify-center gap-2">
            <div
              className="h-2 w-2 rounded-full bg-primary motion-safe:animate-bounce motion-reduce:animate-none"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="h-2 w-2 rounded-full bg-primary motion-safe:animate-bounce motion-reduce:animate-none"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="h-2 w-2 rounded-full bg-primary motion-safe:animate-bounce motion-reduce:animate-none"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

/**
 * Puzzle already attempted component - shows when user has completed or failed today's puzzle
 */
function PuzzleAlreadyAttemptedDisplay({ wasSuccessful }: { wasSuccessful: boolean }) {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <div
          aria-labelledby="puzzle-attempted-title"
          className="space-y-4 rounded-3xl border border-border bg-card px-4 py-3 text-center shadow-xl md:px-6"
          role="status"
        >
          <div
            aria-hidden="true"
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              wasSuccessful ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
            }`}
          >
            <span className="text-4xl">{wasSuccessful ? "🎉" : "😔"}</span>
          </div>
          <div>
            <h1
              className="mb-2 font-semibold text-base text-foreground md:text-lg"
              id="puzzle-attempted-title"
            >
              {wasSuccessful
                ? "You completed today's puzzle!"
                : "You already attempted today's puzzle"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {wasSuccessful
                ? "Great job! Come back tomorrow for a new puzzle."
                : "Better luck tomorrow! A new puzzle awaits."}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 pt-2">
            <a
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              href="/game-over"
            >
              View Results
            </a>
            <a className="text-muted-foreground text-sm hover:text-foreground" href="/leaderboard">
              Check the Leaderboard
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/**
 * Dynamic puzzle content - will be streamed with PPR
 */
async function PuzzleContent({ params }: { params: { preview: boolean; test: boolean } }) {
  try {
    // Access headers to ensure this component is dynamic before any operations
    // This is required in Next.js 16 Cache Components mode
    const headersList = await headers();
    headersList.get("x-forwarded-proto");

    // params makes this component dynamic, but we need to ensure it's accessed
    // before any operations that might use new Date()
    const { preview, test } = params;

    // Check if the puzzle has been attempted today (success or failure)
    const attemptStatus = await isPuzzleCompletedForToday();

    // If user has already attempted today's puzzle, show appropriate message
    if (attemptStatus.hasAttempt && !preview) {
      return <PuzzleAlreadyAttemptedDisplay wasSuccessful={attemptStatus.wasSuccessful} />;
    }

    // Fetch game data - pass false for isCompleted since we handle it above
    const gameData = await fetchGameData(params.preview, false);

    // Handle legacy shouldRedirect (kept for backwards compatibility)
    if (gameData.shouldRedirect) {
      if (gameData.isCompleted) {
        redirect("/game-over?success=true");
      } else {
        redirect("/game-over?success=false");
      }
    }

    // Handle no puzzle available - check both new and legacy fields
    const hasPuzzle = gameData.puzzle || gameData.rebusPuzzle;
    if (!hasPuzzle) {
      return <NoPuzzleDisplay />;
    }

    // Generate Game schema for JSON-LD
    // Get publishedAt from puzzle metadata or use current date as fallback
    // Pass as string to avoid new Date() during prerendering
    const publishedAtStr =
      gameData.metadata?.publishedAt || gameData.publishedAt || new Date().toISOString(); // Use current date if not available

    const gameSchema = generateGameSchema({
      id: gameData.id,
      puzzle: gameData.puzzle || gameData.rebusPuzzle || "",
      answer: gameData.answer,
      difficulty: gameData.difficulty,
      puzzleType: gameData.puzzleType,
      explanation: gameData.explanation,
      hints: gameData.hints,
      publishedAt: publishedAtStr, // Pass as string - generateGameSchema will convert it
    });

    // Generate FAQ schema for common puzzle questions
    const faqSchema = generateFAQPageSchema([
      {
        question: "How do you play Rebuzzle?",
        answer:
          "Rebuzzle is a daily puzzle game where you solve visual rebus puzzles, logic grids, cryptic crosswords, and more. Each day you get one new puzzle. Analyze the clues, use hints if needed, and solve to build your streak!",
      },
      {
        question: "Is Rebuzzle free to play?",
        answer:
          "Yes! Rebuzzle is completely free to play. No subscriptions, no ads, just daily puzzle fun.",
      },
      {
        question: "What types of puzzles does Rebuzzle have?",
        answer:
          "Rebuzzle features 7 puzzle types: rebus puzzles (visual word puzzles), logic grids, cryptic crosswords, number sequences, pattern recognition, Caesar ciphers, and trivia questions. All puzzles are AI-generated and unique every day.",
      },
      {
        question: "How is Rebuzzle different from Wordle?",
        answer:
          "While Wordle focuses on guessing 5-letter words, Rebuzzle offers multiple puzzle types including visual rebus puzzles, logic grids, cryptic crosswords, and more. Each puzzle type challenges different cognitive skills.",
      },
      {
        question: "Can you play Rebuzzle on mobile?",
        answer:
          "Yes! Rebuzzle is a Progressive Web App (PWA) that works perfectly on mobile, tablet, and desktop. You can even install it on your phone for offline play.",
      },
      {
        question: "How do hints work in Rebuzzle?",
        answer:
          "Rebuzzle features a progressive hint system. You can reveal hints that guide you toward the solution without spoiling the answer. Hints are designed to help you learn and improve your puzzle-solving skills.",
      },
      {
        question: "What is a rebus puzzle?",
        answer:
          "A rebus puzzle is a visual word puzzle that uses pictures, symbols, and words to represent words or phrases. For example, a picture of a bee (🐝) plus the number 4 (4️⃣) represents 'before' (bee-four).",
      },
      {
        question: "How do you solve rebus puzzles?",
        answer:
          "To solve rebus puzzles, look at the visual elements and think about what they represent. Combine sounds, words, and symbols to form the answer. Use hints if you're stuck, and remember that rebus puzzles often use wordplay and phonetic connections.",
      },
    ]);

    // Generate HowTo schema for puzzle-solving
    const howToSchema = generateHowToSchema({
      name: "How to Solve Rebuzzle Puzzles",
      description:
        "Learn how to solve rebus puzzles, logic grids, and other puzzle types in Rebuzzle",
      steps: [
        {
          name: "Analyze the Puzzle",
          text: "Look carefully at all visual elements, symbols, and words in the puzzle. Identify what each element might represent.",
        },
        {
          name: "Think About Wordplay",
          text: "Rebus puzzles often use phonetic connections, compound words, or visual representations. Consider how elements might combine or sound.",
        },
        {
          name: "Use Hints Strategically",
          text: "If you're stuck, use the progressive hint system. Start with the first hint and only reveal more if needed.",
        },
        {
          name: "Make Your Guess",
          text: "Type your answer using the on-screen keyboard. You'll get instant feedback on whether you're correct.",
        },
        {
          name: "Learn from Explanations",
          text: "After solving (or viewing the answer), read the explanation to understand the puzzle's logic and improve your skills.",
        },
      ],
    });

    return (
      <Layout>
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(gameSchema),
          }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema),
          }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(howToSchema),
          }}
          type="application/ld+json"
        />
        <GameBoard gameData={gameData} />
      </Layout>
    );
  } catch (error) {
    console.error("Error in PuzzleContent:", error);
    return <ErrorDisplay error={error as Error} />;
  }
}

/**
 * Home page with PPR optimization
 *
 * With PPR enabled:
 * 1. Static shell renders instantly
 * 2. Dynamic content streams in as ready
 * 3. User sees content faster
 *
 * Enhanced with Suspense for better streaming and loading states
 */
export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // searchParams makes this component dynamic, so we don't need to access headers()
  const params = await searchParams;

  return (
    <Suspense fallback={<PuzzleShell />}>
      <PuzzleContent
        params={{
          preview: params?.preview === "true",
          test: params?.test === "true",
        }}
      />
    </Suspense>
  );
}
