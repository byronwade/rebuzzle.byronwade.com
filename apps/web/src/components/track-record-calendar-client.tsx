"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TrackRecordDay, TrackRecordStatus, TrackRecordTotals } from "@/lib/game/track-record";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<TrackRecordStatus, string> = {
  solved: "Solved",
  failed: "Didn’t get it",
  missed: "Missed",
  pending: "Not played yet",
  none: "No record",
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
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Last selectable day is today; cells after it only pad the final week.
  const lastIndex = days.reduce(
    (last, day, index) => (day.status === "none" && index > last ? last : index),
    0
  );
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected ?? lastIndex;
  const activeDay = days[active];

  const moveTo = (index: number) => {
    const next = Math.min(Math.max(index, 0), lastIndex);
    setSelected(next);
    cellRefs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step: Record<string, number> = {
      ArrowUp: -1,
      ArrowDown: 1,
      ArrowLeft: -7,
      ArrowRight: 7,
    };
    if (event.key in step) {
      event.preventDefault();
      moveTo(active + (step[event.key] ?? 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveTo(lastIndex);
    }
  };

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
          role="group"
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
            className="sticky left-0 z-10 grid gap-[3px] bg-card pr-1 font-mono text-[10px] text-subtle leading-[11px]"
            style={{ gridTemplateRows: "repeat(7, 11px)" }}
          >
            {DAY_LABELS.map((label, row) => (
              <span key={row}>{label}</span>
            ))}
          </div>
          {/* Arrow keys move between days; one tab stop for the whole year. */}
          <div
            className="grid grid-flow-col gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${weeks}, 11px)`,
              gridTemplateRows: "repeat(7, 11px)",
            }}
          >
            {days.map((day, index) =>
              index > lastIndex ? (
                <span aria-hidden key={day.date} />
              ) : (
                <button
                  aria-label={`${formatDay(day.date)}: ${STATUS_LABEL[day.status]}`}
                  aria-pressed={index === active}
                  className={cn(
                    "h-[11px] w-[11px] rounded-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-1",
                    STATUS_CLASS[day.status],
                    index === active &&
                      selected !== null &&
                      "outline outline-1 outline-foreground outline-offset-1"
                  )}
                  data-status={day.status}
                  key={day.date}
                  onClick={() => setSelected(index)}
                  onKeyDown={onKeyDown}
                  ref={(node) => {
                    cellRefs.current[index] = node;
                  }}
                  tabIndex={index === active ? 0 : -1}
                  title={`${formatDay(day.date)}: ${STATUS_LABEL[day.status]}`}
                  type="button"
                />
              )
            )}
          </div>
        </div>
      </div>

      {/* Full-size day stepper: the 11px squares are too small to tap reliably. */}
      {activeDay ? (
        <div className="mt-2 flex items-center gap-1">
          <Button
            aria-label="Previous day"
            className="h-11 w-11 sm:h-8 sm:w-8"
            disabled={active === 0}
            onClick={() => setSelected(Math.max(active - 1, 0))}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </Button>
          <p aria-live="polite" className="min-w-0 flex-1 text-muted-foreground text-xs">
            <span className="text-foreground">{formatDay(activeDay.date)}</span>
            {" · "}
            {STATUS_LABEL[activeDay.status]}
          </p>
          <Button
            aria-label="Next day"
            className="h-11 w-11 sm:h-8 sm:w-8"
            disabled={active === lastIndex}
            onClick={() => setSelected(Math.min(active + 1, lastIndex))}
            size="icon"
            variant="ghost"
          >
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

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
