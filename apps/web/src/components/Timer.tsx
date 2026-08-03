"use client";

import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getNextUtcMidnight } from "@/lib/game/daily-lock";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface TimerProps {
  nextPlayTime: Date | null;
  className?: string;
  /** Digits only — for docks / cards that already label "Next puzzle". */
  compact?: boolean;
}

function formatCountdown(diffMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function Timer({ nextPlayTime, className, compact = false }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState("--:--:--");
  const [underHour, setUnderHour] = useState(false);
  const [minuteTick, setMinuteTick] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reloadedRef = useRef(false);
  // Fixed target for this mount when nextPlayTime is null — set in effect to avoid prerender Date()
  const fallbackTargetRef = useRef<Date | null>(null);
  const lastMinuteRef = useRef<number | null>(null);

  useEffect(() => {
    if (!fallbackTargetRef.current) {
      fallbackTargetRef.current = getNextUtcMidnight();
    }
    const targetTime = nextPlayTime ? new Date(nextPlayTime) : fallbackTargetRef.current;

    const calculateTimeLeft = () => {
      const difference = targetTime.getTime() - Date.now();

      if (difference <= 0) {
        if (!reloadedRef.current) {
          reloadedRef.current = true;
          window.location.assign("/");
        }
        setUnderHour(false);
        return "00:00:00";
      }

      const isUnderHour = difference < 60 * 60 * 1000;
      setUnderHour(isUnderHour);

      // Once a minute under an hour: a single opacity dip — anticipation, not alarm.
      if (compact && isUnderHour) {
        const minuteBucket = Math.floor(difference / 60_000);
        if (lastMinuteRef.current !== null && minuteBucket !== lastMinuteRef.current) {
          setMinuteTick(true);
          window.setTimeout(() => setMinuteTick(false), 280);
        }
        lastMinuteRef.current = minuteBucket;
      }

      return formatCountdown(difference);
    };

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setTimeLeft(calculateTimeLeft());
    intervalRef.current = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [nextPlayTime, compact]);

  // Tab-return itch: one soft tap when coming back under an hour to midnight.
  useEffect(() => {
    if (!underHour) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        haptics.tap();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [underHour]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "cursor-default font-mono text-subtle text-xs transition-opacity duration-300",
              underHour && compact && "font-medium text-foreground",
              minuteTick && "opacity-45",
              className
            )}
          >
            {compact ? null : (
              <>
                <span className="xs:inline hidden">Next puzzle in </span>
                <span className="xs:hidden">Next </span>
              </>
            )}
            <span className="text-foreground tabular-nums">{timeLeft}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>New puzzle available at midnight UTC</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
