"use client";

import {
  Award,
  Crown,
  Flame,
  Medal,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Layout from "@/components/Layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyticsEvents, trackEvent } from "@/lib/analytics";
import { generateItemListSchema } from "@/lib/seo/structured-data";

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    email: string;
  };
  stats: {
    points: number;
    streak: number;
    totalGames: number;
    wins: number;
    level: number;
    dailyChallengeStreak: number;
    completionRate?: number;
  };
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<
    "today" | "week" | "month" | "allTime"
  >("today");
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, userId } = useAuth();
  const userEntryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent(analyticsEvents.LEADERBOARD_VIEW, {
      timeframe,
    });
  }, [timeframe]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/leaderboard?limit=10&timeframe=${timeframe}`
        );
        const data = await response.json();

        if (data.success) {
          setLeaderboard(data.leaderboard);
        } else {
          console.error("Failed to fetch leaderboard:", data.error);
          setLeaderboard([]);
        }

        if (isAuthenticated && userId) {
          const userResponse = await fetch(`/api/user/stats?userId=${userId}`);
          const userData = await userResponse.json();
          if (userData.success) {
            if (userData.rank) {
              setUserRank(userData.rank);
            }
            // Check if user is in top 10 leaderboard
            const userInLeaderboard = data.leaderboard.find(
              (entry: LeaderboardEntry) => entry.user.id === userId
            );
            if (userInLeaderboard) {
              // User is in top 10, use their entry from leaderboard
              setUserEntry(userInLeaderboard);
            } else if (userData.user && userData.stats && userData.rank) {
              // User is not in top 10, construct entry from stats
              const userEntry: LeaderboardEntry = {
                rank: userData.rank,
                user: {
                  id: userData.user.id,
                  username: userData.user.username,
                  email: userData.user.email,
                },
                stats: {
                  points: userData.stats.points || 0,
                  streak: userData.stats.streak || 0,
                  totalGames: userData.stats.totalGames || 0,
                  wins: userData.stats.wins || 0,
                  level: userData.stats.level || 0,
                  dailyChallengeStreak: userData.stats.dailyChallengeStreak || 0,
                  completionRate: userData.stats.completionRate,
                },
              };
              setUserEntry(userEntry);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeframe, isAuthenticated, userId]);

  const scrollToUserPosition = () => {
    if (userEntryRef.current) {
      userEntryRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      // Add a temporary highlight effect
      userEntryRef.current.classList.add("ring-2", "ring-primary", "ring-offset-2");
      setTimeout(() => {
        userEntryRef.current?.classList.remove(
          "ring-2",
          "ring-primary",
          "ring-offset-2"
        );
      }, 2000);
    }
  };

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="relative flex size-14 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-yellow-500/20 motion-safe:animate-pulse" />
            <div className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/30 border-2 border-yellow-300/50">
              <Crown className="size-7 text-yellow-50" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 shadow-lg shadow-gray-400/30 border-2 border-gray-200/50">
            <Medal className="size-7 text-gray-50" />
          </div>
        );
      case 3:
        return (
          <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 border-2 border-orange-300/50">
            <Award className="size-7 text-orange-50" />
          </div>
        );
      default:
        return (
          <div className="flex size-10 items-center justify-center rounded-full bg-muted font-semibold text-sm text-foreground tabular-nums">
            {rank}
          </div>
        );
    }
  };

  const getAvatarFallback = (username: string) =>
    `/avatars/${username.toLowerCase().charAt(0)}.svg`;

  const leaderboardSchema =
    leaderboard.length > 0
      ? generateItemListSchema({
          items: leaderboard.map((entry) => ({
            id: entry.user.id,
            name: entry.user.username,
          })),
          name: "Rebuzzle Leaderboard",
          description: "Top players on Rebuzzle leaderboard",
          url: "/leaderboard",
        })
      : null;

  return (
    <Layout>
      {leaderboardSchema && (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(leaderboardSchema),
          }}
          type="application/ld+json"
        />
      )}

      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="mb-2 flex items-center gap-3">
            <Trophy className="size-5 text-primary" />
            <h1 className="font-semibold text-base md:text-lg">
              Leaderboard
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Compete with the best puzzle solvers worldwide
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="mb-6 flex justify-center">
          <Tabs
            value={timeframe}
            onValueChange={(value) =>
              setTimeframe(value as typeof timeframe)
            }
            className="w-full max-w-md"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="today" className="font-medium text-sm">
                Today
              </TabsTrigger>
              <TabsTrigger value="week" className="font-medium text-sm">
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="font-medium text-sm">
                Month
              </TabsTrigger>
              <TabsTrigger value="allTime" className="font-medium text-sm">
                All Time
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* User's Rank Highlight */}
        {userRank && (
          <Card
            className={`mb-6 border-primary/30 bg-primary/5 ${
              userRank > 10 ? "border-2" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/20">
                    <Trophy className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base text-foreground">
                      You're #{userRank.toLocaleString()}!
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {userRank <= 10
                        ? "Keep climbing to the top"
                        : userRank <= 100
                          ? "You're in the top 100!"
                          : "Keep solving puzzles to climb higher"}
                    </p>
                  </div>
                </div>
                {userRank > 10 && (
                  <Button
                    onClick={scrollToUserPosition}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 font-medium text-sm"
                  >
                    <ArrowDown className="size-3.5" />
                    Jump to my position
                  </Button>
                )}
                {userRank <= 10 && (
                  <Badge variant="secondary" className="gap-1.5">
                    <Flame className="size-3.5" />
                    On Fire!
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card>
          {loading ? (
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="size-10 rounded-full" />
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          ) : leaderboard.length === 0 ? (
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                <Trophy className="size-8 text-muted-foreground/50" />
              </div>
              <p className="mb-2 font-semibold text-base text-foreground">
                No leaderboard data yet
              </p>
              <p className="text-muted-foreground text-sm">
                Be the first to solve a puzzle and claim the top spot!
              </p>
            </CardContent>
          ) : (
            <div className="divide-y divide-border">
              {leaderboard.map((entry) => {
                const winRate =
                  entry.stats.totalGames > 0
                    ? Math.round(
                        (entry.stats.wins / entry.stats.totalGames) * 100,
                      )
                    : 0;
                const isTopThree = entry.rank <= 3;
                const isCurrentUser = entry.user.id === userId;

                return (
                  <div
                    key={entry.rank}
                    ref={isCurrentUser ? userEntryRef : null}
                    className={`
                      transition-colors hover:bg-accent/50
                      ${isTopThree ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" : ""}
                      ${isCurrentUser ? "bg-primary/10 border-l-4 border-l-primary" : ""}
                    `}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Rank Display */}
                        <div className="flex-shrink-0">
                          {getRankDisplay(entry.rank)}
                        </div>

                        {/* Avatar */}
                        <Avatar className="size-10 flex-shrink-0">
                          <AvatarImage
                            src={getAvatarFallback(entry.user.username)}
                            alt={entry.user.username}
                          />
                          <AvatarFallback>
                            {entry.user.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Player Info */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-center gap-2">
                            <h3 className="truncate font-semibold text-base text-foreground">
                              {entry.user.username}
                              {isCurrentUser && (
                                <span className="ml-2 text-muted-foreground text-sm">
                                  (You)
                                </span>
                              )}
                            </h3>
                            {entry.stats.level > 0 && (
                              <Badge
                                variant="outline"
                                className="gap-1 font-medium text-xs"
                              >
                                <Zap className="size-3" />
                                Lvl {entry.stats.level}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
                            <span className="flex items-center gap-1.5">
                              <Target className="size-3.5" />
                              <span className="tabular-nums">
                                {entry.stats.totalGames}
                              </span>{" "}
                              games
                            </span>
                            {entry.stats.completionRate !== undefined ? (
                              <span className="flex items-center gap-1.5">
                                <TrendingUp className="size-3.5" />
                                <span className="tabular-nums">
                                  {Math.round(entry.stats.completionRate)}%
                                </span>{" "}
                                completed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5">
                                <TrendingUp className="size-3.5" />
                                <span className="tabular-nums">{winRate}%</span>{" "}
                                win rate
                              </span>
                            )}
                            {entry.stats.streak > 0 && (
                              <Badge
                                variant="secondary"
                                className="gap-1 font-medium text-xs"
                              >
                                <Flame className="size-3" />
                                <span className="tabular-nums">
                                  {entry.stats.streak}
                                </span>{" "}
                                day streak
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Score Display */}
                        <div className="flex-shrink-0 text-right">
                          <div className="font-semibold text-lg text-foreground tabular-nums">
                            {entry.stats.points.toLocaleString()}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            points
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                );
              })}

              {/* User's Entry if not in top 10 */}
              {userEntry && userRank && userRank > 10 && (
                <>
                  <div className="border-t-2 border-dashed border-border" />
                  <div
                    ref={userEntryRef}
                    className="bg-primary/10 border-l-4 border-l-primary transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Rank Display */}
                        <div className="flex-shrink-0">
                          {getRankDisplay(userEntry.rank)}
                        </div>

                        {/* Avatar */}
                        <Avatar className="size-10 flex-shrink-0">
                          <AvatarImage
                            src={getAvatarFallback(userEntry.user.username)}
                            alt={userEntry.user.username}
                          />
                          <AvatarFallback>
                            {userEntry.user.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Player Info */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-center gap-2">
                            <h3 className="truncate font-semibold text-base text-foreground">
                              {userEntry.user.username}
                              <span className="ml-2 text-muted-foreground text-sm">
                                (You)
                              </span>
                            </h3>
                            {userEntry.stats.level > 0 && (
                              <Badge
                                variant="outline"
                                className="gap-1 font-medium text-xs"
                              >
                                <Zap className="size-3" />
                                Lvl {userEntry.stats.level}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
                            <span className="flex items-center gap-1.5">
                              <Target className="size-3.5" />
                              <span className="tabular-nums">
                                {userEntry.stats.totalGames}
                              </span>{" "}
                              games
                            </span>
                            {userEntry.stats.completionRate !== undefined ? (
                              <span className="flex items-center gap-1.5">
                                <TrendingUp className="size-3.5" />
                                <span className="tabular-nums">
                                  {Math.round(userEntry.stats.completionRate)}%
                                </span>{" "}
                                completed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5">
                                <TrendingUp className="size-3.5" />
                                <span className="tabular-nums">
                                  {userEntry.stats.totalGames > 0
                                    ? Math.round(
                                        (userEntry.stats.wins /
                                          userEntry.stats.totalGames) *
                                          100,
                                      )
                                    : 0}
                                  %
                                </span>{" "}
                                win rate
                              </span>
                            )}
                            {userEntry.stats.streak > 0 && (
                              <Badge
                                variant="secondary"
                                className="gap-1 font-medium text-xs"
                              >
                                <Flame className="size-3" />
                                <span className="tabular-nums">
                                  {userEntry.stats.streak}
                                </span>{" "}
                                day streak
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Score Display */}
                        <div className="flex-shrink-0 text-right">
                          <div className="font-semibold text-lg text-foreground tabular-nums">
                            {userEntry.stats.points.toLocaleString()}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            points
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Call to Action */}
        <div className="mt-8 text-center">
          <Link href="/">
            <Button size="lg" className="font-medium text-sm">
              Play Today's Puzzle
            </Button>
          </Link>
        </div>

        {/* Info Box */}
        <Card className="mt-8 bg-accent/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-semibold text-base">
              <Trophy className="size-5 text-primary" />
              How Scoring Works
            </CardTitle>
            <CardDescription className="text-sm">
              Learn how points are calculated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg bg-card/50 p-3">
                <Zap className="size-4 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    Speed Bonus
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Solve faster for more points
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-card/50 p-3">
                <Target className="size-4 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    Accuracy Matters
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Fewer attempts = higher score
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-card/50 p-3">
                <Flame className="size-4 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    Streak Multiplier
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Build streaks for bonus points
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-card/50 p-3">
                <TrendingUp className="size-4 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    Difficulty Bonus
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Harder puzzles = bigger rewards
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
