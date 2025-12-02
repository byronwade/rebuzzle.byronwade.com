"use client";

import { Flame, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalizedGreetingProps {
  streak: number;
  wins: number;
  level: number;
  className?: string;
}

/**
 * Personalized greeting based on user's stats and return pattern
 *
 * Psychology: Personal recognition increases engagement and return rates
 * Subtle approach: Informative and encouraging without pressure
 */
export function PersonalizedGreeting({
  streak,
  wins,
  level,
  className,
}: PersonalizedGreetingProps) {
  // Get time-based greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Determine the type of message based on user's status
  const getMessage = () => {
    // High streak user - emphasize maintaining streak
    if (streak >= 7) {
      return {
        icon: Flame,
        iconColor: "text-orange-500",
        message: `${timeGreeting}! Day ${streak} of your streak`,
        subtext: "Keep it going!",
      };
    }

    // Building a streak
    if (streak >= 3) {
      return {
        icon: Flame,
        iconColor: "text-orange-400",
        message: `${timeGreeting}! ${streak}-day streak`,
        subtext: "You're on fire!",
      };
    }

    // New streak starting
    if (streak === 1) {
      return {
        icon: Sparkles,
        iconColor: "text-purple-500",
        message: `${timeGreeting}! Streak started`,
        subtext: "Come back tomorrow to keep it going",
      };
    }

    // Level milestone
    if (level >= 10 && wins > 0) {
      return {
        icon: Trophy,
        iconColor: "text-amber-500",
        message: `${timeGreeting}! Level ${level}`,
        subtext: `${wins} puzzles solved`,
      };
    }

    // Returning player (no streak but has history)
    if (wins > 0) {
      return {
        icon: Sparkles,
        iconColor: "text-blue-500",
        message: `${timeGreeting}! Welcome back`,
        subtext: "Fresh puzzle awaits",
      };
    }

    // New player
    return {
      icon: Sparkles,
      iconColor: "text-purple-500",
      message: `${timeGreeting}!`,
      subtext: "Ready for today's puzzle?",
    };
  };

  const { icon: Icon, iconColor, message, subtext } = getMessage();

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        "animate-in fade-in-50 duration-500",
        className
      )}
    >
      <Icon className={cn("h-4 w-4", iconColor)} />
      <span>
        <span className="font-medium text-foreground">{message}</span>
        {subtext && <span className="text-muted-foreground"> · {subtext}</span>}
      </span>
    </div>
  );
}
