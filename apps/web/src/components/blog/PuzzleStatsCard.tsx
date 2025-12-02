import { BarChart3, Clock, Lightbulb, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PuzzleStatsCardProps {
  stats?: {
    solveRate: number;
    avgSolveTime: number;
    totalAttempts: number;
    hintsUsedAvg: number;
    difficultyComparison: string;
  };
  className?: string;
}

export function PuzzleStatsCard({ stats, className }: PuzzleStatsCardProps) {
  if (!stats) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const getSolveRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600 dark:text-green-400";
    if (rate >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getDifficultyBadge = (comparison: string) => {
    const colors: Record<string, string> = {
      "very challenging": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      challenging: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      average: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      accessible: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    };
    return colors[comparison] || colors.average;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="bg-muted/30 px-4 py-2 border-b">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            Puzzle Statistics
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0">
          {/* Solve Rate */}
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Target className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Solve Rate</span>
            </div>
            <p className={cn("text-2xl font-bold", getSolveRateColor(stats.solveRate))}>
              {stats.solveRate}%
            </p>
          </div>

          {/* Average Time */}
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Time</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatTime(stats.avgSolveTime)}</p>
          </div>

          {/* Total Attempts */}
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <BarChart3 className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Attempts</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalAttempts.toLocaleString()}
            </p>
          </div>

          {/* Hints Used */}
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Lightbulb className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Hints</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.hintsUsedAvg}</p>
          </div>
        </div>

        {/* Difficulty comparison */}
        <div className="px-4 py-3 border-t bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Difficulty Rating</span>
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                getDifficultyBadge(stats.difficultyComparison)
              )}
            >
              {stats.difficultyComparison}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
