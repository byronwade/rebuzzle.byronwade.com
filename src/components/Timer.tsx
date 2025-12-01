"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TimerProps {
  nextPlayTime: Date | null;
  className?: string;
}

export function Timer({ nextPlayTime, className }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      let targetTime: Date;

      if (nextPlayTime) {
        targetTime = new Date(nextPlayTime);
      } else {
        targetTime = new Date(now);
        targetTime.setHours(24, 0, 0, 0);
      }

      const difference = targetTime.getTime() - now.getTime();

      if (difference <= 0) {
        return "00:00:00";
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [nextPlayTime]);

  return (
    <div
      className={cn("font-mono text-gray-400 text-xs xs:text-sm", className)}
    >
      <span className="xs:inline hidden">Next puzzle in: </span>
      <span className="xs:hidden">Next: </span>
      <span className="font-semibold text-gray-600">{timeLeft}</span>
    </div>
  );
}
