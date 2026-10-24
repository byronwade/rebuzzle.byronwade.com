"use client";

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
  /** Hide the four headline numbers when the page already shows them. */
  showTiles?: boolean;
};

function buildMonthCells(recentPlayDates: string[] | undefined): Array<{
  key: string;
  played: boolean;
  isToday: boolean;
}> {
  const played = new Set(recentPlayDates ?? []);
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = now.getUTCDate();
  const cells: Array<{ key: string; played: boolean; isToday: boolean }> = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ key, played: played.has(key), isToday: day === today });
  }
  return cells;
}

export function WordleStatsPanel({
  stats,
  className,
  compact = false,
  showTiles = true,
}: WordleStatsPanelProps) {
  const distribution = stats.guessDistribution?.length ? stats.guessDistribution : [0, 0, 0];
  const maxBucket = Math.max(1, ...distribution);
  const topCount = Math.max(...distribution);
  const monthCells = buildMonthCells(stats.recentPlayDates);
  const playedThisMonth = monthCells.filter((cell) => cell.played).length;

  return (
    <div className={cn("space-y-5", className)}>
      {showTiles ? (
        <dl className="grid grid-cols-4 divide-x divide-border rounded-lg border border-border">
          <StatTile label="Played" value={stats.played} />
          <StatTile label="Win %" value={stats.winRate} />
          <StatTile label="Streak" value={stats.currentStreak} />
          <StatTile label="Best" value={stats.maxStreak} />
        </dl>
      ) : null}

      {typeof stats.streakFreezes === "number" && stats.streakFreezes > 0 ? (
        <p className="text-muted-foreground text-xs">
          {stats.streakFreezes} streak {stats.streakFreezes === 1 ? "freeze" : "freezes"} saved
        </p>
      ) : null}

      <div>
        <p className="mb-2.5 font-medium text-foreground text-xs">Guess distribution</p>
        <div className="space-y-1.5">
          {distribution.map((count, guessNumber) => {
            const bucketLabel = `Guess ${guessNumber + 1}`;
            const isTop = count > 0 && count === topCount;
            return (
              <div className="flex items-center gap-2" key={bucketLabel}>
                <span className="w-3 font-mono text-muted-foreground text-xs tabular-nums">
                  {guessNumber + 1}
                </span>
                <div className="h-5 flex-1">
                  <div
                    className={cn(
                      "flex h-full min-w-[1.5rem] items-center justify-end rounded-sm px-1.5 font-mono text-[11px] tabular-nums transition-[width] duration-500",
                      isTop
                        ? "bg-foreground text-background"
                        : count > 0
                          ? "bg-border-strong/60 text-foreground"
                          : "bg-inset text-subtle"
                    )}
                    style={{ width: `${count > 0 ? Math.max(8, (count / maxBucket) * 100) : 0}%` }}
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
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <p className="font-medium text-foreground text-xs">This month</p>
            <p className="font-mono text-subtle text-xs tabular-nums">
              {playedThisMonth}/{monthCells.length} days
            </p>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell) => (
              <div
                aria-label={`${cell.key}${cell.played ? ", played" : ""}`}
                className={cn(
                  "aspect-square max-h-8 rounded-[4px]",
                  cell.played ? "bg-foreground" : "bg-inset",
                  cell.isToday && "ring-1 ring-foreground ring-offset-1 ring-offset-card"
                )}
                key={cell.key}
                role="img"
                title={cell.key}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse items-center px-2 py-3 text-center">
      <dt className="mt-0.5 text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground text-xl tabular-nums tracking-[-0.03em]">
        {value}
      </dd>
    </div>
  );
}
