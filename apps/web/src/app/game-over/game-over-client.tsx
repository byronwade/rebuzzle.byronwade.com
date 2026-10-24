"use client";

import {
  ArrowRight,
  Check,
  Flame,
  FlaskConical,
  Lock,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import { Confetti } from "@/components/Confetti";
import { CountdownTimer } from "@/components/CountdownTimer";
import { EnhancedShareButton } from "@/components/EnhancedShareButton";
import Layout from "@/components/Layout";
import { StatusPage } from "@/components/StatusPage";
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
      <div className="flex flex-wrap gap-1.5">
        {QUALITY_REASON_OPTIONS.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => onToggle(option.id)}
            className={cn(
              "h-11 rounded-full px-3 text-xs sm:h-8",
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

type StoredFeedback = {
  perception: PerceptionChoice | null;
  qualityVote: QualityVote | null;
  qualityReasons: QualityReason[];
};

const EMPTY_FEEDBACK: StoredFeedback = { perception: null, qualityVote: null, qualityReasons: [] };

/**
 * useSyncExternalStore compares snapshots by identity, so a getter that
 * builds a fresh object each call re-renders forever. Hand back the previous
 * object while its serialized value is unchanged.
 */
const snapshotCache = new Map<string, { json: string; value: unknown }>();
function stableSnapshot<T>(slot: string, value: T): T {
  const json = JSON.stringify(value);
  const cached = snapshotCache.get(slot);
  if (cached && cached.json === json) return cached.value as T;
  snapshotCache.set(slot, { json, value });
  return value;
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
  const [perceptionOverride, setPerception] = useState<PerceptionChoice | null>(null);
  const [perceptionSaving, setPerceptionSaving] = useState(false);
  const [qualityVoteOverride, setQualityVote] = useState<QualityVote | null>(null);
  const [qualityVoteSaving, setQualityVoteSaving] = useState(false);
  const [qualityReasonsOverride, setQualityReasons] = useState<QualityReason[] | null>(null);
  const [fetchedPlaytestEligible, setFetchedPlaytestEligible] = useState(false);
  const canCheckPlaytest = !authLoading && isAuthenticated && !isGuest && Boolean(userId);
  const playtestEligible = canCheckPlaytest && fetchedPlaytestEligible;

  const puzzleFeedbackKey = gameData.puzzleId || "";
  const storedFeedback = useSyncExternalStore(
    (onStoreChange) => {
      const onStorage = (e: StorageEvent) => {
        if (
          e.key === null ||
          (puzzleFeedbackKey &&
            (e.key === `difficultyPerception:${puzzleFeedbackKey}` ||
              e.key === `puzzleQualityVote:${puzzleFeedbackKey}` ||
              e.key === `puzzleQualityReasons:${puzzleFeedbackKey}`))
        ) {
          onStoreChange();
        }
      };
      const onCustom = () => onStoreChange();
      window.addEventListener("storage", onStorage);
      window.addEventListener("rebuzzle:game-over-feedback", onCustom);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("rebuzzle:game-over-feedback", onCustom);
      };
    },
    (): StoredFeedback => {
      if (!puzzleFeedbackKey) {
        return EMPTY_FEEDBACK;
      }
      try {
        const stored = localStorage.getItem(`difficultyPerception:${puzzleFeedbackKey}`);
        const perception =
          stored === "too_easy" || stored === "just_right" || stored === "too_hard" ? stored : null;
        const qualityStored = localStorage.getItem(`puzzleQualityVote:${puzzleFeedbackKey}`);
        const qualityVote =
          qualityStored === "like" || qualityStored === "dislike" ? qualityStored : null;
        let qualityReasons: QualityReason[] = [];
        const reasonStored = localStorage.getItem(`puzzleQualityReasons:${puzzleFeedbackKey}`);
        if (reasonStored) {
          const parsed = JSON.parse(reasonStored) as unknown;
          if (Array.isArray(parsed)) {
            qualityReasons = parsed.filter((reason): reason is QualityReason =>
              QUALITY_REASON_OPTIONS.some((option) => option.id === reason)
            );
          }
        }
        return stableSnapshot("feedback", { perception, qualityVote, qualityReasons });
      } catch {
        return EMPTY_FEEDBACK;
      }
    },
    () => EMPTY_FEEDBACK
  );
  const perception = perceptionOverride ?? storedFeedback.perception;
  const qualityVote = qualityVoteOverride ?? storedFeedback.qualityVote;
  const qualityReasons = qualityReasonsOverride ?? storedFeedback.qualityReasons;

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
          return stableSnapshot("solution", {
            answer: parsed.answer,
            explanation: parsed.explanation || "",
          });
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
    if (!canCheckPlaytest) return;
    const controller = new AbortController();
    void fetch("/api/puzzle-playtests?mode=eligibility", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!controller.signal.aborted) setFetchedPlaytestEligible(response.ok);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFetchedPlaytestEligible(false);
      });
    return () => controller.abort();
  }, [canCheckPlaytest]);

  useEffect(() => {
    async function loadClientExtras() {
      // Load completion data from localStorage once
      let completionRaw: string | null = null;
      let parsedCompletion: CompletionData | null = null;
      try {
        completionRaw =
          localStorage.getItem("lastGameCompletion:v1") ??
          localStorage.getItem("lastGameCompletion");
        if (completionRaw) {
          parsedCompletion = JSON.parse(completionRaw) as CompletionData;
          setCompletionData(parsedCompletion);
          if (parsedCompletion.streak) {
            setStreak(parsedCompletion.streak);
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

          if (parsedCompletion && stats.percentiles) {
            const userTime = parsedCompletion.timeTaken;
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
      const stored =
        localStorage.getItem("lastGameSolution:v1") ?? localStorage.getItem("lastGameSolution");
      if (!stored) return "";
      const parsed = JSON.parse(stored) as { puzzleId?: string };
      return parsed.puzzleId || "";
    } catch {
      return "";
    }
  }

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
      // react-doctor-disable-next-line react-hooks-js/set-state-in-effect -- one-shot celebration kickoff after solve
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
        <StatusPage
          actions={
            <>
              <Button asChild size="lg">
                <Link href="/">Play today&apos;s puzzle</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/leaderboard">See the leaderboard</Link>
              </Button>
            </>
          }
          description="Results, the answer and your stats show up here once you finish today's puzzle."
          eyebrow="Results"
          icon={Lock}
          title="Solve it first."
        />
      </Layout>
    );
  }

  const guessHistory = completionData?.guessHistory ?? [];

  return (
    <Layout>
      {success && showConfetti && <Confetti />}

      <div className="fade-in-up mx-auto max-w-lg space-y-8 px-4 py-12 md:py-16">
        <h1 className="sr-only">{success ? "Puzzle solved" : "Puzzle not solved"}</h1>

        {/* Verdict + answer: one card so the answer reads as the result, not a separate block */}
        <section className="overflow-hidden rounded-xl border border-border bg-card text-center shadow-sm">
          <div className="px-6 pt-8 pb-7">
            <div
              className={cn(
                "mx-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-xs",
                success
                  ? "border-success/25 bg-success/10 text-success"
                  : "border-border bg-inset text-muted-foreground"
              )}
            >
              {success ? (
                <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              {success
                ? `Solved in ${attempts} ${attempts === 1 ? "guess" : "guesses"}`
                : "Not this time"}
            </div>
            <p className="eyebrow mt-6">{success ? "Today's answer" : "The answer was"}</p>
            <h2 className="mt-2 text-balance font-semibold text-4xl text-foreground tracking-[-0.045em] md:text-5xl">
              {solution.answer}
            </h2>
            {solution.explanation && (
              <p className="mx-auto mt-4 max-w-sm text-pretty text-muted-foreground text-sm leading-6">
                {solution.explanation}
              </p>
            )}
          </div>

          {success ? (
            <dl className="grid grid-cols-3 divide-x divide-border border-border border-t bg-inset/60 py-4">
              <div className="flex flex-col-reverse gap-1">
                <dt className="text-subtle text-xs">{attempts === 1 ? "Guess" : "Guesses"}</dt>
                <dd className="font-semibold text-2xl text-foreground tabular-nums tracking-[-0.04em]">
                  {attempts}
                </dd>
              </div>
              <div className="flex flex-col-reverse gap-1">
                <dt className="text-subtle text-xs">Points</dt>
                <dd className="font-semibold text-2xl text-foreground tabular-nums tracking-[-0.04em]">
                  {displayScore}
                </dd>
              </div>
              <div className="flex flex-col-reverse gap-1">
                <dt className="text-subtle text-xs">Day streak</dt>
                <dd className="flex items-center justify-center gap-1 font-semibold text-2xl tabular-nums tracking-[-0.04em]">
                  <span className={streak > 0 ? "text-warning" : "text-foreground"}>{streak}</span>
                  {streak > 0 ? <Flame aria-hidden className="h-4 w-4 text-warning" /> : null}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="border-border border-t bg-inset/60 px-6 py-4 text-muted-foreground text-sm">
              {todaySolves !== null && todaySolves > 0
                ? `${todaySolves.toLocaleString()} ${todaySolves === 1 ? "player" : "players"} solved it today. A fresh one unlocks at midnight.`
                : "A fresh puzzle unlocks at midnight."}
            </p>
          )}
        </section>

        {/* Global comparison — social proof, only when it flatters */}
        {success && percentile !== null && percentile > 50 && (
          <p className="rb-enter mx-auto flex w-fit items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3.5 py-1.5 font-medium text-sm text-success">
            <TrendingUp aria-hidden className="h-3.5 w-3.5" />
            Faster than {percentile}% of players today
          </p>
        )}

        {guessHistory.length > 0 && (
          <section className="space-y-3">
            <p className="eyebrow">Your guesses</p>
            <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {guessHistory.map((attempt, index) => {
                const isWinning = success && index === guessHistory.length - 1;
                return (
                  <li
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      isWinning && "bg-success/[0.07]"
                    )}
                    key={`guess-${attempt.attemptNumber}-${attempt.text}`}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs",
                        isWinning ? "bg-success text-background" : "bg-inset text-subtle"
                      )}
                    >
                      {isWinning ? (
                        <Check aria-hidden className="h-3 w-3" />
                      ) : (
                        attempt.attemptNumber
                      )}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {attempt.wordResults.map((result) => (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-medium text-xs",
                            result.correct
                              ? "bg-success/15 text-success"
                              : "bg-destructive/10 text-destructive"
                          )}
                          key={`${attempt.attemptNumber}-${result.word}-${result.correct}`}
                        >
                          {result.word}
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <div className="space-y-2">
          <EnhancedShareButton
            answer={solution.answer}
            attempts={attempts}
            className="w-full"
            difficulty={gameData.difficulty}
            maxAttempts={gameSettings.maxAttempts}
            puzzleType={gameData.puzzleType || gameData.metadata?.puzzleType}
            size="lg"
            streak={streak}
            success={success}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button asChild className="h-11 sm:h-9" variant="outline">
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
            <Button asChild className="h-11 sm:h-9" variant="outline">
              <Link href="/blog">Puzzle tips</Link>
            </Button>
          </div>
        </div>

        {/* Both feedback questions in one quiet panel — they feed the self-learning loop */}
        <section className="space-y-5 rounded-xl border border-border bg-card px-5 py-5">
          <div className="space-y-2.5">
            <p className="font-medium text-foreground text-sm">How did it feel?</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "too_easy", label: "Too easy" },
                  { id: "just_right", label: "Just right" },
                  { id: "too_hard", label: "Too hard" },
                ] as const
              ).map((option) => (
                <Button
                  aria-pressed={perception === option.id}
                  className={cn(
                    "h-11 text-sm sm:h-9",
                    perception === option.id && "border-foreground bg-inset"
                  )}
                  disabled={Boolean(perception) || perceptionSaving}
                  key={option.id}
                  onClick={() => void submitPerception(option.id)}
                  type="button"
                  variant="outline"
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {perception && (
              <p className="text-muted-foreground text-xs">
                Thanks, this tunes tomorrow&apos;s puzzle.
              </p>
            )}
          </div>

          <div className="space-y-2.5 border-border border-t pt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-foreground text-sm">Good puzzle?</p>
              <div className="flex gap-2">
                <Button
                  aria-label="Like this puzzle"
                  aria-pressed={qualityVote === "like"}
                  className={cn(
                    "h-11 sm:h-9",
                    qualityVote === "like" && "border-success/50 bg-success/10 text-success"
                  )}
                  disabled={qualityVoteSaving}
                  onClick={() => void submitQualityVote("like")}
                  type="button"
                  variant="outline"
                >
                  <ThumbsUp className="h-4 w-4" data-icon="inline-start" />
                  Like
                </Button>
                <Button
                  aria-label="Dislike this puzzle"
                  aria-pressed={qualityVote === "dislike"}
                  className={cn(
                    "h-11 sm:h-9",
                    qualityVote === "dislike" &&
                      "border-destructive/50 bg-destructive/10 text-destructive"
                  )}
                  disabled={qualityVoteSaving}
                  onClick={() => void submitQualityVote("dislike")}
                  type="button"
                  variant="outline"
                >
                  <ThumbsDown className="h-4 w-4" data-icon="inline-start" />
                  Dislike
                </Button>
              </div>
            </div>
            {qualityVote === "dislike" && (
              <QualityReasonPicker
                onToggle={toggleQualityReason}
                saving={qualityVoteSaving}
                selected={qualityReasons}
              />
            )}
            {qualityVote && (
              <p className="text-muted-foreground text-xs">
                Saved. Votes help Eve craft better boards.
              </p>
            )}
          </div>
        </section>

        {playtestEligible && <PlaytestInvitation />}

        {/* Guest → account CTA (after play, never blocks the result) */}
        {showSignupCta && (
          <section className="flex flex-col gap-4 rounded-xl border border-border bg-inset px-5 py-5 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/5">
                <UserPlus aria-hidden className="h-4 w-4 text-foreground" />
              </span>
              <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">Keep your streak going</p>
                <p className="text-muted-foreground text-xs leading-5">
                  Save progress across devices. Signing up keeps today&apos;s{" "}
                  {success ? "solve" : "result"}.{" "}
                  <Link
                    className="text-foreground underline-offset-2 hover:underline"
                    href="/login"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </div>
            <Button asChild className="h-11 shrink-0 sm:h-9">
              <Link href="/signup">Create account</Link>
            </Button>
          </section>
        )}

        <section className="border-border border-t pt-8 text-center">
          <p className="eyebrow mb-3">Next puzzle in</p>
          <CountdownTimer />
        </section>
      </div>
    </Layout>
  );
}
