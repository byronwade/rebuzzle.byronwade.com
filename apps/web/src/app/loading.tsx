import { HomePageSkeleton } from "@/components/page-skeletons";

/**
 * Instant route shell — content-shaped, never a bare spinner.
 * Most navigations land on the puzzle; other routes with their own
 * loading.tsx override this.
 */
export default function RootLoading() {
  return <HomePageSkeleton />;
}
