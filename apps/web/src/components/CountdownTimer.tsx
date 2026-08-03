"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getNextUtcMidnight } from "@/lib/game/daily-lock";

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
 * Counts down to a fixed next UTC midnight (captured once on the client),
 * then navigates home so today's puzzle can load.
 */
export function CountdownTimer() {
  const router = useRouter();
  const targetRef = useRef<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("--:--:--");
  const [nextAt, setNextAt] = useState<Date | null>(null);
  const reloadedRef = useRef(false);

  useEffect(() => {
    // Capture once — calling getNextUtcMidnight() every tick never reaches zero
    if (!targetRef.current) {
      targetRef.current = getNextUtcMidnight();
      setNextAt(targetRef.current);
    }

    const tick = () => {
      const target = targetRef.current;
      if (!target) return;
      const diff = target.getTime() - Date.now();
      setTimeLeft(formatCountdown(diff));

      if (diff <= 0 && !reloadedRef.current) {
        reloadedRef.current = true;
        router.replace("/");
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="inline-flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-3 shadow-sm">
      <Clock className="h-6 w-6 animate-pulse" />
      <div className="text-center">
        <div className="font-semibold text-xs uppercase tracking-wide opacity-90">
          Next Puzzle In
        </div>
        <div className="font-bold text-3xl tabular-nums">{timeLeft}</div>
        {nextAt && (
          <div className="mt-1 text-[10px] uppercase tracking-wide opacity-75">
            Resets {nextAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}{" "}
            local ({nextAt.toISOString().slice(11, 16)} UTC)
          </div>
        )}
      </div>
    </div>
  );
}
