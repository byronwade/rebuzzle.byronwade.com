"use client";

import { Calendar, Flame, Target, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type WordleStats = {
  played: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
  recentPlayDates?: string[];
  streakFreezes?: number;
};

type WordleStatsPanelProps = {
  stats: WordleStats;
  className?: string;
  compact?: boolean;
};

function buildMonthCells(recentPlayDates: string[] | undefined): Array<{
  key: string;
  played: boolean;
}> {
  const played = new Set(recentPlayDates ?? []);
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<{ key: string; played: boolean }> = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ key, played: played.has(key) });
  }
  return cells;
}

export function WordleStatsPanel({ stats, className, compact = false }: WordleStatsPanelProps) {
  const distribution = stats.guessDistribution?.length ? stats.guessDistribution : [0, 0, 0];
  const maxBucket = Math.max(1, ...distribution);
  const monthCells = buildMonthCells(stats.recentPlayDates);

  return (
    <div className={cn("space-y-4", className)}>
      <div className={cn("grid gap-2", compact ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4")}>
        <StatTile icon={<Trophy className="h-4 w-4" />} label="Played" value={stats.played} />
        <StatTile icon={<Target className="h-4 w-4" />} label="Win %" value={stats.winRate} />
        <StatTile icon={<Flame className="h-4 w-4" />} label="Streak" value={stats.currentStreak} />
        <StatTile icon={<Flame className="h-4 w-4" />} label="Max" value={stats.maxStreak} />
      </div>

      {typeof stats.streakFreezes === "number" && stats.streakFreezes > 0 ? (
        <p className="text-muted-foreground text-xs">Freeze · {stats.streakFreezes}</p>
      ) : null}

      <div>
        <p className="mb-2 font-medium text-foreground text-xs uppercase tracking-[0.08em]">
          Guess distribution
        </p>
        <div className="space-y-1.5">
          {distribution.map((count, guessNumber) => {
            const bucketLabel = `Guess ${guessNumber + 1}`;
            return (
              <div className="flex items-center gap-2" key={bucketLabel}>
                <span className="w-3 font-mono text-muted-foreground text-xs tabular-nums">
                  {guessNumber + 1}
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded-sm bg-muted/60">
                  <div
                    className="flex h-full min-w-[1.25rem] items-center justify-end bg-primary px-1.5 font-mono text-[11px] text-primary-foreground tabular-nums transition-[width]"
                    style={{ width: `${Math.max(12, (count / maxBucket) * 100)}%` }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!compact && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 font-medium text-foreground text-xs uppercase tracking-[0.08em]">
            <Calendar className="h-3.5 w-3.5" />
            This month
          </p>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell) => (
              <div
                className={cn(
                  "aspect-square rounded-[3px]",
                  cell.played ? "bg-primary/80" : "bg-muted/50"
                )}
                key={cell.key}
                title={cell.key}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-2.5 py-3 text-center">
      <div className="mb-1 flex justify-center text-muted-foreground">{icon}</div>
      <div className="font-semibold text-foreground text-xl tabular-nums tracking-tight">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
