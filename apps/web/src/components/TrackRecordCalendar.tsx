"use client";

import { useEffect, useRef } from "react";
import type { TrackRecordDay, TrackRecordStatus, TrackRecordTotals } from "@/lib/game/track-record";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<TrackRecordStatus, string> = {
  solved: "Solved",
  failed: "Didn’t get it",
  missed: "Missed",
  pending: "Not played yet",
  none: "",
};

const STATUS_CLASS: Record<TrackRecordStatus, string> = {
  solved: "bg-success",
  failed: "bg-destructive/75",
  missed: "border border-border bg-inset",
  pending: "border border-foreground bg-inset",
  none: "bg-transparent",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function formatDay(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return `${MONTHS[(month ?? 1) - 1]} ${day}, ${year}`;
}

/** Month label for each week column, set on the week holding the 1st. */
function monthLabels(days: TrackRecordDay[]): string[] {
  const weeks = Math.ceil(days.length / 7);
  const labels: string[] = [];
  for (let week = 0; week < weeks; week++) {
    const slice = days.slice(week * 7, week * 7 + 7);
    const first = slice.find((day) => day.date.endsWith("-01"));
    labels.push(first ? (MONTHS[Number(first.date.slice(5, 7)) - 1] ?? "") : "");
  }
  return labels;
}

export function TrackRecordCalendar({
  days,
  totals,
}: {
  days: TrackRecordDay[];
  totals: TrackRecordTotals;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const weeks = Math.ceil(days.length / 7);
  const labels = monthLabels(days);

  // Newest week sits at the right edge; on narrow screens start scrolled there.
  useEffect(() => {
    const node = scrollRef.current;
    if (node && days.length > 0) node.scrollLeft = node.scrollWidth;
  }, [days.length]);

  const summary = `${totals.solved} solved, ${totals.failed} not solved, ${totals.missed} missed in the last year`;

  return (
    <div>
      <div className="overflow-x-auto pb-1" ref={scrollRef}>
        <div
          aria-label={summary}
          className="inline-grid gap-x-2"
          role="img"
          style={{ gridTemplateColumns: "auto auto" }}
        >
          <div className="sticky left-0 z-10 bg-card" />
          <div
            aria-hidden
            className="grid gap-[3px] pb-1.5 font-mono text-[10px] text-subtle leading-none"
            style={{ gridTemplateColumns: `repeat(${weeks}, 11px)` }}
          >
            {labels.map((label, week) => (
              <span className="overflow-visible whitespace-nowrap" key={week}>
                {label}
              </span>
            ))}
          </div>
          <div
            aria-hidden
            className="sticky left-0 z-10 grid grid-rows-7 gap-[3px] bg-card pr-1 font-mono text-[10px] text-subtle leading-[11px]"
          >
            {DAY_LABELS.map((label, row) => (
              <span key={row}>{label}</span>
            ))}
          </div>
          <div
            className="grid grid-flow-col grid-rows-7 gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${weeks}, 11px)` }}
          >
            {days.map((day) => (
              <div
                className={cn("h-[11px] w-[11px] rounded-[2px]", STATUS_CLASS[day.status])}
                data-status={day.status}
                key={day.date}
                title={
                  day.status === "none"
                    ? undefined
                    : `${formatDay(day.date)}: ${STATUS_LABEL[day.status]}`
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-xs">
        {(["solved", "failed", "missed"] as const).map((status) => (
          <span className="inline-flex items-center gap-1.5" key={status}>
            <span
              aria-hidden
              className={cn("h-[11px] w-[11px] rounded-[2px]", STATUS_CLASS[status])}
            />
            {STATUS_LABEL[status]}
            <span className="font-mono text-foreground tabular-nums">{totals[status]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
