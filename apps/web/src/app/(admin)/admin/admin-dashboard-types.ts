export type Tab = "stats" | "puzzles" | "blogs" | "users" | "analytics" | "tools" | "ai-insights";

export interface AdminStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalPuzzles: number;
    activePuzzles: number;
    totalBlogPosts: number;
    publishedBlogPosts: number;
    totalUserStats: number;
    totalAnalyticsEvents: number;
    totalEmailSubscriptions: number;
  };
  recentActivity: {
    newUsersLast7Days: number;
    newPuzzlesLast7Days: number;
    newBlogPostsLast7Days: number;
    eventsLast7Days: number;
  };
  topUsers: Array<{
    userId: string;
    username: string;
    email: string;
    points: number;
    streak: number;
    wins: number;
    level: number;
  }>;
  puzzleTypes: Array<{ type: string; count: number }>;
  eventTypes: Array<{ type: string; count: number }>;
  dailySignups: Array<{ date: string; count: number }>;
  userEngagement?: {
    dailyActiveUsers: Array<{ date: string; count: number }>;
    monthlyActiveUsers: number;
    averageSessionDuration: number;
    returningVsNew: { returning: number; new: number };
    retention: { day1: number; day7: number };
    churnRate: number;
  };
  puzzlePerformance?: {
    completionRatesByType: Array<{
      type: string;
      completionRate: number;
      totalSessions: number;
      completedSessions: number;
    }>;
    averageTimeToSolve: Array<{
      type: string;
      avgTimeSeconds: number;
      count: number;
    }>;
    popularPuzzles: Array<{
      puzzleId: string;
      puzzleText: string;
      puzzleType: string;
      attempts: number;
      uniqueUsers: number;
    }>;
    difficultPuzzles: Array<{
      puzzleId: string;
      completionRate: number;
      totalSessions: number;
    }>;
    abandonmentRate: Array<{
      puzzleId: string;
      abandonmentRate: number;
    }>;
    hintUsage: Array<{ hintsUsed: number; count: number }>;
  };
  timeSeries?: {
    dailyPuzzleCompletions: Array<{ date: string; count: number }>;
    dailyPuzzleAttempts: Array<{ date: string; count: number }>;
    dailyGameSessions: Array<{ date: string; count: number }>;
    dailyEventsByType: Array<{
      date: string;
      events: Array<{ type: string; count: number }>;
    }>;
  };
  advancedAnalytics?: {
    satisfactionByType: Array<{
      type: string;
      avgSatisfaction: number;
      count: number;
    }>;
    difficultyPerception: Array<{
      puzzleId: string;
      avgPerceived: number;
      actualDifficulty: number;
      count: number;
    }>;
    peakUsageTimes: Array<{ hour: number; count: number }>;
    progressionFunnel: {
      signups: number;
      firstPuzzle: number;
      regularPlayers: number;
      conversionToFirstPuzzle: number;
      conversionToRegular: number;
    };
  };
}

export interface Puzzle {
  id: string;
  puzzle: string;
  puzzleType?: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard" | number;
  category?: string;
  explanation?: string;
  hints?: string[];
  publishedAt: string;
  createdAt?: string;
  active: boolean;
  metadata?: Record<string, any>;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  authorId: string;
  puzzleId: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  stats?: {
    points: number;
    streak: number;
    totalGames: number;
    wins: number;
    level: number;
    dailyChallengeStreak: number;
    lastPlayDate?: string;
  } | null;
}

