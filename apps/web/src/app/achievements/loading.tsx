import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function AchievementsLoading() {
  return (
    <Layout>
      <div
        className="mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-6"
        role="status"
        aria-label="Loading achievements"
      >
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton className="h-14 w-full rounded-xl" key={i} />
          ))}
        </div>
        <span className="sr-only">Loading achievements</span>
      </div>
    </Layout>
  );
}
