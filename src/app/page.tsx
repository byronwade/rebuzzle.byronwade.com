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
import {
  fetchGameData,
  isPuzzleCompletedForToday,
} from "./actions/gameActions";
import { getTodaysPuzzle } from "./actions/puzzleGenerationActions";

// PPR enabled globally via cacheComponents in next.config.mjs

/**
 * Generate dynamic metadata based on today's puzzle
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    // generateMetadata is always dynamic, but in Cache Components mode we should avoid new Date()
    // Pass undefined and let getTodaysPuzzle handle the date internally
    const puzzleResult = await getTodaysPuzzle(undefined, undefined);

    if (puzzleResult.success && puzzleResult.puzzle) {
      const puzzle = puzzleResult.puzzle;
      return generatePuzzleMetadata({
        answer: puzzle.answer,
        puzzleType: puzzle.puzzleType,
        difficulty: puzzle.difficulty,
        explanation: puzzle.explanation,
      });
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
  }

  // Fallback metadata with competitive keywords
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
 * Error component - with better styling
 */
function ErrorDisplay({ error }: { error: Error }) {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <div className="space-y-4 rounded-3xl border border-destructive/20 bg-card px-4 py-3 text-center shadow-xl md:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 motion-safe:animate-bounce motion-reduce:animate-none">
            <span className="text-4xl">😅</span>
          </div>
          <div>
            <h1 className="mb-2 font-semibold text-base text-destructive md:text-lg">
              Oops! Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm">
              We're having trouble loading today's puzzle. Please try refreshing
              the page.
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
 * No puzzle component - enhanced design
 */
function NoPuzzleDisplay() {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <div className="space-y-4 rounded-3xl border border-border bg-card px-4 py-3 text-center shadow-xl md:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 motion-safe:animate-pulse motion-reduce:animate-none">
            <span className="text-4xl">🧩</span>
          </div>
          <div>
            <h1 className="mb-2 font-semibold text-base text-foreground md:text-lg">
              No Puzzle Available
            </h1>
            <p className="text-muted-foreground text-sm">
              Check back later for today's puzzle!
            </p>
          </div>
          <div className="flex justify-center gap-2">
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
 * Dynamic puzzle content - will be streamed with PPR
 */
async function PuzzleContent({
  params,
}: {
  params: { preview: boolean; test: boolean };
}) {
  try {
    // Check if the puzzle is completed for today
    const isCompleted = await isPuzzleCompletedForToday();

    // Fetch game data
    const gameData = await fetchGameData(params.preview, isCompleted);

    // Handle redirection for completed puzzles
    if (gameData.shouldRedirect) {
      // Check if puzzle was completed successfully
      if (gameData.isCompleted) {
        redirect("/game-over?success=true");
      } else {
        redirect("/puzzle-failed");
      }
    }

    // Handle no puzzle available - check both new and legacy fields
    const hasPuzzle = gameData.puzzle || (gameData as any).rebusPuzzle;
    if (!hasPuzzle) {
      return <NoPuzzleDisplay />;
    }

    // Generate Game schema for JSON-LD
    // Get publishedAt from puzzle metadata or use a safe default
    // Pass as string to avoid new Date() during prerendering
    const publishedAtStr = (gameData.metadata as any)?.publishedAt 
      || (gameData as any).publishedAt 
      || '2024-01-01T00:00:00Z'; // Placeholder date if not available
    
    const gameSchema = generateGameSchema({
      id: gameData.id,
      puzzle: gameData.puzzle || (gameData as any).rebusPuzzle || "",
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
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
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
