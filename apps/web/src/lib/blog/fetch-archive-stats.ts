import { cacheLife, cacheTag } from "next/cache";
import { fetchAllBlogPosts } from "@/app/actions/blogActions";
import { computeBlogArchiveStats, type ArchiveStats } from "@/lib/blog/archive-stats";

/**
 * Cached public read of blog archive stats.
 * Kept outside "use server" modules so it is not exposed as a callable server action.
 */
export async function fetchBlogArchiveStats(): Promise<ArchiveStats> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog-posts", "blog-archive");

  const posts = await fetchAllBlogPosts();
  return computeBlogArchiveStats(posts);
}
