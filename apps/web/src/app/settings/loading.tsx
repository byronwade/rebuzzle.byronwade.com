import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </Layout>
  );
}
