/**
 * Puzzle Loading Skeleton
 *
 * Matches the play-stage layout so the board feels instant while streaming.
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
 * Full puzzle loading skeleton — mirrors GameBoard play stage + dock
 */
export function PuzzleSkeleton({ variant = "full", className }: PuzzleSkeletonProps) {
  if (variant === "minimal") {
    return <MinimalSkeleton className={className} />;
  }

  if (variant === "compact") {
    return <CompactSkeleton className={className} />;
  }

  return (
    <div
      className={cn("flex h-full min-h-[70vh] flex-col", className)}
      role="status"
      aria-label="Loading puzzle"
    >
      <main className="flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-[clamp(0.5rem,2vh,1rem)] md:px-6">
        <div className="mb-[clamp(0.75rem,2.5vh,1.25rem)] flex w-full max-w-2xl items-start justify-between gap-3">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>

        <section className="w-full max-w-2xl space-y-4 text-center" aria-hidden="true">
          <div className="rounded-3xl border border-border/60 bg-card/60 px-6 py-10 md:py-14">
            <Skeleton className="mx-auto h-14 w-3/4 md:h-16" />
            <Skeleton className="mx-auto mt-4 h-6 w-1/2" />
          </div>
          <Skeleton className="mx-auto h-4 w-40" />
        </section>

        <div className="mt-[clamp(0.75rem,2.5vh,1.5rem)] w-full max-w-2xl space-y-2" aria-hidden="true">
          <Skeleton className="h-8 w-2/3 rounded-full" />
        </div>
      </main>

      <section className="shrink-0 px-4 pt-3 pb-safe-lg md:px-6" aria-hidden="true">
        <div className="mx-auto max-w-2xl space-y-2">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-3 w-48" />
        </div>
      </section>

      <span className="sr-only">Loading puzzle</span>
    </div>
  );
}

function CompactSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-4", className)} role="status" aria-label="Loading">
      <div className="rounded-2xl border border-border bg-card p-6">
        <Skeleton className="mx-auto h-12 w-2/3" />
        <Skeleton className="mx-auto mt-3 h-4 w-1/2" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

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
      <span className="sr-only">Loading</span>
    </div>
  );
}
