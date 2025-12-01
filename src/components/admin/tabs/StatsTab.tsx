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
import { useEffect, useRef, useState } from "react";
import { AreaChart } from "@/components/admin/charts/AreaChart";
import { BarChart } from "@/components/admin/charts/BarChart";
import { DateRangePicker, type DateRangePreset } from "@/components/admin/DateRangePicker";
import { MetricCard } from "@/components/admin/MetricCard";
import { PieChart } from "@/components/admin/charts/PieChart";
import { TimeSeriesChart } from "@/components/admin/charts/TimeSeriesChart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    difficultyPerception: Array<{ puzzleId: string; avgPerceived: number; actualDifficulty: number; count: number }>;
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

export function StatsTab({
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
  }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>("30d");
  const prevDateRangeRef = useRef<{ start: Date | null; end: Date | null } | null>(null);

  useEffect(() => {
    // Compare dates to prevent unnecessary calls
    const prevRange = prevDateRangeRef.current;
    const currentStart = dateRange.start?.getTime() ?? null;
    const currentEnd = dateRange.end?.getTime() ?? null;
    const prevStart = prevRange?.start?.getTime() ?? null;
    const prevEnd = prevRange?.end?.getTime() ?? null;

    // Only call if dates actually changed
    if (currentStart !== prevStart || currentEnd !== prevEnd) {
      prevDateRangeRef.current = { start: dateRange.start, end: dateRange.end };
      onRefresh(dateRange.start, dateRange.end);
    }
  }, [dateRange.start, dateRange.end, onRefresh]);

  if (loading) {
    return (
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
        <Button onClick={() => onRefresh(dateRange.start, dateRange.end)}>
          Refresh Data
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-xl tracking-tight md:text-2xl">
            Overview Statistics
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Key metrics and insights about your platform performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            endDate={dateRange.end}
            onDateChange={(start, end) => setDateRange({ start, end })}
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
              formatValue={(v) =>
                typeof v === "number" ? v.toLocaleString() : v
              }
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
            data={stats.puzzlePerformance.popularPuzzles
              .slice(0, 20)
              .map((p) => ({
                puzzle: p.puzzleText.substring(0, 30) + "...",
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
        <div className="space-y-6 border-t pt-6">
          <div>
            <h3 className="mb-1 font-semibold text-lg tracking-tight md:text-xl">
              Advanced Analytics
            </h3>
            <p className="text-muted-foreground text-sm">
              Deep insights into user behavior and platform performance
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <BarChart
              color="hsl(var(--chart-1))"
              data={stats.advancedAnalytics.satisfactionByType.map((s) => ({
                type: s.type || "Unknown",
                satisfaction: Math.round(s.avgSatisfaction * 100) / 100,
              }))}
              dataKey="satisfaction"
              description="Average user satisfaction rating (1-5 scale) by puzzle type"
              title="User Satisfaction by Puzzle Type"
              xAxisKey="type"
            />
            <BarChart
              color="hsl(var(--chart-2))"
              data={stats.advancedAnalytics.peakUsageTimes.map((p) => ({
                hour: `${p.hour}:00`,
                count: p.count,
              }))}
              dataKey="count"
              description="Hourly distribution of user activity throughout the day"
              title="Peak Usage Times"
              xAxisKey="hour"
            />
          </div>

          <Card className="border-2 p-6">
            <CardHeader>
              <CardTitle>User Progression Funnel</CardTitle>
              <CardDescription>
                Track how users progress from signup to becoming regular players
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2 text-center">
                  <div className="font-semibold text-3xl text-primary">
                    {stats.advancedAnalytics.progressionFunnel.signups.toLocaleString()}
                  </div>
                  <div className="font-medium text-muted-foreground text-sm">
                    Total Signups
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Starting point
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <div className="font-semibold text-3xl text-primary">
                    {stats.advancedAnalytics.progressionFunnel.firstPuzzle.toLocaleString()}
                  </div>
                  <div className="font-medium text-muted-foreground text-sm">
                    First Puzzle Completed
                  </div>
                  <div className="font-medium text-green-600 text-xs dark:text-green-400">
                    {stats.advancedAnalytics.progressionFunnel.conversionToFirstPuzzle.toFixed(
                      1
                    )}
                    % conversion
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <div className="font-semibold text-3xl text-primary">
                    {stats.advancedAnalytics.progressionFunnel.regularPlayers.toLocaleString()}
                  </div>
                  <div className="font-medium text-muted-foreground text-sm">
                    Regular Players (10+ games)
                  </div>
                  <div className="font-medium text-green-600 text-xs dark:text-green-400">
                    {stats.advancedAnalytics.progressionFunnel.conversionToRegular.toFixed(
                      1
                    )}
                    % conversion
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legacy Charts - Enhanced */}
      <div className="grid gap-6 border-t pt-6 md:grid-cols-2">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
            <CardDescription>
              Top 10 users ranked by total points earned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topUsers.slice(0, 10).map((user, index) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  key={user.userId}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-muted-foreground text-xs">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      {user.points.toLocaleString()} pts
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Level {user.level} • {user.wins} wins • {user.streak} day
                      streak
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <PieChart
          data={stats.puzzleTypes.map((pt) => ({
            name: pt.type || "Unknown",
            value: pt.count,
          }))}
          description="Breakdown of puzzles by type across your entire collection"
          title="Puzzle Types Distribution"
        />
      </div>

      {/* Recent Activity */}
      <Card className="border-2 bg-gradient-to-br from-card to-card/50 p-6">
        <CardHeader>
          <CardTitle>Recent Activity (Last 7 Days)</CardTitle>
          <CardDescription>
            Quick overview of platform activity in the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-background/50 p-4">
              <div className="mb-1 font-medium text-muted-foreground text-sm">
                New Users
              </div>
              <div className="font-semibold text-2xl">
                {stats.recentActivity.newUsersLast7Days.toLocaleString()}
              </div>
              <div className="mt-1 text-muted-foreground text-xs">
                Registered this week
              </div>
            </div>
            <div className="rounded-lg border bg-background/50 p-4">
              <div className="mb-1 font-medium text-muted-foreground text-sm">
                New Puzzles
              </div>
              <div className="font-semibold text-2xl">
                {stats.recentActivity.newPuzzlesLast7Days.toLocaleString()}
              </div>
              <div className="mt-1 text-muted-foreground text-xs">
                Added this week
              </div>
            </div>
            <div className="rounded-lg border bg-background/50 p-4">
              <div className="mb-1 font-medium text-muted-foreground text-sm">
                New Blog Posts
              </div>
              <div className="font-semibold text-2xl">
                {stats.recentActivity.newBlogPostsLast7Days.toLocaleString()}
              </div>
              <div className="mt-1 text-muted-foreground text-xs">
                Published this week
              </div>
            </div>
            <div className="rounded-lg border bg-background/50 p-4">
              <div className="mb-1 font-medium text-muted-foreground text-sm">
                Analytics Events
              </div>
              <div className="font-semibold text-2xl">
                {stats.recentActivity.eventsLast7Days.toLocaleString()}
              </div>
              <div className="mt-1 text-muted-foreground text-xs">
                Tracked this week
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


