"use client";

import { AlertCircle, Clock, TrendingDown, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { GameType } from "@/ai/config/psychological-games";
import { cn } from "@/lib/utils";

interface PsychologicalGamesProps {
  /** Active game types */
  activeGames: GameType[];
  /** Time pressure message */
  timePressureMessage?: string;
  /** Social pressure message */
  socialPressureMessage?: string;
  /** Confidence manipulation message */
  confidenceMessage?: string;
  /** Red herring suggestions */
  redHerrings?: string[];
  /** Intensity (0-1) */
  intensity: number;
  /** Whether to show games */
  enabled: boolean;
}

export function PsychologicalGames({
  activeGames,
  timePressureMessage,
  socialPressureMessage,
  confidenceMessage,
  redHerrings = [],
  intensity,
  enabled,
}: PsychologicalGamesProps) {
  const [showTimePressure, setShowTimePressure] = useState(false);
  const [showSocialPressure, setShowSocialPressure] = useState(false);
  const [showConfidence, setShowConfidence] = useState(false);
  const [fakeCountdown, setFakeCountdown] = useState<number | null>(null);

  // Show/hide games based on active types
  useEffect(() => {
    setShowTimePressure(
      enabled && activeGames.includes("time-pressure") && !!timePressureMessage
    );
    setShowSocialPressure(
      enabled &&
        activeGames.includes("social-pressure") &&
        !!socialPressureMessage
    );
    setShowConfidence(
      enabled &&
        activeGames.includes("confidence-manipulation") &&
        !!confidenceMessage
    );
  }, [
    enabled,
    activeGames,
    timePressureMessage,
    socialPressureMessage,
    confidenceMessage,
  ]);

  // Fake countdown timer for time pressure
  useEffect(() => {
    if (showTimePressure && intensity > 0.5) {
      // Start a fake countdown
      const startTime = Date.now();
      const duration = 30 + Math.random() * 60; // 30-90 seconds
      const endTime = startTime + duration * 1000;

      const interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.floor((endTime - Date.now()) / 1000)
        );
        setFakeCountdown(remaining);

        if (remaining === 0) {
          clearInterval(interval);
          // Reset after a moment
          setTimeout(() => {
            setFakeCountdown(null);
          }, 2000);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
    setFakeCountdown(null);
  }, [showTimePressure, intensity]);

  if (!enabled) return null;

  return (
    <div className="space-y-2">
      {/* Time Pressure */}
      {showTimePressure && (
        <div
          aria-live="polite"
          className={cn(
            "rounded-lg border p-3 text-sm transition-all",
            fakeCountdown !== null && fakeCountdown < 10
              ? "animate-pulse border-red-300 bg-red-50"
              : "border-amber-200 bg-amber-50"
          )}
          role="status"
        >
          <div className="flex items-center gap-2">
            <Clock
              className={cn(
                "h-4 w-4",
                fakeCountdown !== null && fakeCountdown < 10
                  ? "text-red-600"
                  : "text-amber-600"
              )}
            />
            <span
              className={cn(
                "font-medium",
                fakeCountdown !== null && fakeCountdown < 10
                  ? "text-red-700"
                  : "text-amber-700"
              )}
            >
              {fakeCountdown !== null
                ? `Time running out: ${fakeCountdown}s`
                : timePressureMessage}
            </span>
          </div>
        </div>
      )}

      {/* Social Pressure */}
      {showSocialPressure && (
        <div
          aria-live="polite"
          className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"
          role="status"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-700">
              {socialPressureMessage}
            </span>
          </div>
        </div>
      )}

      {/* Confidence Manipulation */}
      {showConfidence && (
        <div
          aria-live="polite"
          className="animate-pulse rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm"
          role="status"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-purple-700">
              {confidenceMessage}
            </span>
          </div>
        </div>
      )}

      {/* Red Herrings */}
      {activeGames.includes("red-herrings") &&
        redHerrings.length > 0 &&
        intensity > 0.5 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-700 text-xs">
                Consider these alternatives:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {redHerrings.slice(0, 3).map((herring, index) => (
                <span
                  className="rounded-md border border-orange-200 bg-white px-2 py-1 text-orange-700 text-xs"
                  key={index}
                >
                  {herring}
                </span>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

/**
 * Misleading hint overlay component
 */
interface MisleadingHintProps {
  hint: string;
  intensity: number;
  enabled: boolean;
}

export function MisleadingHint({
  hint,
  intensity,
  enabled,
}: MisleadingHintProps) {
  if (!(enabled && hint)) return null;

  return (
    <div
      aria-live="polite"
      className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm"
      role="status"
      style={{ opacity: intensity }}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 text-indigo-600" />
        <span className="text-indigo-700">{hint}</span>
      </div>
    </div>
  );
}

