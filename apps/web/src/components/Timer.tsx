"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getNextUtcMidnight } from "@/lib/game/daily-lock";
import { cn } from "@/lib/utils";

interface TimerProps {
  nextPlayTime: Date | null;
  className?: string;
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

export function Timer({ nextPlayTime, className }: TimerProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reloadedRef = useRef(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const targetTime = nextPlayTime ? new Date(nextPlayTime) : getNextUtcMidnight(now);
      const difference = targetTime.getTime() - now.getTime();

      if (difference <= 0) {
        if (!reloadedRef.current) {
          reloadedRef.current = true;
          router.push("/");
          router.refresh();
        }
        return "00:00:00";
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
  }, [nextPlayTime, router]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn("font-mono text-gray-400 text-xs xs:text-sm cursor-default", className)}
          >
            <span className="xs:inline hidden">Next puzzle in: </span>
            <span className="xs:hidden">Next: </span>
            <span className="font-semibold text-gray-600">{timeLeft}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>New puzzle available at midnight UTC</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
