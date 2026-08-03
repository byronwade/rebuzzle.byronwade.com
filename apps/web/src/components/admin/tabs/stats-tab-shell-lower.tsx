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


import { StatsTabShellLowerB } from "./stats-tab-shell-lower-b";

export function StatsTabShellLower(props: Record<string, any>) {
  const {
    _selectedPreset,
    dateRange,
    handleDateChange,
    setDateRange,
    setSelectedPreset
  } = props;
  return (
    <>

      {/* Time Series Data */}
      {stats.timeSeries && (
        <div className="space-y-6 border-t pt-6">
          <div>
            <h3 className="mb-1 font-semibold text-lg tracking-tight md:text-xl">
              Time Series Analytics
            </h3>
            <p className="text-muted-foreground text-sm">
              Daily trends and patterns over the selected time period
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <TimeSeriesChart
              color="hsl(var(--chart-1))"
              data={stats.timeSeries.dailyPuzzleCompletions}
              description="Number of puzzles successfully completed each day"
              title="Daily Puzzle Completions"
            />
            <TimeSeriesChart
              color="hsl(var(--chart-2))"
              data={stats.timeSeries.dailyPuzzleAttempts}
              description="Total number of puzzle attempts made each day"
              title="Daily Puzzle Attempts"
            />
            <TimeSeriesChart
              color="hsl(var(--chart-3))"
              data={stats.timeSeries.dailyGameSessions}
              description="Number of game sessions started each day"
              title="Daily Game Sessions"
            />
            <AreaChart
              color="hsl(var(--chart-4))"
              data={stats.dailySignups}
              description="Cumulative number of user signups over time"
              title="User Growth (Cumulative)"
            />
          </div>
        </div>
      )}

      {/* Advanced Analytics */}
      {stats.advancedAnalytics && (
      <StatsTabShellLowerB {...props} />
  );
}
