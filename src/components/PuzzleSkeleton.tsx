/**
 * Puzzle Loading Skeleton
 *
 * Shows while puzzle data is loading for better perceived performance
 */

import { Skeleton } from "@/components/ui/skeleton"

export function PuzzleSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      {/* Status Bar Skeleton */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      {/* Puzzle Display Skeleton */}
      <div className="text-center space-y-4">
        <div className="p-12 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <Skeleton className="h-20 w-3/4 mx-auto" />
        </div>
        <Skeleton className="h-6 w-64 mx-auto" />
      </div>

      {/* Guess Boxes Skeleton */}
      <div className="flex justify-center gap-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-14 rounded-xl" />
        ))}
      </div>

      {/* Submit Button Skeleton */}
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  )
}
