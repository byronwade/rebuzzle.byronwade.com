"use client";

import {
  Activity,
  BarChart3,
  BookOpen,
  Clock,
  Mail,
  Puzzle,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { AreaChart } from "@/components/admin/charts/AreaChart";
import { BarChart } from "@/components/admin/charts/BarChart";
import { PieChart } from "@/components/admin/charts/PieChart";
import { TimeSeriesChart } from "@/components/admin/charts/TimeSeriesChart";
import { DateRangePicker, type DateRangePreset } from "@/components/admin/DateRangePicker";
import { MetricCard } from "@/components/admin/MetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminStats {
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
    wins: number;
    streak: number;
    level: number;
  }>;
  puzzleTypes: Array<{ type: string; count: number }>;
  dailySignups: Array<{ date: string; count: number }>;
  userEngagement?: {
    monthlyActiveUsers: number;
    averageSessionDuration: number;
    retention: { day1: number; day7: number };
    churnRate: number;
    dailyActiveUsers: Array<{ date: string; count: number }>;
    returningVsNew: { returning: number; new: number };
  };
  puzzlePerformance?: {
    completionRatesByType: Array<{ type: string; completionRate: number }>;
    averageTimeToSolve: Array<{ type: string; avgTimeSeconds: number }>;
    popularPuzzles: Array<{ puzzleText: string; attempts: number }>;
    difficultPuzzles: Array<{ puzzleText: string; attempts: number }>;
    abandonmentRate: number;
    hintUsage: Array<{ hintsUsed: number; count: number }>;
  };
  timeSeries?: {
    dailyPuzzleCompletions: Array<{ date: string; count: number }>;
    dailyPuzzleAttempts: Array<{ date: string; count: number }>;
    dailyGameSessions: Array<{ date: string; count: number }>;
    dailyEventsByType: Array<{ date: string; events: any }>;
  };
  advancedAnalytics?: {
    satisfactionByType: Array<{ type: string; avgSatisfaction: number }>;
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


export function useStatsTab(props: any = {}) {

  stats,
  loading,
  onRefresh,
}: {
  stats: AdminStats | null;
  loading: boolean;
  onRefresh: (startDate?: Date | null, endDate?: Date | null) => void;
}) {
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>(() => ({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  }));
  const [_selectedPreset, setSelectedPreset] = useState<DateRangePreset>("30d");

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
    onRefresh(start, end);
  };


  return {
    _selectedPreset,
    dateRange,
    handleDateChange,
    setDateRange,
    setSelectedPreset
  };
}
