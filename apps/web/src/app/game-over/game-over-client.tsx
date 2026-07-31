"use client";

import { Check, Flame, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { calculateScore } from "@/components/CelebrationOverlay";
import { Confetti } from "@/components/Confetti";
import { CountdownTimer } from "@/components/CountdownTimer";
import { EnhancedShareButton } from "@/components/EnhancedShareButton";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { gameSettings } from "@/lib/gameSettings";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface GameData {
  answer: string;
  explanation: string;
  difficulty: number;
  puzzleType?: string;
  metadata?: {
    puzzleType?: string;
  };
}

interface WordResult {
  word: string;
  correct: boolean;
  similarity?: number;
}

interface GuessAttempt {
  text: string;
  timestamp: Date;
  wordResults: WordResult[];
  attemptNumber: number;
}

interface CompletionData {
  guessHistory: GuessAttempt[];
  timeTaken: number;
  usedHints: number;
  streak: number;
  score: number;
}

interface GameOverClientProps {
  gameData: GameData;
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function GameOverClient({ gameData, searchParams: params }: GameOverClientProps) {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  // Global comparison stats
  const [percentile, setPercentile] = useState<number | null>(null);
  const [todaySolves, setTodaySolves] = useState<number | null>(null);

  useEffect(() => {
    async function loadClientExtras() {
      try {
        // Load completion data from localStorage
        try {
          const storedData = localStorage.getItem("lastGameCompletion");
          if (storedData) {
            const parsed = JSON.parse(storedData) as CompletionData;
            setCompletionData(parsed);
            if (parsed.streak) {
              setStreak(parsed.streak);
            }
          }
        } catch (e) {
          console.error("Error loading completion data:", e);
        }

        // Fallback: Load streak from database (only if we have a userId)
        if (userId) {
          try {
            const response = await fetch(`/api/user/stats?userId=${userId}`);
            if (response.ok) {
              const userStats = await response.json();
              if (userStats.stats?.streak) {
                setStreak((prev) => prev || userStats.stats.streak);
              }
            }
          } catch (error) {
            console.error("Error loading user stats:", error);
          }
        }

        // Fetch puzzle stats for global comparison
        try {
          const statsResponse = await fetch("/api/puzzles/stats");
          if (statsResponse.ok) {
            const stats = await statsResponse.json();
            setTodaySolves(stats.todaySolves || 0);

            const storedData = localStorage.getItem("lastGameCompletion");
            if (storedData && stats.solveTimeDistribution?.length > 0) {
              const parsed = JSON.parse(storedData) as CompletionData;
              const userTime = parsed.timeTaken;
              const slowerCount = stats.solveTimeDistribution.filter(
                (t: number) => t > userTime
              ).length;
              const pct = Math.round((slowerCount / stats.solveTimeDistribution.length) * 100);
              setPercentile(Math.min(99, Math.max(1, pct)));
            }
          }
        } catch (error) {
          console.error("Error loading puzzle stats:", error);
        }
      } finally {
        setLoading(false);
      }
    }

    loadClientExtras();
  }, [userId]);

  const success = params.success === "true";
  const attempts =
    typeof params.attempts === "string"
      ? Number.parseInt(params.attempts, 10)
      : gameSettings.maxAttempts;
  const timeTaken =
    typeof params.time === "string" ? Number.parseInt(params.time, 10) : completionData?.timeTaken;
  const difficulty = gameData?.difficulty ?? 5;

  // Calculate final score using unified scoring:
  // calculateScore(attempts, timeTaken, streakDays, difficulty)
  const finalScore = success
    ? completionData?.score || calculateScore(attempts, timeTaken, streak, difficulty)
    : 0;

  // Animate score counter and trigger confetti on success
  useEffect(() => {
    if (!success || loading || animationComplete) return;

    // Trigger confetti immediately
    setShowConfetti(true);
    haptics.celebration();

    const duration = 800;
    const steps = 30;
    const increment = finalScore / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= finalScore) {
        setDisplayScore(finalScore);
        setAnimationComplete(true);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [success, loading, finalScore, animationComplete]);

  return (
    <Layout>
      {success && showConfetti && <Confetti />}

      <div className="mx-auto max-w-lg px-4 py-12 md:py-16">
        {success ? (
          /* SUCCESS STATE - Minimal & Clean */
          <div className="fade-in-up space-y-10">
            {/* Header */}
            <div className="space-y-3 text-center">
              <div className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-full border border-success/25 bg-success/10">
                <Check className="h-5 w-5 text-success" strokeWidth={2.5} />
              </div>
              <h1 className="font-semibold text-4xl text-foreground tracking-[-0.045em]">Solved</h1>
              <p className="text-muted-foreground text-sm">You got today's puzzle</p>
            </div>

            {/* Answer */}
            <div className="border-border border-y py-8 text-center">
              <p className="eyebrow mb-3">The Answer</p>
              <h2 className="text-balance font-semibold text-4xl text-foreground tracking-[-0.045em] md:text-5xl">
                {gameData.answer}
              </h2>
              {gameData.explanation && (
                <p className="mx-auto mt-5 max-w-sm text-balance text-muted-foreground text-sm leading-6">
                  {gameData.explanation}
                </p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-card py-5 text-center">
              <div>
                <div className="font-semibold text-3xl text-foreground tracking-[-0.04em] tabular-nums">
                  {attempts}
                </div>
                <div className="mt-1.5 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
                  {attempts === 1 ? "Attempt" : "Attempts"}
                </div>
              </div>
              <div>
                <div className="font-semibold text-3xl text-foreground tracking-[-0.04em] tabular-nums">
                  {displayScore}
                </div>
                <div className="mt-1.5 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
                  Points
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 font-semibold text-3xl tracking-[-0.04em] tabular-nums">
                  {streak > 0 ? (
                    <>
                      <span className="text-warning">{streak}</span>
                      <Flame className="h-4 w-4 text-warning" />
                    </>
                  ) : (
                    <span className="text-foreground">0</span>
                  )}
                </div>
                <div className="mt-1.5 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
                  Streak
                </div>
              </div>
            </div>

            {/* Global Comparison Badge - Social proof */}
            {percentile !== null && percentile > 50 && (
              <div className="fade-in-50 mx-auto flex w-fit animate-in items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3.5 py-1.5 duration-500">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                <span className="font-medium text-success text-sm">
                  Faster than {percentile}% of players today
                </span>
              </div>
            )}

            {/* Guess History */}
            {completionData?.guessHistory && completionData.guessHistory.length > 0 && (
              <div className="space-y-3">
                <p className="eyebrow text-center">Your Guesses</p>
                <div className="space-y-2">
                  {completionData.guessHistory.map((attempt, index) => {
                    const isWinning = index === completionData.guessHistory.length - 1;
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3",
                          isWinning
                            ? "border-success/25 bg-success/[0.07]"
                            : "border-border bg-card"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]",
                            isWinning ? "bg-success text-background" : "bg-inset text-subtle"
                          )}
                        >
                          {isWinning ? <Check className="h-3.5 w-3.5" /> : attempt.attemptNumber}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {attempt.wordResults.map((result, wordIndex) => (
                            <span
                              key={wordIndex}
                              className={cn(
                                "rounded px-1.5 py-0.5 font-mono text-[11px] uppercase",
                                result.correct
                                  ? "bg-success/15 text-success"
                                  : "bg-destructive/10 text-destructive"
                              )}
                            >
                              {result.word}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Share Button */}
            <EnhancedShareButton
              attempts={attempts}
              answer={gameData.answer}
              className="w-full"
              difficulty={gameData.difficulty}
              maxAttempts={gameSettings.maxAttempts}
              puzzleType={gameData.puzzleType || gameData.metadata?.puzzleType}
              streak={streak}
              success={success}
            />

            {/* Secondary Actions */}
            <div className="flex gap-3">
              <Link className="flex-1" href="/leaderboard">
                <Button variant="outline" className="w-full">
                  Leaderboard
                </Button>
              </Link>
              <Link className="flex-1" href="/blog">
                <Button variant="outline" className="w-full">
                  Tips
                </Button>
              </Link>
            </div>

            {/* Countdown */}
            <div className="border-border border-t pt-6 text-center">
              <p className="eyebrow mb-2">Next puzzle in</p>
              <CountdownTimer />
            </div>
          </div>
        ) : (
          /* FAILURE STATE - Minimal & Clean */
          <div className="fade-in-up space-y-10">
            {/* Header */}
            <div className="space-y-3 text-center">
              <div className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-inset">
                <X className="h-8 w-8 text-muted-foreground" strokeWidth={2} />
              </div>
              <h1 className="font-semibold text-4xl text-foreground tracking-[-0.045em]">
                Not quite
              </h1>
              <p className="text-muted-foreground text-sm">Better luck tomorrow</p>
            </div>

            {/* Answer */}
            <div className="border-border border-y py-8 text-center">
              <p className="eyebrow mb-3">The Answer Was</p>
              <h2 className="text-balance font-semibold text-4xl text-foreground tracking-[-0.045em] md:text-5xl">
                {gameData.answer}
              </h2>
              {gameData.explanation && (
                <p className="mx-auto mt-5 max-w-sm text-balance text-muted-foreground text-sm leading-6">
                  {gameData.explanation}
                </p>
              )}
            </div>

            {/* Guess History */}
            {completionData?.guessHistory && completionData.guessHistory.length > 0 && (
              <div className="space-y-3">
                <p className="eyebrow text-center">Your Attempts</p>
                <div className="space-y-2">
                  {completionData.guessHistory.map((attempt, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-inset font-mono text-[10px] text-subtle">
                        {attempt.attemptNumber}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {attempt.wordResults.map((result, wordIndex) => (
                          <span
                            key={wordIndex}
                            className={cn(
                              "rounded px-1.5 py-0.5 font-mono text-[11px] uppercase",
                              result.correct
                                ? "bg-success/15 text-success"
                                : "bg-destructive/10 text-destructive"
                            )}
                          >
                            {result.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comeback Encouragement - Psychology: Positive reinforcement for return */}
            <div className="rounded-xl border border-border bg-inset px-6 py-5 text-center">
              <p className="font-medium text-foreground text-sm">Every puzzle makes you sharper</p>
              <p className="mt-1 text-muted-foreground text-xs">
                {todaySolves !== null && todaySolves > 0
                  ? `${todaySolves.toLocaleString()} players solved today. Come back tomorrow for a fresh start!`
                  : "Come back tomorrow for a fresh start!"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link className="flex-1" href="/leaderboard">
                <Button variant="outline" className="w-full">
                  Leaderboard
                </Button>
              </Link>
              <Link className="flex-1" href="/blog">
                <Button variant="outline" className="w-full">
                  Tips
                </Button>
              </Link>
            </div>

            {/* Countdown */}
            <div className="border-border border-t pt-6 text-center">
              <p className="eyebrow mb-2">Next puzzle in</p>
              <CountdownTimer />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
