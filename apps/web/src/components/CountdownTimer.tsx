"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getNextUtcMidnight, msUntilNextUtcMidnight } from "@/lib/game/daily-lock";

function formatCountdown(diffMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Counts down to the next UTC midnight (puzzle rollover), then reloads home.
 */
export function CountdownTimer() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(() => formatCountdown(msUntilNextUtcMidnight()));
  const reloadedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const diff = msUntilNextUtcMidnight();
      setTimeLeft(formatCountdown(diff));

      if (diff <= 0 && !reloadedRef.current) {
        reloadedRef.current = true;
        // New UTC day — pull today's puzzle (don't sit on yesterday's results)
        router.push("/");
        router.refresh();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [router]);

  const nextAt = getNextUtcMidnight();

  return (
    <div className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-white shadow-lg">
      <Clock className="h-6 w-6 animate-pulse" />
      <div className="text-center">
        <div className="font-semibold text-xs uppercase tracking-wide opacity-90">
          Next Puzzle In
        </div>
        <div className="font-bold text-3xl tabular-nums">{timeLeft}</div>
        <div className="mt-1 text-[10px] uppercase tracking-wide opacity-75">
          Resets {nextAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}{" "}
          local ({nextAt.toISOString().slice(11, 16)} UTC)
        </div>
      </div>
    </div>
  );
}
