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


import { StatsTabShellLower } from "./stats-tab-shell-lower";

import { StatsTabShellB } from "./stats-tab-shell-b";

export function StatsTabShell(props: Record<string, any>) {
  const {
    _selectedPreset,
    dateRange,
    handleDateChange,
    setDateRange,
    setSelectedPreset
  } = props;
  if (loading) {
      return (
    <>

      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card className="p-5" key={i}>
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="mb-2 h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card className="p-6" key={i}>
              <Skeleton className="mb-4 h-6 w-40" />
              <Skeleton className="h-64 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="border-2 border-dashed p-12 text-center">
        <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="mb-2 font-semibold text-lg">No statistics available</h3>
        <p className="mb-6 text-muted-foreground text-sm">
          Unable to load statistics. Please try refreshing.
        </p>
        <Button onClick={() => onRefresh(dateRange.start, dateRange.end)}>Refresh Data</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-xl tracking-tight md:text-2xl">Overview Statistics</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Key metrics and insights about your platform performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            endDate={dateRange.end}
            onDateChange={handleDateChange}
            onPresetChange={setSelectedPreset}
            startDate={dateRange.start}
          />
          <Button
            onClick={() => onRefresh(dateRange.start, dateRange.end)}
            size="sm"
            variant="outline"
          >
            Refresh
          </Button>
        </div>
      </div>

      <StatsTabShellB {...props} />
  );
}
