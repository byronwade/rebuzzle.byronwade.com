/**
 * Fire a short dual-cannon confetti burst.
 * Safe to call from any client component; no-ops under reduced motion.
 */

export async function fireConfetti(options?: { durationMs?: number }): Promise<void> {
  if (typeof window === "undefined") return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const { default: confetti } = await import("canvas-confetti");
  const duration = options?.durationMs ?? 2200;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 28, spread: 360, ticks: 55, zIndex: 80 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  await new Promise<void>((resolve) => {
    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        window.clearInterval(interval);
        resolve();
        return;
      }

      const particleCount = 42 * (timeLeft / duration);
      void confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.12, 0.28), y: Math.random() - 0.15 },
      });
      void confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.72, 0.88), y: Math.random() - 0.15 },
      });
    }, 220);
  });
}
