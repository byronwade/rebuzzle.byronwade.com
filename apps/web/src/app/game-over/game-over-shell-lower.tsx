"use client";

import {
  ArrowRight,
  Check,
  Flame,
  FlaskConical,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  UserPlus,
  X,
} from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
type QualityVote = "like" | "dislike";
type QualityReason =
  | "unrecognizable"
  | "ambiguous"
  | "unfair"
  | "boring"
  | "bad_hints"
  | "too_easy"
  | "too_hard";

const QUALITY_REASON_OPTIONS: Array<{ id: QualityReason; label: string }> = [
  { id: "unrecognizable", label: "Couldn’t recognize it" },
  { id: "ambiguous", label: "Too ambiguous" },
  { id: "unfair", label: "Felt unfair" },
  { id: "bad_hints", label: "Hints didn’t help" },
  { id: "boring", label: "Not interesting" },
  { id: "too_easy", label: "Too easy" },
  { id: "too_hard", label: "Too hard" },
];

function QualityReasonPicker({
  selected,
  saving,
  onToggle,
}: {
  selected: QualityReason[];
  saving: boolean;
  onToggle: (reason: QualityReason) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">What should we improve?</p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {QUALITY_REASON_OPTIONS.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => onToggle(option.id)}
            className={cn(
              "h-8 rounded-full px-3 text-xs",
              selected.includes(option.id) &&
                "border-destructive/40 bg-destructive/10 text-destructive"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function PlaytestInvitation() {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-5 py-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <FlaskConical className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-foreground text-sm">Help us catch unclear puzzles</p>
          <p className="text-muted-foreground text-xs leading-5">
            Try one unlabeled test board. Your first answer helps measure whether the artwork and
            wordplay are genuinely recognizable.
          </p>
        </div>
      </div>
      <Button asChild className="mt-4 w-full" variant="outline">
        <Link href="/playtest?from=game-over">
          Review a test puzzle
          <ArrowRight data-icon="inline-end" className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
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


export function GameOverShellLower(props: Record<string, any>) {
  const {
    alreadyCelebrated,
    animationComplete,
    attempts,
    completionData,
    controller,
    current,
    difficulty,
    displayScore,
    duration,
    finalScore,
    increment,
    interval,
    key,
    loadClientExtras,
    loading,
    next,
    nextReasons,
    parsed,
    pct,
    percentile,
    perception,
    perceptionSaving,
    playtestEligible,
    puzzleId,
    qualityKey,
    qualityReasons,
    qualityStored,
    qualityVote,
    qualityVoteSaving,
    raw,
    reasonStored,
    resolvePuzzleId,
    response,
    setAnimationComplete,
    setCompletionData,
    setDisplayScore,
    setLoading,
    setPercentile,
    setPerception,
    setPerceptionSaving,
    setPlaytestEligible,
    setQualityReasons,
    setQualityVote,
    setQualityVoteSaving,
    setShowConfetti,
    setStreak,
    setTodaySolves,
    showConfetti,
    showSignupCta,
    solution,
    stats,
    statsResponse,
    steps,
    stored,
    storedData,
    storedSolution,
    streak,
    submitPerception,
    submitQualityVote,
    success,
    timeTaken,
    todayKey,
    todaySolves,
    toggleQualityReason,
    userStats,
    userTime
  } = props;
  return (
    <>

      <div className="mx-auto max-w-lg px-4 py-12 md:py-16">
        <h1 className="sr-only">{success ? "Puzzle solved" : "Puzzle not solved"}</h1>
        {success ? (
          /* SUCCESS STATE - Minimal & Clean */
          <div className="fade-in-up space-y-10">
            {/* Header */}
            <div className="space-y-3 text-center">
              <div className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-full border border-success/25 bg-success/10">
                <Check className="h-5 w-5 text-success" strokeWidth={2.5} />
              </div>
              <p className="font-semibold text-4xl text-foreground tracking-[-0.045em]">Solved</p>
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
 <div className="rb-enter  mx-auto flex w-fit items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3.5 py-1.5 ">
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
                <p className="text-muted-foreground text-xs">
                  Thanks — this tunes tomorrow&apos;s puzzle
                </p>
              )}
            </div>

            <div className="space-y-3 text-center">
              <p className="eyebrow">Did you enjoy this puzzle?</p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={qualityVoteSaving}
                  onClick={() => void submitQualityVote("like")}
                  className={cn(
                    "gap-2",
                    qualityVote === "like" && "border-success/50 bg-success/10 text-success"
                  )}
                >
                  <ThumbsUp className="h-4 w-4" data-icon="inline-start" />
                  Like
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={qualityVoteSaving}
                  onClick={() => void submitQualityVote("dislike")}
                  className={cn(
                    "gap-2",
                    qualityVote === "dislike" &&
                      "border-destructive/50 bg-destructive/10 text-destructive"
                  )}
                >
                  <ThumbsDown className="h-4 w-4" data-icon="inline-start" />
                  Dislike
                </Button>
              </div>
              {qualityVote === "dislike" && (
                <QualityReasonPicker
                  selected={qualityReasons}
                  saving={qualityVoteSaving}
                  onToggle={toggleQualityReason}
                />
              )}
              {qualityVote && (
                <p className="text-muted-foreground text-xs">
                  Saved — likes help Eve craft better boards
                </p>
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
                        key={`guess-${attempt.attemptNumber}-${attempt.text}`}
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
                          {attempt.wordResults.map((result) => (
                            <span
                              key={`${attempt.attemptNumber}-${result.word}-${result.correct}`}
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
              <Button asChild variant="outline" className="w-full">
                  <Link className="flex-1" href="/leaderboard">Leaderboard</Link>
                </Button>
              <Button asChild variant="outline" className="w-full">
                  <Link className="flex-1" href="/blog">Tips</Link>
                </Button>
            </div>

            {playtestEligible && <PlaytestInvitation />}

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
                <Button asChild className="w-full">
                  <Link href="/signup" className="block">Create a free account</Link>
                </Button>
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
              <p className="font-semibold text-4xl text-foreground tracking-[-0.045em]">
                Not quite
              </p>
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
                <p className="text-muted-foreground text-xs">
                  Thanks — this tunes tomorrow&apos;s puzzle
                </p>
              )}
            </div>

            <div className="space-y-3 text-center">
              <p className="eyebrow">Did you enjoy this puzzle?</p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={qualityVoteSaving}
                  onClick={() => void submitQualityVote("like")}
                  className={cn(
                    "gap-2",
                    qualityVote === "like" && "border-success/50 bg-success/10 text-success"
                  )}
                >
                  <ThumbsUp className="h-4 w-4" data-icon="inline-start" />
                  Like
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={qualityVoteSaving}
                  onClick={() => void submitQualityVote("dislike")}
                  className={cn(
                    "gap-2",
                    qualityVote === "dislike" &&
                      "border-destructive/50 bg-destructive/10 text-destructive"
                  )}
                >
                  <ThumbsDown className="h-4 w-4" data-icon="inline-start" />
                  Dislike
                </Button>
              </div>
              {qualityVote === "dislike" && (
                <QualityReasonPicker
                  selected={qualityReasons}
                  saving={qualityVoteSaving}
                  onToggle={toggleQualityReason}
                />
              )}
              {qualityVote && (
                <p className="text-muted-foreground text-xs">
                  Saved — likes help Eve craft better boards
                </p>
              )}
            </div>

            {/* Guess History */}
            {completionData?.guessHistory && completionData.guessHistory.length > 0 && (
              <div className="space-y-3">
                <p className="eyebrow text-center">Your Attempts</p>
                <div className="space-y-2">
                  {completionData.guessHistory.map((attempt) => (
                    <div
                      key={`attempt-${attempt.attemptNumber}-${attempt.wordResults.map((r) => r.word).join("-")}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-inset font-mono text-[10px] text-subtle">
                        {attempt.attemptNumber}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {attempt.wordResults.map((result) => (
                          <span
                            key={`${attempt.attemptNumber}-${result.word}-${result.correct}`}
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
              <Button asChild variant="outline" className="w-full">
                  <Link className="flex-1" href="/leaderboard">Leaderboard</Link>
                </Button>
              <Button asChild variant="outline" className="w-full">
                  <Link className="flex-1" href="/blog">Tips</Link>
                </Button>
            </div>

            {playtestEligible && <PlaytestInvitation />}

            {/* Countdown */}
            <div className="border-border border-t pt-6 text-center">
              <p className="eyebrow mb-2">Next puzzle in</p>
              <CountdownTimer />
            </div>
          </div>
        )}
      </div>
    </Layout>    </>
  );
}
