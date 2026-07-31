import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-6">
        <Skeleton className="mx-auto h-20 w-20 rounded-full" />
        <Skeleton className="mx-auto h-6 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    </Layout>
  );
}
