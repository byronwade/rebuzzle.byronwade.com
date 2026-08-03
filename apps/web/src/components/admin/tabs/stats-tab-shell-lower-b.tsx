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



export function StatsTabShellLowerB(props: Record<string, any>) {
  const {
    _selectedPreset,
    dateRange,
    handleDateChange,
    setDateRange,
    setSelectedPreset
  } = props;
  return (
    <>
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
                  <div className="font-medium text-muted-foreground text-sm">Total Signups</div>
                  <div className="text-muted-foreground text-xs">Starting point</div>
                </div>
                <div className="space-y-2 text-center">
                  <div className="font-semibold text-3xl text-primary">
                    {stats.advancedAnalytics.progressionFunnel.firstPuzzle.toLocaleString()}
                  </div>
                  <div className="font-medium text-muted-foreground text-sm">
                    First Puzzle Completed
                  </div>
                  <div className="font-medium text-neutral-700 text-xs dark:text-neutral-400">
                    {stats.advancedAnalytics.progressionFunnel.conversionToFirstPuzzle.toFixed(1)}%
                    conversion
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <div className="font-semibold text-3xl text-primary">
                    {stats.advancedAnalytics.progressionFunnel.regularPlayers.toLocaleString()}
                  </div>
                  <div className="font-medium text-muted-foreground text-sm">
                    Regular Players (10+ games)
                  </div>
                  <div className="font-medium text-neutral-700 text-xs dark:text-neutral-400">
                    {stats.advancedAnalytics.progressionFunnel.conversionToRegular.toFixed(1)}%
                    conversion
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
            <CardDescription>Top 10 users ranked by total points earned</CardDescription>
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
                      <div className="text-muted-foreground text-xs">{user.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">{user.points.toLocaleString()} pts</div>
                    <div className="text-muted-foreground text-xs">
                      Level {user.level} • {user.wins} wins • {user.streak} day streak
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
          <CardDescription>Quick overview of platform activity in the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-background/50 p-4">
              <div className="mb-1 font-medium text-muted-foreground text-sm">New Users</div>
              <div className="font-semibold text-2xl">
                {stats.recentActivity.newUsersLast7Days.toLocaleString()}
              </div>
              <div className="mt-1 text-muted-foreground text-xs">Registered this week</div>
            </div>
            <div className="rounded-lg border bg-background/50 p-4">
              <div className="mb-1 font-medium text-muted-foreground text-sm">New Puzzles</div>
              <div className="font-semibold text-2xl">
                {stats.recentActivity.newPuzzlesLast7Days.toLocaleString()}
              </div>
              <div className="mt-1 text-muted-foreground text-xs">Added this week</div>
            </div>
            <div className="rounded-lg border bg-background/50 p-4">
              <div className="mb-1 font-medium text-muted-foreground text-sm">New Blog Posts</div>
              <div className="font-semibold text-2xl">
                {stats.recentActivity.newBlogPostsLast7Days.toLocaleString()}
              </div>
              <div className="mt-1 text-muted-foreground text-xs">Published this week</div>
            </div>
            <div className="rounded-lg border bg-background/50 p-4">
              <div className="mb-1 font-medium text-muted-foreground text-sm">Analytics Events</div>
              <div className="font-semibold text-2xl">
                {stats.recentActivity.eventsLast7Days.toLocaleString()}
              </div>
              <div className="mt-1 text-muted-foreground text-xs">Tracked this week</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>    </>
    </>
  );
}
