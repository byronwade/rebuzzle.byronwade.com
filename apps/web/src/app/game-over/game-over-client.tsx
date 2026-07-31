"use client";

import { Check, Flame, TrendingUp, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Confetti } from "@/components/Confetti";
import { CountdownTimer } from "@/components/CountdownTimer";
import { EnhancedShareButton } from "@/components/EnhancedShareButton";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { consumeJustSolvedSessionFlag } from "@/lib/game/game-over-href";
import { calculateGamePoints, gameSettings } from "@/lib/gameSettings";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface GameData {
  answer: string;
  explanation: string;
  difficulty: number;
  puzzleType?: string;
  locked?: boolean;
  puzzleId?: string;
  metadata?: {
    puzzleType?: string;
  };
}

type PerceptionChoice = "too_easy" | "just_right" | "too_hard";

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
  const { userId, isGuest, isAuthenticated, isLoading: authLoading } = useAuth();
  const showSignupCta = !authLoading && (!isAuthenticated || isGuest || !userId);
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  // Global comparison stats
  const [percentile, setPercentile] = useState<number | null>(null);
  const [todaySolves, setTodaySolves] = useState<number | null>(null);
  const [perception, setPerception] = useState<PerceptionChoice | null>(null);
  const [perceptionSaving, setPerceptionSaving] = useState(false);

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

  useEffect(() => {
    const puzzleId = gameData.puzzleId;
    if (!puzzleId || typeof window === "undefined") return;
    try {
      const key = `difficultyPerception:${puzzleId}`;
      const stored = localStorage.getItem(key);
      if (
        stored === "too_easy" ||
        stored === "just_right" ||
        stored === "too_hard"
      ) {
        setPerception(stored);
      }
    } catch {
      // ignore
    }
  }, [gameData.puzzleId]);

  async function submitPerception(choice: PerceptionChoice) {
    const puzzleId =
      gameData.puzzleId ||
      (() => {
        try {
          const stored = localStorage.getItem("lastGameSolution");
          if (!stored) return "";
          const parsed = JSON.parse(stored) as { puzzleId?: string };
          return parsed.puzzleId || "";
        } catch {
          return "";
        }
      })();

    if (!puzzleId || perceptionSaving || perception) return;
    setPerceptionSaving(true);
    setPerception(choice);
    try {
      localStorage.setItem(`difficultyPerception:${puzzleId}`, choice);
      await fetch("/api/puzzles/difficulty-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId,
          perception: choice,
          solved: success,
          timeSpentSeconds: typeof timeTaken === "number" ? timeTaken : 0,
          hintsUsed: completionData?.usedHints ?? 0,
          attemptNumber: attempts,
        }),
      });
    } catch {
      // Non-blocking — local selection still stands
    } finally {
      setPerceptionSaving(false);
    }
  }

  const finalScore = success
    ? completionData?.score || calculateGamePoints(attempts, timeTaken ?? 0, streak, difficulty)
    : 0;

  // Animate score counter; skip confetti/haptics if we just celebrated in-thread
  useEffect(() => {
    if (!success || loading || animationComplete) return;

    const alreadyCelebrated = consumeJustSolvedSessionFlag();
    if (!alreadyCelebrated) {
      setShowConfetti(true);
      haptics.celebration();
    }

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
                {solution.answer}
              </h2>
              {solution.explanation && (
                <p className="mx-auto mt-5 max-w-sm text-balance text-muted-foreground text-sm leading-6">
                  {solution.explanation}
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

            {/* Difficulty perception — feeds self-learning */}
            <div className="space-y-3 text-center">
              <p className="eyebrow">How did it feel?</p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "too_easy", label: "Too easy" },
                    { id: "just_right", label: "Just right" },
                    { id: "too_hard", label: "Too hard" },
                  ] as const
                ).map((option) => {
                  const selected = perception === option.id;
                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant="outline"
                      disabled={Boolean(perception) || perceptionSaving}
                      onClick={() => void submitPerception(option.id)}
                      className={cn(
                        "h-auto py-3 text-xs sm:text-sm",
                        selected && "border-foreground bg-inset"
                      )}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
              {perception && (
                <p className="text-muted-foreground text-xs">Thanks — this tunes tomorrow&apos;s puzzle</p>
              )}
            </div>

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
                  Tips
                </Button>
              </Link>
            </div>

            {/* Guest → account CTA (after play, never blocks the win) */}
            {showSignupCta && (
              <div className="rounded-xl border border-border bg-inset px-5 py-5 text-center space-y-3">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5">
                  <UserPlus className="h-4 w-4 text-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground text-sm">Keep your streak going</p>
                  <p className="text-muted-foreground text-xs leading-5">
                    Create a free account to save progress across devices. You already played as a
                    guest — signing up won&apos;t lose today&apos;s solve.
                  </p>
                </div>
                <Link href="/signup" className="block">
                  <Button className="w-full">Create a free account</Button>
                </Link>
                <p className="text-muted-foreground text-xs">
                  Already have one?{" "}
                  <Link
                    className="text-foreground underline-offset-2 hover:underline"
                    href="/login"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            )}

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
                {solution.answer}
              </h2>
              {solution.explanation && (
                <p className="mx-auto mt-5 max-w-sm text-balance text-muted-foreground text-sm leading-6">
                  {solution.explanation}
                </p>
              )}
            </div>

            {/* Difficulty perception — still valuable on losses */}
            <div className="space-y-3 text-center">
              <p className="eyebrow">How did it feel?</p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "too_easy", label: "Too easy" },
                    { id: "just_right", label: "Just right" },
                    { id: "too_hard", label: "Too hard" },
                  ] as const
                ).map((option) => {
                  const selected = perception === option.id;
                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant="outline"
                      disabled={Boolean(perception) || perceptionSaving}
                      onClick={() => void submitPerception(option.id)}
                      className={cn(
                        "h-auto py-3 text-xs sm:text-sm",
                        selected && "border-foreground bg-inset"
                      )}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
              {perception && (
                <p className="text-muted-foreground text-xs">Thanks — this tunes tomorrow&apos;s puzzle</p>
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
