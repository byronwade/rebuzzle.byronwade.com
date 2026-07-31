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
  locked?: boolean;
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

export default function GameOverClient({
  gameData,
  searchParams: params,
}: GameOverClientProps) {
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

  const [solution, setSolution] = useState({
    answer: gameData.answer || "",
    explanation: gameData.explanation || "",
  });

  useEffect(() => {
    // Server lock is authoritative — never unlock results from localStorage alone
    if (!gameData.locked) {
      setSolution({ answer: "", explanation: "" });
      return;
    }

    if (gameData.answer) {
      setSolution({ answer: gameData.answer, explanation: gameData.explanation });
      return;
    }

    // Locked but answer not in RSC payload — use today's guess reveal only
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      const stored = localStorage.getItem("lastGameSolution");
      if (stored) {
        const parsed = JSON.parse(stored) as {
          answer?: string;
          explanation?: string;
          puzzleDate?: string;
        };
        if (parsed.answer && (!parsed.puzzleDate || parsed.puzzleDate === todayKey)) {
          setSolution({
            answer: parsed.answer,
            explanation: parsed.explanation || "",
          });
        }
      }
    } catch {
      // ignore
    }
  }, [gameData.answer, gameData.explanation, gameData.locked]);

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
            const response = await fetch("/api/user/stats");
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
            if (storedData && stats.percentiles) {
              const parsed = JSON.parse(storedData) as CompletionData;
              const userTime = parsed.timeTaken;
              // Approximate "faster than X%" from aggregate percentile buckets
              let pct = 50;
              if (userTime <= stats.percentiles.p25) pct = 75;
              else if (userTime <= stats.percentiles.p50) pct = 50;
              else if (userTime <= stats.percentiles.p75) pct = 25;
              else pct = 10;
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

  // Prefer server-locked success; URL param is cosmetic only when locked
  const success = Boolean(gameData.locked) && params.success === "true";
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

  // Server lock required — no spoofing via query params / stale localStorage
  if (!gameData.locked) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Play today&apos;s puzzle</h1>
          <p className="text-muted-foreground text-sm">
            Results unlock after you finish today&apos;s puzzle.
          </p>
          <Link href="/">
            <Button className="w-full">Go to puzzle</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {success && showConfetti && <Confetti />}

      <div className="mx-auto max-w-lg px-4 py-8 md:py-12">
        {success ? (
          /* SUCCESS STATE - Minimal & Clean */
          <div className="space-y-8 fade-in-up">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-2">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" strokeWidth={3} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Solved</h1>
              <p className="text-muted-foreground">You got today's puzzle</p>
            </div>

            {/* Answer */}
            <div className="text-center py-6 border-y border-border">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                The Answer
              </p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">
                {solution.answer}
              </h2>
              {solution.explanation && (
                <p className="mt-4 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {solution.explanation}
                </p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-foreground tabular-nums">{attempts}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {attempts === 1 ? "Attempt" : "Attempts"}
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground tabular-nums">
                  {displayScore}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Points</div>
              </div>
              <div>
                <div className="text-3xl font-bold tabular-nums flex items-center justify-center gap-1">
                  {streak > 0 ? (
                    <>
                      <span className="text-orange-500">{streak}</span>
                      <Flame className="h-5 w-5 text-orange-500" />
                    </>
                  ) : (
                    <span className="text-foreground">0</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Streak</div>
              </div>
            </div>

            {/* Global Comparison Badge - Social proof */}
            {percentile !== null && percentile > 50 && (
              <div className="flex items-center justify-center gap-2 rounded-full bg-green-100 dark:bg-green-900/30 px-4 py-2 animate-in fade-in-50 duration-500">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Faster than {percentile}% of players today
                </span>
              </div>
            )}

            {/* Guess History */}
            {completionData?.guessHistory && completionData.guessHistory.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground text-center">
                  Your Guesses
                </p>
                <div className="space-y-2">
                  {completionData.guessHistory.map((attempt, index) => {
                    const isWinning = index === completionData.guessHistory.length - 1;
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-colors",
                          isWinning ? "bg-green-50 dark:bg-green-950/30" : "bg-muted/50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                            isWinning
                              ? "bg-green-500 text-white"
                              : "bg-muted-foreground/20 text-muted-foreground"
                          )}
                        >
                          {isWinning ? <Check className="h-3.5 w-3.5" /> : attempt.attemptNumber}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {attempt.wordResults.map((result, wordIndex) => (
                            <span
                              key={wordIndex}
                              className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium uppercase",
                                result.correct
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
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
              answer={solution.answer}
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
                  Tips & Tricks
                </Button>
              </Link>
            </div>

            {/* Countdown */}
            <div className="text-center pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Next puzzle in</p>
              <CountdownTimer />
            </div>
          </div>
        ) : (
          /* FAILURE STATE - Minimal & Clean */
          <div className="space-y-8 fade-in-up">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-2">
                <X className="h-8 w-8 text-muted-foreground" strokeWidth={2} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Not quite</h1>
              <p className="text-muted-foreground">Better luck tomorrow</p>
            </div>

            {/* Answer */}
            <div className="text-center py-6 border-y border-border">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                The Answer Was
              </p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">
                {solution.answer}
              </h2>
              {solution.explanation && (
                <p className="mt-4 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {solution.explanation}
                </p>
              )}
            </div>

            {/* Guess History */}
            {completionData?.guessHistory && completionData.guessHistory.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground text-center">
                  Your Attempts
                </p>
                <div className="space-y-2">
                  {completionData.guessHistory.map((attempt, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                        {attempt.attemptNumber}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {attempt.wordResults.map((result, wordIndex) => (
                          <span
                            key={wordIndex}
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium uppercase",
                              result.correct
                                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
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
            <div className="text-center py-4 px-6 rounded-xl bg-muted/50 border border-border">
              <p className="text-sm text-foreground font-medium mb-1">
                Every puzzle makes you sharper
              </p>
              <p className="text-xs text-muted-foreground">
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
                  Tips & Tricks
                </Button>
              </Link>
            </div>

            {/* Countdown */}
            <div className="text-center pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Next puzzle in</p>
              <CountdownTimer />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
