"use client";

import { AlertCircle, Clock, TrendingDown, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { GameType } from "@/ai/config/psychological-games";

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

  // Show/hide games based on active types
  useEffect(() => {
    setShowTimePressure(enabled && activeGames.includes("time-pressure") && !!timePressureMessage);
    setShowSocialPressure(
      enabled && activeGames.includes("social-pressure") && !!socialPressureMessage
    );
    setShowConfidence(
      enabled && activeGames.includes("confidence-manipulation") && !!confidenceMessage
    );
  }, [enabled, activeGames, timePressureMessage, socialPressureMessage, confidenceMessage]);

  if (!enabled) return null;

  return (
    <div className="space-y-2">
      {/* Time Pressure - Shows real statistics */}
      {showTimePressure && (
        <div
          aria-live="polite"
          className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm transition-all dark:border-neutral-700 dark:bg-neutral-800/50"
          role="status"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {timePressureMessage}
            </span>
          </div>
        </div>
      )}

      {/* Social Pressure */}
      {showSocialPressure && (
        <div
          aria-live="polite"
          className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-800/50"
          role="status"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {socialPressureMessage}
            </span>
          </div>
        </div>
      )}

      {/* Confidence Manipulation */}
      {showConfidence && (
        <div
          aria-live="polite"
          className="animate-pulse rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-800/50"
          role="status"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {confidenceMessage}
            </span>
          </div>
        </div>
      )}

      {/* Red Herrings */}
      {activeGames.includes("red-herrings") && redHerrings.length > 0 && intensity > 0.5 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="mb-2 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            <span className="font-medium text-neutral-700 text-xs dark:text-neutral-300">
              Consider these alternatives:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {redHerrings.slice(0, 3).map((herring, index) => (
              <span
                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-neutral-700 text-xs dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
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

export function MisleadingHint({ hint, intensity, enabled }: MisleadingHintProps) {
  if (!(enabled && hint)) return null;

  return (
    <div
      aria-live="polite"
      className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-800/50"
      role="status"
      style={{ opacity: intensity }}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 text-neutral-600 dark:text-neutral-400" />
        <span className="text-neutral-700 dark:text-neutral-300">{hint}</span>
      </div>
    </div>
  );
}
