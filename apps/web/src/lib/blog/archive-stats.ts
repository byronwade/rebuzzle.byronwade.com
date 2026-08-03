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
