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
    <div className={cn("mx-auto max-w-2xl px-4 py-6 md:px-6", className)}>
      <main aria-label="Loading puzzle" className="space-y-5" role="status">
        {/* Difficulty + hint rail */}
        <section aria-hidden="true" className="flex items-center justify-between">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </section>

        {/* Puzzle panel */}
        <section
          aria-hidden="true"
          className="rounded-xl border border-border bg-card p-5 shadow-lg"
        >
          <div className="rounded-lg border border-border bg-inset p-8 md:p-10">
            <Skeleton className="mx-auto h-12 w-3/4 bg-border/60" />
            <Skeleton className="mx-auto mt-3 h-8 w-1/2 bg-border/60" />
          </div>
          <Skeleton className="mx-auto mt-4 h-4 w-56" />
        </section>

        {/* Answer dock */}
        <section aria-hidden="true">
          <Skeleton className="h-[68px] w-full rounded-lg" />
        </section>

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
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="mx-auto h-12 w-2/3" />
        <Skeleton className="mx-auto mt-3 h-4 w-1/2" />
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
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
