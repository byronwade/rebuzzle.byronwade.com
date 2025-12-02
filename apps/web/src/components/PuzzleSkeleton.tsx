/**
 * Puzzle Loading Skeleton
 *
 * Shows while puzzle data is loading for better perceived performance.
 * Supports dark mode and reduced motion preferences.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PuzzleSkeletonProps {
  /** Variant for different contexts */
  variant?: "full" | "compact" | "minimal";
  /** Custom className */
  className?: string;
}

/**
 * Full puzzle loading skeleton with all sections
 */
export function PuzzleSkeleton({ variant = "full", className }: PuzzleSkeletonProps) {
  if (variant === "minimal") {
    return <MinimalSkeleton className={className} />;
  }

  if (variant === "compact") {
    return <CompactSkeleton className={className} />;
  }

  return (
    <div className={cn("mx-auto max-w-4xl px-4 py-3 md:px-6", className)}>
      <main className="space-y-6" role="status" aria-label="Loading puzzle">
        {/* Status Bar Skeleton */}
        <section
          aria-hidden="true"
          className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/80 p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </section>

        {/* Puzzle Display Skeleton */}
        <section aria-hidden="true" className="space-y-4 text-center">
          <div className="rounded-3xl border-2 border-dashed border-border bg-card p-8 md:p-12">
            <Skeleton className="mx-auto h-16 w-3/4 md:h-20" />
            <Skeleton className="mx-auto mt-4 h-8 w-1/2" />
          </div>
          <Skeleton className="mx-auto h-5 w-64" />
        </section>

        {/* Answer Input Skeleton */}
        <section aria-hidden="true" className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
        </section>

        {/* Submit Button Skeleton */}
        <Skeleton className="h-14 w-full rounded-2xl" />

        {/* Screen reader announcement */}
        <span className="sr-only">Loading puzzle, please wait...</span>
      </main>
    </div>
  );
}

/**
 * Compact skeleton for smaller spaces
 */
function CompactSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-4", className)} role="status" aria-label="Loading">
      <div className="rounded-2xl border border-border bg-card p-6">
        <Skeleton className="mx-auto h-12 w-2/3" />
        <Skeleton className="mx-auto mt-3 h-4 w-1/2" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Minimal skeleton for tight spaces
 */
function MinimalSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-3 p-2", className)}
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Skeleton for leaderboard loading
 */
export function LeaderboardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading leaderboard">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`leaderboard-skeleton-${i}`}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
        >
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
      <span className="sr-only">Loading leaderboard...</span>
    </div>
  );
}

/**
 * Skeleton for blog post cards
 */
export function BlogCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-card p-4"
      role="status"
      aria-label="Loading blog post"
    >
      <Skeleton className="mb-3 h-40 w-full rounded-lg" />
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <span className="sr-only">Loading blog post...</span>
    </div>
  );
}
