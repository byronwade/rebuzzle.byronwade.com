"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    // Update immediately
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-white shadow-lg">
      <Clock className="h-6 w-6 animate-pulse" />
      <div className="text-center">
        <div className="font-semibold text-xs uppercase tracking-wide opacity-90">
          Next Puzzle In
        </div>
        <div className="font-bold text-3xl tabular-nums">{timeLeft}</div>
      </div>
    </div>
  );
}
