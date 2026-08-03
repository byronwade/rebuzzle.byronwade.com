/**
 * Content-shaped page shells for instant perceived loading.
 * Prefer these over spinners for route/Suspense fallbacks.
 */

import Layout from "@/components/Layout";
import { PuzzleSkeleton } from "@/components/PuzzleSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Home / puzzle board shell */
export function HomePageSkeleton({ className }: { className?: string }) {
  return (
    <Layout>
      <PuzzleSkeleton className={className} />
    </Layout>
  );
}

/** Game-over / results shell — matches success & failure layouts */
export function GameOverPageSkeleton({ className }: { className?: string }) {
  return (
    <Layout>
      <div
        className={cn("mx-auto max-w-lg space-y-8 px-4 py-8 md:py-12", className)}
        role="status"
        aria-label="Loading results"
      >
        <div className="space-y-3 text-center">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto h-9 w-32" />
          <Skeleton className="mx-auto h-4 w-48" />
        </div>

        <div className="space-y-3 border-y border-border py-6 text-center">
          <Skeleton className="mx-auto h-3 w-24" />
          <Skeleton className="mx-auto h-12 w-56" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="mx-auto h-14 w-16" />
          <Skeleton className="mx-auto h-14 w-16" />
          <Skeleton className="mx-auto h-14 w-16" />
        </div>

        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
        <span className="sr-only">Loading results</span>
      </div>
    </Layout>
  );
}

/** Profile shell */
function ProfilePageSkeleton({ className }: { className?: string }) {
  return (
    <Layout>
      <div
        className={cn("mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-6", className)}
        role="status"
        aria-label="Loading profile"
      >
        <div className="space-y-3 text-center">
          <Skeleton className="mx-auto h-20 w-20 rounded-full" />
          <Skeleton className="mx-auto h-6 w-40" />
          <Skeleton className="mx-auto h-4 w-28" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <span className="sr-only">Loading profile</span>
      </div>
    </Layout>
  );
}

/** Leaderboard shell */
export function LeaderboardPageSkeleton({ className }: { className?: string }) {
  return (
    <Layout>
      <div
        className={cn("mx-auto max-w-4xl space-y-4 px-4 py-3 md:px-6", className)}
        role="status"
        aria-label="Loading leaderboard"
      >
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton className="h-14 w-full rounded-xl" key={i} />
          ))}
        </div>
        <span className="sr-only">Loading leaderboard</span>
      </div>
    </Layout>
  );
}

/** Settings shell */
function SettingsPageSkeleton({ className }: { className?: string }) {
  return (
    <Layout>
      <div
        className={cn("mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-6", className)}
        role="status"
        aria-label="Loading settings"
      >
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <span className="sr-only">Loading settings</span>
      </div>
    </Layout>
  );
}

/** Generic content page (blog, static marketing) */
export function ContentPageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("mx-auto max-w-4xl space-y-4 px-4 py-8 md:px-6", className)}
      role="status"
      aria-label="Loading page"
    >
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

/** Auth form card shell */
export function AuthFormSkeleton({ className }: { className?: string }) {
  return (
    <Layout>
      <div className={cn("mx-auto max-w-4xl px-4 py-3 md:px-6", className)}>
        <div
          className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8"
          role="status"
          aria-label="Loading form"
        >
          <div className="space-y-3 text-center">
            <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
            <Skeleton className="mx-auto h-6 w-40" />
            <Skeleton className="mx-auto h-4 w-56" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <span className="sr-only">Loading form</span>
        </div>
      </div>
    </Layout>
  );
}
