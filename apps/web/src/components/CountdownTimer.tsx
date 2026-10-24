"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getNextLocalMidnight } from "@/lib/game/daily-lock";

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
 * Counts down to the player's next local midnight (captured once),
 * then navigates home so today's puzzle can load.
 */
export function CountdownTimer() {
  const router = useRouter();
  const targetRef = useRef<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("--:--:--");
  const [nextAt, setNextAt] = useState<Date | null>(null);
  const reloadedRef = useRef(false);

  useEffect(() => {
    // Capture once — calling getNextLocalMidnight() every tick never reaches zero
    if (!targetRef.current) {
      targetRef.current = getNextLocalMidnight();
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
    <div className="flex flex-col items-center">
      <p className="font-semibold text-4xl text-foreground tabular-nums tracking-[-0.04em]">
        {timeLeft}
      </p>
      <p className="mt-1.5 text-subtle text-xs">
        {nextAt
          ? `Resets at local midnight (${nextAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })})`
          : "Resets at local midnight"}
      </p>
    </div>
  );
}
