import type { BlogPostResponse } from "@/app/actions/blogActions";

export interface MonthArchiveStats {
  month: number;
  postCount: number;
  puzzleTypes: Record<string, number>;
}

export interface YearArchiveStats {
  year: number;
  months: MonthArchiveStats[];
  totalPosts: number;
}

export interface ArchiveStats {
  years: YearArchiveStats[];
  totalPosts: number;
}

/** Pure aggregation of posts into year/month archive stats (not a server action). */
export function computeBlogArchiveStats(posts: BlogPostResponse[]): ArchiveStats {
  const grouped = new Map<number, Map<number, MonthArchiveStats>>();

  for (const post of posts) {
    const date = new Date(post.publishedAt ?? post.date);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const months = grouped.get(year) ?? new Map<number, MonthArchiveStats>();
    const current = months.get(month) ?? { month, postCount: 0, puzzleTypes: {} };
    const type = post.puzzleType || "rebus";
    current.postCount += 1;
    current.puzzleTypes[type] = (current.puzzleTypes[type] || 0) + 1;
    months.set(month, current);
    grouped.set(year, months);
  }

  const years = [...grouped.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, months]): YearArchiveStats => {
      const sortedMonths = [...months.values()].sort((a, b) => b.month - a.month);
      return {
        year,
        months: sortedMonths,
        totalPosts: sortedMonths.reduce((sum, item) => sum + item.postCount, 0),
      };
    });

  return { years, totalPosts: posts.length };
}
