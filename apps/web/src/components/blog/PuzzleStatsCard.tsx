import { BarChart3, Clock, Lightbulb, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

/** Difficulty bands map onto the system's three semantic tones — nothing else. */
const DIFFICULTY_VARIANTS: Record<string, "destructive" | "warning" | "success" | "secondary"> = {
  "very challenging": "destructive",
  challenging: "warning",
  average: "secondary",
  accessible: "success",
  easy: "success",
};

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

  const metrics = [
    { icon: Target, label: "Solve rate", value: `${stats.solveRate}%` },
    { icon: Clock, label: "Avg time", value: formatTime(stats.avgSolveTime) },
    { icon: BarChart3, label: "Attempts", value: stats.totalAttempts.toLocaleString() },
    { icon: Lightbulb, label: "Avg hints", value: String(stats.hintsUsedAvg) },
  ];

  return (
    <section className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="border-border border-b bg-inset px-4 py-2.5">
        <h3 className="eyebrow">Puzzle statistics</h3>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {metrics.map((metric) => (
          <div className="px-4 py-5 text-center" key={metric.label}>
            <div className="mb-2 flex items-center justify-center gap-1.5">
              <metric.icon className="size-3 text-subtle" />
              <span className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
                {metric.label}
              </span>
            </div>
            <p className="font-semibold text-2xl text-foreground tracking-[-0.04em] tabular-nums">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-border border-t bg-inset px-4 py-3">
        <span className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
          Difficulty rating
        </span>
        <Badge
          className="capitalize"
          variant={DIFFICULTY_VARIANTS[stats.difficultyComparison] ?? "secondary"}
        >
          {stats.difficultyComparison}
        </Badge>
      </div>
    </section>
  );
}
