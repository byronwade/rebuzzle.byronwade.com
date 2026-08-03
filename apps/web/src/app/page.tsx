import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AlreadyPlayedPanel } from "@/components/AlreadyPlayedPanel";
import GameBoard from "@/components/GameBoard";
import Layout from "@/components/Layout";
import { HomePageSkeleton } from "@/components/page-skeletons";
import { PrefetchGuestClient } from "@/components/prefetch-guest-client";
import { generatePuzzleMetadata } from "@/lib/seo/metadata";
import {
  generateFAQPageSchema,
  generateGameSchema,
  generateHowToSchema,
} from "@/lib/seo/structured-data";
import {
  canUsePuzzlePreview,
  fetchGameData,
  isPuzzleCompletedForToday,
} from "./actions/gameActions";

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
  themeColor: "#0f766e",
  // Android/Chrome: shrink the layout viewport with the keyboard so flex shells
  // and dvh track the visible band. iOS Safari ignores this (no-op) and we pin
  // to visualViewport in VisualViewportShell instead.
  // https://developer.chrome.com/blog/viewport-resize-behavior
  interactiveWidget: "resizes-content",
};

interface SearchParams {
  preview?: string;
  test?: string;
}

/**
 * Shared status surface for the three non-playable states.
 *
 * One card, hairline chrome, mono eyebrow, ink CTA — the same shape every
 * time so a failed load and a finished puzzle read as the same system.
 */
function StatusPanel({
  eyebrow,
  title,
  children,
  action,
  secondaryAction,
  headingId,
  role = "status",
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  action?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
  headingId: string;
  role?: "status" | "alert";
}) {
  return (
    <div className="mx-auto flex max-w-page items-center justify-center px-4 py-16 md:px-6 md:py-24">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-lg"
        role={role}
      >
        <p className="eyebrow">{eyebrow}</p>
        <h1
          className="mt-3 text-balance font-semibold text-2xl text-foreground tracking-[-0.04em]"
          id={headingId}
        >
          {title}
        </h1>
        <p className="mt-3 text-balance text-muted-foreground text-sm leading-6">{children}</p>
        {(action || secondaryAction) && (
          <div className="mt-7 flex flex-col items-center gap-3">
            {action && (
              <a
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-foreground px-4 font-medium text-background text-sm transition-opacity hover:opacity-90"
                href={action.href}
              >
                {action.label}
              </a>
            )}
            {secondaryAction && (
              <a
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href={secondaryAction.href}
              >
                {secondaryAction.label}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Error component - with better styling and accessibility
 */
function ErrorDisplay({ error }: { error: Error }) {
  return (
    <Layout>
      <StatusPanel
        action={{ href: "/", label: "Try again" }}
        eyebrow="Error"
        headingId="error-title"
        role="alert"
        title="Something went wrong."
      >
        We're having trouble loading today's puzzle. Refreshing the page usually fixes it.
      </StatusPanel>
    </Layout>
  );
}

/**
 * No puzzle component - enhanced design with accessibility
 */
function NoPuzzleDisplay() {
  return (
    <Layout>
      <StatusPanel
        eyebrow="No puzzle yet"
        headingId="no-puzzle-title"
        secondaryAction={{ href: "/blog", label: "Read the blog while you wait" }}
        title="Today's puzzle isn't live."
      >
        A new puzzle lands every day at midnight. Check back shortly.
      </StatusPanel>
    </Layout>
  );
}

/**
 * Puzzle already attempted — soft landing that echoes the in-thread result beat.
 */
function PuzzleAlreadyAttemptedDisplay({ wasSuccessful }: { wasSuccessful: boolean }) {
  return (
    <Layout>
      <AlreadyPlayedPanel wasSuccessful={wasSuccessful} />
    </Layout>
  );
}

/**
 * Dynamic puzzle content - will be streamed with PPR
 */
async function PuzzleContent({ params }: { params: { preview: boolean; test: boolean } }) {
  let attemptStatus;
  let gameData;
  let previewAllowed;
  try {
    // Opt into request-time rendering before Date/cookie-dependent work
    await connection();

    const wantsPreview = params.preview;
    // Parallelize lock check + puzzle fetch + admin preview auth
    [attemptStatus, gameData, previewAllowed] = await Promise.all([
      isPuzzleCompletedForToday(),
      fetchGameData(false),
      wantsPreview ? canUsePuzzlePreview() : Promise.resolve(false),
    ]);
  } catch (error) {
    console.error("Error in PuzzleContent:", error);
    return <ErrorDisplay error={error as Error} />;
  }

  const preview = params.preview && previewAllowed;

  // Fail closed: lock UI if already played, or if status is unknown
  if ((attemptStatus.hasAttempt || attemptStatus.statusUnknown) && !preview) {
    return (
      <PuzzleAlreadyAttemptedDisplay
        wasSuccessful={attemptStatus.statusUnknown ? false : attemptStatus.wasSuccessful}
      />
    );
  }

  // Handle no puzzle available - check both new and legacy fields
  const hasPuzzle = gameData.puzzle || gameData.rebusPuzzle;
  if (!hasPuzzle) {
    return <NoPuzzleDisplay />;
  }

  // Generate Game schema for JSON-LD — never include the live answer
  const publishedAtStr =
    gameData.metadata?.publishedAt ||
    gameData.publishedAt ||
    `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

  const gameSchema = generateGameSchema({
    id: gameData.id,
    puzzle: gameData.puzzle || gameData.rebusPuzzle || "",
    answer: "Solve today's Rebuzzle puzzle",
    difficulty: gameData.difficulty,
    puzzleType: gameData.puzzleType,
    explanation:
      "Daily rebus and logic puzzles. One puzzle per day — come back tomorrow for a new challenge.",
    hints: [],
    publishedAt: publishedAtStr,
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
    <Layout isGamePage>
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
      <PrefetchGuestClient />
      <GameBoard gameData={gameData} />
    </Layout>
  );
}

/**
 * Resolve searchParams inside the Suspense boundary so the shell can paint
 * immediately (awaiting in the page root blocks the fallback).
 */
async function HomeContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <PuzzleContent
      params={{
        preview: params?.preview === "true",
        test: params?.test === "true",
      }}
    />
  );
}

/**
 * Home page — sync shell + streamed puzzle (Suspense, not route loading.tsx).
 */
export default function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}
