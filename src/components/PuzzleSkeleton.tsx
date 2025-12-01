/**
 * Puzzle Loading Skeleton
 *
 * Shows while puzzle data is loading for better perceived performance
 */

import { Skeleton } from "@/components/ui/skeleton";

export function PuzzleSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
      <main className="space-y-6">
        {/* Status Bar Skeleton */}
        <section
          aria-label="Loading game status"
          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </section>

        {/* Puzzle Display Skeleton */}
        <section aria-label="Loading puzzle" className="space-y-4 text-center">
          <div className="rounded-3xl border-2 border-gray-200 border-dashed bg-white p-12">
            <Skeleton className="mx-auto h-20 w-3/4" />
          </div>
          <Skeleton className="mx-auto h-6 w-64" />
        </section>

        {/* Guess Boxes Skeleton */}
        <section
          aria-label="Loading answer input"
          className="flex justify-center gap-2"
        >
          {[...Array(8)].map((_, i) => (
            <Skeleton className="h-16 w-14 rounded-xl" key={i} />
          ))}
        </section>

        {/* Submit Button Skeleton */}
        <Skeleton className="h-14 w-full rounded-2xl" />
      </main>
    </div>
  );
}
