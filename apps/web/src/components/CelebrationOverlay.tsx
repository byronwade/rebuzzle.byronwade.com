"use client";

import { Check, Clock, Flame, Sparkles, Star, Trophy, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: "trophy" | "star" | "zap" | "clock" | "flame";
}

interface CelebrationOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Final score to display */
  score: number;
  /** Current streak count */
  streak: number;
  /** Number of attempts used */
  attempts: number;
  /** Maximum attempts allowed */
  maxAttempts: number;
  /** Time taken to solve (in seconds) */
  timeTaken?: number;
  /** Achievements earned */
  achievements?: Achievement[];
  /** Callback when celebration animation completes */
  onComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Lucky solve bonus (variable reward) */
  isLuckySolve?: boolean;
  /** Daily bonus multiplier */
  dailyBonusMultiplier?: number;
}

/**
 * Full-screen celebration overlay for puzzle completion
 * Shows animated score, streak, and achievements
 */
export function CelebrationOverlay({
  isVisible,
  score,
  streak,
  attempts,
  maxAttempts,
  timeTaken,
  achievements = [],
  onComplete,
  className,
  isLuckySolve = false,
  dailyBonusMultiplier,
}: CelebrationOverlayProps) {
  const [phase, setPhase] = useState<
    "dimming" | "checkmark" | "score" | "streak" | "achievements" | "complete"
  >("dimming");
  const [displayScore, setDisplayScore] = useState(0);
  const [visibleAchievements, setVisibleAchievements] = useState<number>(0);
  const [hasAnimatedScore, setHasAnimatedScore] = useState(false);

  // Animation sequence
  useEffect(() => {
    if (!isVisible) {
      setPhase("dimming");
      setDisplayScore(0);
      setVisibleAchievements(0);
      setHasAnimatedScore(false);
      return;
    }

    // Start celebration haptic
    haptics.celebration();

    const timeline = [
      { phase: "checkmark" as const, delay: 200 },
      { phase: "score" as const, delay: 600 },
      { phase: "streak" as const, delay: 1200 },
      { phase: "achievements" as const, delay: 1800 },
      { phase: "complete" as const, delay: 2400 + achievements.length * 300 },
    ];

    const timeouts: NodeJS.Timeout[] = [];
    let isMounted = true;

    timeline.forEach(({ phase, delay }) => {
      const timeout = setTimeout(() => {
        if (isMounted) setPhase(phase);
      }, delay);
      timeouts.push(timeout);
    });

    // Complete callback
    if (onComplete) {
      const completeTimeout = setTimeout(
        () => {
          if (isMounted) onComplete();
        },
        3000 + achievements.length * 300
      );
      timeouts.push(completeTimeout);
    }

    return () => {
      isMounted = false;
      timeouts.forEach(clearTimeout);
    };
  }, [isVisible, achievements.length, onComplete]);

  // Animate score counter - only runs once when phase first becomes "score"
  useEffect(() => {
    // Only start animation when we first enter the score phase
    if (phase !== "score" || hasAnimatedScore) {
      return;
    }

    setHasAnimatedScore(true);

    const duration = 500;
    const steps = 20;
    const increment = score / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [phase, score, hasAnimatedScore]);

  // Animate achievements appearing
  useEffect(() => {
    if (phase !== "achievements" && phase !== "complete") return;

    const intervals: NodeJS.Timeout[] = [];
    achievements.forEach((_, index) => {
      const timeout = setTimeout(() => {
        setVisibleAchievements(index + 1);
        haptics.success();
      }, index * 300);
      intervals.push(timeout);
    });

    return () => intervals.forEach(clearTimeout);
  }, [phase, achievements]);

  const getAchievementIcon = useCallback((iconType: Achievement["icon"]) => {
    const iconClass = "h-4 w-4";
    switch (iconType) {
      case "trophy":
        return <Trophy className={iconClass} />;
      case "star":
        return <Star className={iconClass} />;
      case "zap":
        return <Zap className={iconClass} />;
      case "clock":
        return <Clock className={iconClass} />;
      case "flame":
        return <Flame className={iconClass} />;
      default:
        return <Star className={iconClass} />;
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div
      aria-label="Celebration"
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center overflow-hidden",
        // Polarity-flipped band: the win screen is the page's dark section.
        "bg-[#0a0a0a]",
        "transition-opacity duration-200",
        phase === "dimming" ? "opacity-0" : "opacity-100",
        className
      )}
      role="dialog"
    >
      {/* The brand mesh, at hero scale — the only decoration on this screen */}
      <div
        aria-hidden
        className="mesh-gradient pointer-events-none absolute -top-1/4 left-1/2 h-[720px] w-[1100px] -translate-x-1/2 opacity-30 blur-[90px] motion-safe:animate-mesh-drift"
      />

      <div className="relative flex flex-col items-center gap-7 px-6 py-8 text-center">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#0a0a0a]",
            "transition-all duration-500 ease-out",
            phase === "dimming" ? "scale-90 opacity-0" : "scale-100 opacity-100"
          )}
        >
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </div>

        <div
          className={cn(
            "transition-all duration-500",
            ["score", "streak", "achievements", "complete"].includes(phase)
              ? "translate-y-0 opacity-100"
              : "translate-y-3 opacity-0"
          )}
        >
          <p className="font-mono text-[11px] text-white/50 uppercase tracking-[0.14em]">Score</p>
          <p className="mt-2 font-semibold text-6xl text-white tracking-[-0.05em] tabular-nums">
            {displayScore}
          </p>
        </div>

        {(isLuckySolve || (dailyBonusMultiplier && dailyBonusMultiplier > 1)) && (
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur-sm",
              "transition-all duration-500",
              ["score", "streak", "achievements", "complete"].includes(phase)
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-3 scale-95 opacity-0"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-white/70" />
            <span className="font-medium text-sm text-white">
              {isLuckySolve ? "Lucky solve" : "Bonus day"}
            </span>
            <span className="font-mono text-white/50 text-xs">
              {isLuckySolve ? "2x" : `${dailyBonusMultiplier}x`}
            </span>
          </div>
        )}

        {streak > 0 && (
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur-sm",
              "transition-all duration-500",
              ["streak", "achievements", "complete"].includes(phase)
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-3 scale-95 opacity-0"
            )}
          >
            <Flame className="h-3.5 w-3.5 text-white/70" />
            <span className="font-medium text-sm text-white">{streak} day streak</span>
          </div>
        )}

        <p
          className={cn(
            "font-mono text-white/45 text-xs tabular-nums",
            "transition-opacity duration-500",
            ["streak", "achievements", "complete"].includes(phase) ? "opacity-100" : "opacity-0"
          )}
        >
          Solved in {attempts} of {maxAttempts} attempts
          {timeTaken !== undefined && ` · ${formatTime(timeTaken)}`}
        </p>

        {achievements.length > 0 && (
          <div
            className={cn(
              "w-full max-w-sm space-y-2",
              "transition-opacity duration-500",
              phase === "achievements" || phase === "complete" ? "opacity-100" : "opacity-0"
            )}
          >
            <p className="mb-3 font-mono text-[11px] text-white/45 uppercase tracking-[0.14em]">
              Achievements unlocked
            </p>
            {achievements.slice(0, visibleAchievements).map((achievement) => (
              <div
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
                key={achievement.id}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                  {getAchievementIcon(achievement.icon)}
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">{achievement.name}</p>
                  <p className="text-white/45 text-xs">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format seconds to readable time
 */
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Calculate score based on performance
 * Re-exports the unified scoring function from gameSettings for backwards compatibility
 */
export { calculateGamePoints as calculateScore } from "@/lib/gameSettings";

export { determineAchievements } from "@/lib/game/celebration-achievements";
