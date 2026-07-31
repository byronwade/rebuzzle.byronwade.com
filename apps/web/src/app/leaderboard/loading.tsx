import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaderboardLoading() {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-3 md:px-6">
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </Layout>
  );
}
