"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface CountdownResult {
  /** Total seconds remaining */
  totalSeconds: number;
  /** Days remaining */
  days: number;
  /** Hours remaining (0-23) */
  hours: number;
  /** Minutes remaining (0-59) */
  minutes: number;
  /** Seconds remaining (0-59) */
  seconds: number;
  /** Whether countdown has finished */
  isFinished: boolean;
  /** Formatted string (e.g., "02:45:30") */
  formatted: string;
  /** Reset countdown to a new target */
  reset: (newTarget: Date) => void;
}

/**
 * Hook for countdown timer
 *
 * @param targetDate - Target date to count down to
 * @param onComplete - Optional callback when countdown reaches zero
 * @param serverTimeOffset - Optional offset to adjust for server time (milliseconds)
 * @returns Countdown state and controls
 *
 * @example
 * ```tsx
 * const { hours, minutes, seconds, isFinished, formatted } = useCountdown(nextPuzzleTime, undefined, serverTimeOffset);
 *
 * return isFinished ? (
 *   <span>New puzzle available!</span>
 * ) : (
 *   <span>Next puzzle in: {formatted}</span>
 * );
 * ```
 */
export function useCountdown(
  targetDate: Date | null,
  onComplete?: () => void,
  serverTimeOffset = 0
): CountdownResult {
  const [target, setTarget] = useState<Date | null>(targetDate);

  const calculateTimeLeft = useCallback(() => {
    if (!target) return 0;
    // Use server-adjusted time for accurate countdown across platforms
    const serverNow = Date.now() + serverTimeOffset;
    const difference = target.getTime() - serverNow;
    return Math.max(0, Math.floor(difference / 1000));
  }, [target, serverTimeOffset]);

  const [totalSeconds, setTotalSeconds] = useState<number>(calculateTimeLeft);

  // Update target when prop changes
  useEffect(() => {
    setTarget(targetDate);
  }, [targetDate]);

  // Countdown timer
  useEffect(() => {
    if (!target) return;

    // Calculate initial value
    setTotalSeconds(calculateTimeLeft());

    const timer = setInterval(() => {
      const newValue = calculateTimeLeft();
      setTotalSeconds(newValue);

      if (newValue === 0) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [target, calculateTimeLeft, onComplete]);

  // Parse time components
  const timeComponents = useMemo(() => {
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds };
  }, [totalSeconds]);

  // Format string
  const formatted = useMemo(() => {
    const { days, hours, minutes, seconds } = timeComponents;
    const pad = (n: number) => n.toString().padStart(2, "0");

    if (days > 0) {
      return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }, [timeComponents]);

  // Reset function
  const reset = useCallback((newTarget: Date) => {
    setTarget(newTarget);
  }, []);

  return {
    totalSeconds,
    ...timeComponents,
    isFinished: totalSeconds === 0,
    formatted,
    reset,
  };
}

/**
 * Hook for counting up from zero (stopwatch)
 *
 * @param autoStart - Whether to start immediately
 * @returns Elapsed time and controls
 */
export function useStopwatch(autoStart = false) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
  }, []);

  const formatted = useMemo(() => {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [elapsedSeconds]);

  return {
    elapsedSeconds,
    minutes: Math.floor(elapsedSeconds / 60),
    seconds: elapsedSeconds % 60,
    formatted,
    isRunning,
    start,
    pause,
    reset,
    toggle: isRunning ? pause : start,
  };
}
