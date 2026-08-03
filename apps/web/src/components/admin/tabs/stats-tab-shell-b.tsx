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


export function StatsTabShellB(props: Record<string, any>) {
  const {
    _selectedPreset,
    dateRange,
    handleDateChange,
    setDateRange,
    setSelectedPreset
  } = props;
  return (
    <>
      {/* Enhanced KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          description="Total registered users and those who have logged in recently"
          formatValue={(v) => (typeof v === "number" ? v.toLocaleString() : v)}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${stats.overview.activeUsers} active users`}
          title="Total Users"
          value={stats.overview.totalUsers}
        />
        <MetricCard
          description="Total puzzles in the database and currently available to users"
          formatValue={(v) => (typeof v === "number" ? v.toLocaleString() : v)}
          icon={<Puzzle className="h-5 w-5" />}
          subtitle={`${stats.overview.activePuzzles} active puzzles`}
          title="Total Puzzles"
          value={stats.overview.totalPuzzles}
        />
        <MetricCard
          description="Total blog posts created and those currently published"
          formatValue={(v) => (typeof v === "number" ? v.toLocaleString() : v)}
          icon={<BookOpen className="h-5 w-5" />}
          subtitle={`${stats.overview.publishedBlogPosts} published`}
          title="Blog Posts"
          value={stats.overview.totalBlogPosts}
        />
        <MetricCard
          description="Users subscribed to email notifications"
          formatValue={(v) => (typeof v === "number" ? v.toLocaleString() : v)}
          icon={<Mail className="h-5 w-5" />}
          subtitle="Active subscriptions"
          title="Email Subscriptions"
          value={stats.overview.totalEmailSubscriptions}
        />
      </div>

      {/* User Engagement Metrics */}
      {stats.userEngagement && (
        <div className="space-y-6 border-t pt-6">
          <div>
            <h3 className="mb-1 font-semibold text-lg tracking-tight md:text-xl">
              User Engagement
            </h3>
            <p className="text-muted-foreground text-sm">
              Metrics showing how users interact with your platform
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              description="Number of unique users who have performed any action in the selected period"
              formatValue={(v) => (typeof v === "number" ? v.toLocaleString() : v)}
              icon={<Activity className="h-5 w-5" />}
              subtitle="Users active in the last 30 days"
              title="Monthly Active Users"
              value={stats.userEngagement.monthlyActiveUsers}
            />
            <MetricCard
              description="Average time users spend in a single session"
              icon={<Clock className="h-5 w-5" />}
              subtitle={`${(stats.userEngagement.averageSessionDuration % 60).toFixed(0)}s average`}
              title="Avg Session Duration"
              value={`${Math.round(stats.userEngagement.averageSessionDuration / 60)}m`}
            />
            <MetricCard
              description="Percentage of users who return the day after their first visit"
              icon={<TrendingUp className="h-5 w-5" />}
              subtitle={`7-day: ${stats.userEngagement.retention.day7.toFixed(1)}%`}
              title="1-Day Retention"
              value={`${stats.userEngagement.retention.day1.toFixed(1)}%`}
            />
            <MetricCard
              description="Percentage of users who haven't been active in the last week"
              icon={<Target className="h-5 w-5" />}
              subtitle="Users inactive 7+ days"
              title="Churn Rate"
              value={`${stats.userEngagement.churnRate.toFixed(1)}%`}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <TimeSeriesChart
              color="hsl(var(--chart-1))"
              data={stats.userEngagement.dailyActiveUsers}
              description="Number of unique users active each day"
              title="Daily Active Users"
            />
            <BarChart
              color="hsl(var(--chart-2))"
              data={[
                {
                  type: "Returning",
                  count: stats.userEngagement.returningVsNew.returning,
                },
                {
                  type: "New",
                  count: stats.userEngagement.returningVsNew.new,
                },
              ]}
              dataKey="count"
              description="Comparison of returning users versus first-time visitors"
              title="Returning vs New Users"
              xAxisKey="type"
            />
          </div>
        </div>
      )}

      {/* Puzzle Performance Metrics */}
      {stats.puzzlePerformance && (
        <div className="space-y-6 border-t pt-6">
          <div>
            <h3 className="mb-1 font-semibold text-lg tracking-tight md:text-xl">
              Puzzle Performance
            </h3>
            <p className="text-muted-foreground text-sm">
              Analytics on puzzle completion, difficulty, and user engagement
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <BarChart
              color="hsl(var(--chart-3))"
              data={stats.puzzlePerformance.completionRatesByType.map((p) => ({
                type: p.type || "Unknown",
                rate: Math.round(p.completionRate * 100) / 100,
              }))}
              dataKey="rate"
              description="Percentage of puzzles successfully completed by puzzle type"
              title="Completion Rates by Type"
              xAxisKey="type"
            />
            <BarChart
              color="hsl(var(--chart-4))"
              data={stats.puzzlePerformance.averageTimeToSolve.map((t) => ({
                type: t.type || "Unknown",
                time: Math.round(t.avgTimeSeconds),
              }))}
              dataKey="time"
              description="Average time (in seconds) users take to complete puzzles by type"
              title="Average Time to Solve"
              xAxisKey="type"
            />
          </div>

          <BarChart
            color="hsl(var(--chart-1))"
            data={stats.puzzlePerformance.popularPuzzles.slice(0, 20).map((p) => ({
              puzzle: `${p.puzzleText.substring(0, 30)}...`,
              attempts: p.attempts,
            }))}
            dataKey="attempts"
            description="Puzzles with the highest number of attempts"
            title="Most Popular Puzzles (Top 20)"
            xAxisKey="puzzle"
          />

          <BarChart
            color="hsl(var(--chart-5))"
            data={stats.puzzlePerformance.hintUsage.map((h) => ({
              hints: `${h.hintsUsed} hint${h.hintsUsed !== 1 ? "s" : ""}`,
              count: h.count,
            }))}
            dataKey="count"
            description="How many hints users typically use when solving puzzles"
            title="Hint Usage Distribution"
            xAxisKey="hints"
          />
        </div>
      )}
      <StatsTabShellLower {...props} />
    </>
    </>
  );
}
