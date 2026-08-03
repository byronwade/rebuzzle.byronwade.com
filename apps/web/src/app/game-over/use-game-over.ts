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


export function useGameOver(props: any = {}) {
  const { gameData, searchParams = props;
 gameData, searchParams: params }: GameOverClientProps) {
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
  const [qualityVote, setQualityVote] = useState<QualityVote | null>(null);
  const [qualityVoteSaving, setQualityVoteSaving] = useState(false);
  const [qualityReasons, setQualityReasons] = useState<QualityReason[]>([]);
  const [playtestEligible, setPlaytestEligible] = useState(false);

  const storedSolution = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        const raw =
          localStorage.getItem("lastGameSolution:v1") ?? localStorage.getItem("lastGameSolution");
        if (!raw) return null;
        const todayKey = new Date().toISOString().slice(0, 10);
        const parsed = JSON.parse(raw) as {
          answer?: string;
          explanation?: string;
          puzzleDate?: string;
        };
        if (parsed.answer && (!parsed.puzzleDate || parsed.puzzleDate === todayKey)) {
          return { answer: parsed.answer, explanation: parsed.explanation || "" };
        }
      } catch {}
      return null;
    },
    () => null
  );

  const solution = !gameData.locked
    ? { answer: "", explanation: "" }
    : gameData.answer
      ? { answer: gameData.answer, explanation: gameData.explanation || "" }
      : (storedSolution ?? { answer: "", explanation: "" });

  useEffect(() => {
    if (authLoading || !isAuthenticated || isGuest || !userId) {
      setPlaytestEligible(false);
      return;
    }
    const controller = new AbortController();
    void fetch("/api/puzzle-playtests?mode=eligibility", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!controller.signal.aborted) setPlaytestEligible(response.ok);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlaytestEligible(false);
      });
    return () => controller.abort();
  }, [authLoading, isAuthenticated, isGuest, userId]);

  useEffect(() => {
    async function loadClientExtras() {
      // Load completion data from localStorage
      try {
        const storedData = (localStorage.getItem("lastGameCompletion:v1") ?? localStorage.getItem("lastGameCompletion"));
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

          const storedData = (localStorage.getItem("lastGameCompletion:v1") ?? localStorage.getItem("lastGameCompletion"));
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

      setLoading(false);
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

  function resolvePuzzleId(): string {
    if (gameData.puzzleId) return gameData.puzzleId;
    try {
      const stored = (localStorage.getItem("lastGameSolution:v1") ?? localStorage.getItem("lastGameSolution"));
      if (!stored) return "";
      const parsed = JSON.parse(stored) as { puzzleId?: string };
      return parsed.puzzleId || "";
    } catch {
      return "";
    }
  }

  useEffect(() => {
    const puzzleId = gameData.puzzleId;
    if (!puzzleId || typeof window === "undefined") return;
    try {
      const key = `difficultyPerception:${puzzleId}`;
      const stored = localStorage.getItem(key);
      if (stored === "too_easy" || stored === "just_right" || stored === "too_hard") {
        setPerception(stored);
      }
      const qualityKey = `puzzleQualityVote:${puzzleId}`;
      const qualityStored = localStorage.getItem(qualityKey);
      if (qualityStored === "like" || qualityStored === "dislike") {
        setQualityVote(qualityStored);
      }
      const reasonStored = localStorage.getItem(`puzzleQualityReasons:${puzzleId}`);
      if (reasonStored) {
        const parsed = JSON.parse(reasonStored) as unknown;
        if (Array.isArray(parsed)) {
          setQualityReasons(
            parsed.filter((reason): reason is QualityReason =>
              QUALITY_REASON_OPTIONS.some((option) => option.id === reason)
            )
          );
        }
      }
    } catch {
      // ignore
    }
  }, [gameData.puzzleId]);

  async function submitPerception(choice: PerceptionChoice) {
    const puzzleId = resolvePuzzleId();

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
    }
    setPerceptionSaving(false);

  }

  async function submitQualityVote(vote: QualityVote, reasons: QualityReason[] = []) {
    const puzzleId = resolvePuzzleId();
    if (!puzzleId || qualityVoteSaving) return;
    setQualityVoteSaving(true);
    setQualityVote(vote);
    const nextReasons = vote === "dislike" ? reasons : [];
    setQualityReasons(nextReasons);
    try {
      localStorage.setItem(`puzzleQualityVote:${puzzleId}`, vote);
      localStorage.setItem(`puzzleQualityReasons:${puzzleId}`, JSON.stringify(nextReasons));
      await fetch("/api/puzzles/rating", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId,
          vote,
          reasons: nextReasons,
          source: "game_over",
          solved: success,
          timeSpentSeconds: typeof timeTaken === "number" ? timeTaken : 0,
          hintsUsed: completionData?.usedHints ?? 0,
          attemptNumber: attempts,
        }),
      });
    } catch {
      // Non-blocking — local selection still stands
    }
    setQualityVoteSaving(false);

  }

  function toggleQualityReason(reason: QualityReason) {
    const next = qualityReasons.includes(reason)
      ? qualityReasons.filter((candidate) => candidate !== reason)
      : [...qualityReasons, reason];
    void submitQualityVote("dislike", next);
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

  return {
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
  };
}
