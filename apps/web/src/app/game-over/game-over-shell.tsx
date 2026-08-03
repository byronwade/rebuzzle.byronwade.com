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


import { GameOverShellLower } from "./game-over-shell-lower";

export function GameOverShell(props: Record<string, any>) {
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
  if (!gameData.locked) {
      return (
    <>

      <Layout>
        <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Play today&apos;s puzzle</h1>
          <p className="text-muted-foreground text-sm">
            Results unlock after you finish today&apos;s puzzle.
          </p>
          <Button asChild className="w-full">
                  <Link href="/" prefetch>
                    Go to puzzle
                  </Link>
                </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {success && showConfetti && <Confetti />}
      <GameOverShellLower {...props} />
    </>
  );
}
