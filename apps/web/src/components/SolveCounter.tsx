"use client";

import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SolveCounterProps {
  puzzleId?: string;
  className?: string;
}

/**
 * Live Solve Counter - Shows how many players solved today's puzzle
 *
 * Psychology: Social proof - seeing others succeed motivates engagement
 * Subtle approach: Informative, not pressuring
 */
export function SolveCounter({ puzzleId, className }: SolveCounterProps) {
  const [solveCount, setSolveCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const url = puzzleId ? `/api/puzzles/stats?puzzleId=${puzzleId}` : "/api/puzzles/stats";
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          setSolveCount(data.todaySolves || 0);
        }
      } catch (error) {
        console.error("Error fetching solve count:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh every 30 seconds for live feel
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [puzzleId]);

  // Don't show if loading or no data
  if (loading || solveCount === null) {
    return null;
  }

  // Don't show if no one has solved yet (avoid pressure)
  if (solveCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        "animate-in fade-in-50 duration-500",
        className
      )}
    >
      <Users className="h-3.5 w-3.5" />
      <span>
        {solveCount.toLocaleString()} {solveCount === 1 ? "player" : "players"} solved today
      </span>
    </div>
  );
}

/**
 * Compact version for headers or tight spaces
 */
export function SolveCounterCompact({ puzzleId, className }: SolveCounterProps) {
  const [solveCount, setSolveCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const url = puzzleId ? `/api/puzzles/stats?puzzleId=${puzzleId}` : "/api/puzzles/stats";
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          setSolveCount(data.todaySolves || 0);
        }
      } catch (error) {
        console.error("Error fetching solve count:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [puzzleId]);

  if (solveCount === null || solveCount === 0) {
    return null;
  }

  return (
    <div
      className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}
      title={`${solveCount} players solved today's puzzle`}
    >
      <Users className="h-3 w-3" />
      <span className="tabular-nums">{solveCount.toLocaleString()}</span>
    </div>
  );
}
