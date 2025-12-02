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
    const iconClass = "h-5 w-5";
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
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/60 backdrop-blur-sm",
        "transition-opacity duration-200",
        phase === "dimming" ? "opacity-0" : "opacity-100",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Celebration"
    >
      <div className="flex flex-col items-center gap-6 p-8 text-center">
        {/* Checkmark animation */}
        <div
          className={cn(
            "rounded-full bg-green-500 p-6 text-white shadow-lg",
            "transition-all duration-500 ease-out",
            phase === "dimming" ? "scale-0 opacity-0" : "scale-100 opacity-100",
            phase === "checkmark" && "animate-bounce"
          )}
        >
          <Check className="h-16 w-16" strokeWidth={3} />
        </div>

        {/* Score display */}
        <div
          className={cn(
            "transition-all duration-500",
            ["score", "streak", "achievements", "complete"].includes(phase)
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          )}
        >
          <p className="text-lg text-white/80 font-medium mb-1">Score</p>
          <p className="text-6xl font-bold text-white tabular-nums">{displayScore}</p>
        </div>

        {/* Lucky Solve / Daily Bonus indicator */}
        {(isLuckySolve || (dailyBonusMultiplier && dailyBonusMultiplier > 1)) && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2",
              "transition-all duration-500",
              ["score", "streak", "achievements", "complete"].includes(phase)
                ? "translate-y-0 opacity-100 scale-100"
                : "translate-y-4 opacity-0 scale-95",
              isLuckySolve
                ? "bg-gradient-to-r from-purple-500 to-pink-500"
                : "bg-gradient-to-r from-amber-400 to-orange-500"
            )}
          >
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
            <div className="text-white">
              <span className="font-bold text-sm">
                {isLuckySolve ? "Lucky Solve!" : "Bonus Day!"}
              </span>
              <span className="text-xs ml-2 opacity-90">
                {isLuckySolve ? "2x" : `${dailyBonusMultiplier}x`} points!
              </span>
            </div>
          </div>
        )}

        {/* Streak display */}
        {streak > 0 && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-full bg-orange-500/90 px-6 py-3 text-white",
              "transition-all duration-500",
              ["streak", "achievements", "complete"].includes(phase)
                ? "translate-y-0 opacity-100 scale-100"
                : "translate-y-4 opacity-0 scale-95",
              phase === "streak" && "animate-pulse"
            )}
          >
            <Flame className="h-6 w-6" />
            <span className="text-xl font-bold">{streak} Day Streak!</span>
          </div>
        )}

        {/* Attempts info */}
        <p
          className={cn(
            "text-white/70 text-sm",
            "transition-all duration-500",
            ["streak", "achievements", "complete"].includes(phase) ? "opacity-100" : "opacity-0"
          )}
        >
          Solved in {attempts} of {maxAttempts} attempts
          {timeTaken !== undefined && ` • ${formatTime(timeTaken)}`}
        </p>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div
            className={cn(
              "space-y-2 w-full max-w-xs",
              "transition-all duration-500",
              phase === "achievements" || phase === "complete" ? "opacity-100" : "opacity-0"
            )}
          >
            <p className="text-white/60 text-xs uppercase tracking-wide mb-3">
              Achievements Unlocked
            </p>
            {achievements.slice(0, visibleAchievements).map((achievement, index) => (
              <div
                key={achievement.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3",
                  "transform transition-all duration-300",
                  "animate-slideIn"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500 text-white">
                  {getAchievementIcon(achievement.icon)}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">{achievement.name}</p>
                  <p className="text-xs text-white/60">{achievement.description}</p>
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
 *
 * Note: The signature is kept compatible but now includes difficulty bonus internally
 */
export { calculateGamePoints as calculateScore } from "@/lib/gameSettings";

/**
 * Determine earned achievements based on performance
 */
export function determineAchievements(
  attempts: number,
  maxAttempts: number,
  timeTaken?: number,
  streak?: number,
  usedHints?: boolean
): Achievement[] {
  const achievements: Achievement[] = [];

  // First Solve (would need to track this in user data)
  // Not implemented here - needs backend check

  // Perfect Solve - first attempt
  if (attempts === 1) {
    achievements.push({
      id: "perfect",
      name: "Perfect!",
      description: "Solved on the first attempt",
      icon: "star",
    });
  }

  // Speed Demon - under 30 seconds
  if (timeTaken !== undefined && timeTaken < 30) {
    achievements.push({
      id: "speed-demon",
      name: "Speed Demon",
      description: "Solved in under 30 seconds",
      icon: "zap",
    });
  }

  // Clutch - last attempt
  if (attempts === maxAttempts) {
    achievements.push({
      id: "clutch",
      name: "Clutch!",
      description: "Solved on the last attempt",
      icon: "trophy",
    });
  }

  // No Hints
  if (usedHints === false) {
    achievements.push({
      id: "no-hints",
      name: "Pure Skill",
      description: "Solved without using hints",
      icon: "star",
    });
  }

  // Streak achievements
  if (streak && streak >= 7) {
    achievements.push({
      id: "week-streak",
      name: "Perfect Week",
      description: "7-day solving streak!",
      icon: "flame",
    });
  }

  return achievements;
}
