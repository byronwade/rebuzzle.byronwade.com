"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Create a wrapper component for canvas-confetti
const ConfettiComponent = () => null;

const ConfettiImpl = dynamic(
  () =>
    import("canvas-confetti").then((mod) => {
      // Store the confetti function globally
      (globalThis as any).confetti = mod.default;
      return Promise.resolve(ConfettiComponent);
    }),
  {
    ssr: false,
  }
);

export function Confetti() {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isActive && typeof window !== "undefined" && (globalThis as any).confetti) {
      const duration = 2 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          setIsActive(false);
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        (globalThis as any).confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        (globalThis as any).confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isActive]);

  return <ConfettiImpl />;
}
