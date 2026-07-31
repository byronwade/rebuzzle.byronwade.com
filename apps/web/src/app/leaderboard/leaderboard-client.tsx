"use client";

import {
  ArrowDown,
  Award,
  ChevronRight,
  Crown,
  Flame,
  Medal,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Layout from "@/components/Layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyticsEvents, trackEvent } from "@/lib/analytics";
import { getLevelProgress as getProgress } from "@/lib/gameSettings";
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

// Use centralized level progress calculation
const getLevelProgress = (_level: number, points: number) => {
  return getProgress(points);
};

interface LeaderboardClientProps {
  initialLeaderboard: LeaderboardEntry[];
  initialTimeframe?: "today" | "week" | "month" | "allTime";
  initialSortBy?: "points" | "streak";
}

export default function LeaderboardClient({
  initialLeaderboard,
  initialTimeframe = "allTime",
  initialSortBy = "points",
}: LeaderboardClientProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month" | "allTime">(
    initialTimeframe
  );
  const [sortBy, setSortBy] = useState<"points" | "streak">(initialSortBy);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, userId } = useAuth();
  const userEntryRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    trackEvent(analyticsEvents.LEADERBOARD_VIEW, {
      timeframe,
    });
  }, [timeframe]);

  useEffect(() => {
    // Skip the first fetch when server already provided matching initial data
    if (!hasMounted.current) {
      hasMounted.current = true;
      if (timeframe === initialTimeframe && sortBy === initialSortBy) {
        return;
      }
    }

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/leaderboard?limit=25&timeframe=${timeframe}&sortBy=${sortBy}`
        );
        const data = await response.json();

        if (data.success) {
          setLeaderboard(data.leaderboard);
        } else {
          console.error("Failed to fetch leaderboard:", data.error);
          setLeaderboard([]);
        }

        if (isAuthenticated && userId) {
          const userResponse = await fetch(
            `/api/user/stats?userId=${userId}&timeframe=${timeframe}`
          );
          const userData = await userResponse.json();
          if (userData.success) {
            if (userData.rank) {
              setUserRank(userData.rank);
            }
            const userInLeaderboard = data.leaderboard.find(
              (entry: LeaderboardEntry) => entry.user.id === userId
            );
            if (userInLeaderboard) {
              setUserEntry(userInLeaderboard);
            } else if (userData.user && userData.stats && userData.rank) {
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
  }, [timeframe, sortBy, isAuthenticated, userId, initialTimeframe, initialSortBy]);

  const scrollToUserPosition = () => {
    if (userEntryRef.current) {
      userEntryRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      userEntryRef.current.classList.add("ring-2", "ring-warning", "ring-offset-2");
      setTimeout(() => {
        userEntryRef.current?.classList.remove("ring-2", "ring-warning", "ring-offset-2");
      }, 2000);
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

  // Get top 3 for podium display (only if we have exactly 3+)
  const showPodium = leaderboard.length >= 3;
  const topThree = showPodium ? leaderboard.slice(0, 3) : [];
  const restOfLeaderboard = showPodium ? leaderboard.slice(3) : leaderboard;

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

      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        {/* Header */}
        <header className="mb-8 text-center">
          <p className="eyebrow">Standings</p>
          <h1 className="mt-4 font-semibold text-4xl tracking-[-0.045em]">Leaderboard.</h1>
          <p className="mt-3 text-muted-foreground text-sm">
            The best puzzle solvers today, ranked.
          </p>
        </header>

        {/* Sort By Toggle - Points vs Streaks */}
        <div className="mb-4 flex justify-center gap-2">
          <Button
            variant={sortBy === "points" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("points")}
            className="gap-1.5"
          >
            <Trophy className="size-4" />
            Points
          </Button>
          <Button
            variant={sortBy === "streak" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("streak")}
            className="gap-1.5"
          >
            <Flame className="size-4" />
            Streaks
          </Button>
        </div>

        {/* Timeframe Selector - only show for points ranking */}
        {sortBy === "points" && (
          <div className="mb-6 flex justify-center">
            <Tabs
              value={timeframe}
              onValueChange={(value) => setTimeframe(value as typeof timeframe)}
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
        )}

        {/* Streak leaderboard description */}
        {sortBy === "streak" && (
          <div className="mb-6 text-center">
            <p className="text-sm text-muted-foreground">
              Players with the longest active win streaks
            </p>
          </div>
        )}

        {/* User's Rank Highlight */}
        {userRank && userEntry && (
          <Card className="mb-6 border-warning/25 bg-warning/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-warning font-mono font-medium text-background text-sm tabular-nums">
                    #{userRank}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">Your ranking</p>
                    <p className="font-mono text-subtle text-xs tabular-nums">
                      {userEntry.stats.points.toLocaleString()} points
                    </p>
                    {/* XP Progress Bar */}
                    {userEntry.stats.level > 0 && (
                      <div className="mt-2 w-40">
                        <div className="mb-1.5 flex justify-between font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
                          <span>Lvl {userEntry.stats.level}</span>
                          <span>Lvl {userEntry.stats.level + 1}</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-inset">
                          <div
                            className="h-full bg-warning rounded-full transition-all duration-500"
                            style={{
                              width: `${getLevelProgress(userEntry.stats.level, userEntry.stats.points)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {userRank > 25 && (
                    <Button
                      onClick={scrollToUserPosition}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-medium text-sm"
                    >
                      <ArrowDown className="size-3.5" />
                      Find me
                    </Button>
                  )}
                  {userRank <= 25 && (
                    <Badge variant="secondary" className="gap-1.5">
                      <Flame className="size-3.5 text-warning" />
                      Top 25
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
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
          </Card>
        ) : leaderboard.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                <Trophy className="size-8 text-muted-foreground" />
              </div>
              <p className="mb-2 font-semibold text-lg text-foreground">No champions yet</p>
              <p className="text-muted-foreground text-sm mb-4">
                Be the first to solve a puzzle and claim the top spot!
              </p>
              <Link href="/">
                <Button>Start Playing</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Podium Display for Top 3 (only show if we have all 3) */}
            {topThree.length === 3 && topThree[0] && topThree[1] && topThree[2] && (
              <div className="mb-6">
                <div className="flex items-end justify-center gap-3 md:gap-6">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center w-24 md:w-32">
                    <Avatar className="size-14 md:size-16 border-2 border-border-strong shadow-md mb-2">
                      <AvatarImage
                        src={getAvatarFallback(topThree[1].user.username)}
                        alt={topThree[1].user.username}
                      />
                      <AvatarFallback className="bg-inset text-lg font-semibold">
                        {topThree[1].user.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm truncate w-full text-center">
                      {topThree[1].user.username}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {topThree[1].stats.points.toLocaleString()} pts
                    </p>
                    <div className="w-full h-16 md:h-20 bg-inset rounded-t-lg flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <Medal className="size-5 text-subtle" />
                        <span className="text-xl font-semibold text-muted-foreground">2</span>
                      </div>
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center w-28 md:w-36">
                    <div className="relative">
                      <Crown className="size-6 text-warning absolute -top-5 left-1/2 -translate-x-1/2" />
                      <Avatar className="size-16 md:size-20 border-2 border-warning shadow-lg mb-2">
                        <AvatarImage
                          src={getAvatarFallback(topThree[0].user.username)}
                          alt={topThree[0].user.username}
                        />
                        <AvatarFallback className="bg-warning/10 text-xl font-semibold">
                          {topThree[0].user.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <p className="font-semibold text-base truncate w-full text-center">
                      {topThree[0].user.username}
                    </p>
                    <p className="text-sm text-warning font-medium mb-2">
                      {topThree[0].stats.points.toLocaleString()} pts
                    </p>
                    <div className="w-full h-20 md:h-24 bg-warning/10 rounded-t-lg flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <Trophy className="size-6 text-warning" />
                        <span className="text-2xl font-semibold text-warning">1</span>
                      </div>
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center w-24 md:w-32">
                    <Avatar className="size-14 md:size-16 border-2 border-border shadow-md mb-2">
                      <AvatarImage
                        src={getAvatarFallback(topThree[2].user.username)}
                        alt={topThree[2].user.username}
                      />
                      <AvatarFallback className="bg-inset text-lg font-semibold">
                        {topThree[2].user.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm truncate w-full text-center">
                      {topThree[2].user.username}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {topThree[2].stats.points.toLocaleString()} pts
                    </p>
                    <div className="w-full h-12 md:h-16 bg-inset rounded-t-lg flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <Award className="size-5 text-muted-foreground" />
                        <span className="text-xl font-semibold text-muted-foreground">3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rest of Leaderboard */}
            <Card>
              <div className="divide-y divide-border">
                {restOfLeaderboard.map((entry, index) => {
                  const actualRank = showPodium ? index + 4 : index + 1;
                  const isCurrentUser = entry.user.id === userId;

                  return (
                    <div
                      key={entry.rank}
                      ref={isCurrentUser ? userEntryRef : null}
                      className={`
                        transition-colors hover:bg-accent/50
                        ${isCurrentUser ? "bg-warning/[0.06] border-l-2 border-l-warning" : ""}
                      `}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 md:gap-4">
                          {/* Rank Display */}
                          <div className="flex-shrink-0 w-8 text-center">
                            <span className="font-semibold text-base text-muted-foreground">
                              {actualRank}
                            </span>
                          </div>

                          {/* Avatar */}
                          <Avatar className="size-10 flex-shrink-0">
                            <AvatarImage
                              src={getAvatarFallback(entry.user.username)}
                              alt={entry.user.username}
                            />
                            <AvatarFallback>{entry.user.username[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>

                          {/* Player Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-semibold text-sm md:text-base text-foreground">
                                {entry.user.username}
                                {isCurrentUser && (
                                  <span className="ml-2 text-warning text-xs font-normal">
                                    (You)
                                  </span>
                                )}
                              </h3>
                              {entry.stats.level > 0 && (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Zap className="size-3" />
                                  Lvl {entry.stats.level}
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs mt-1">
                              <span className="flex items-center gap-1">
                                <Target className="size-3" />
                                {entry.stats.totalGames} games
                              </span>
                              {entry.stats.streak > 0 && (
                                <span className="flex items-center gap-1 text-warning">
                                  <Flame className="size-3" />
                                  {entry.stats.streak} day streak
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Score Display */}
                          <div className="flex-shrink-0 text-right">
                            <div className="font-semibold text-lg text-foreground tabular-nums">
                              {entry.stats.points.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground text-xs">points</div>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  );
                })}

                {/* User's Entry if not in top 25 */}
                {userEntry && userRank && userRank > 25 && (
                  <>
                    <div className="border-t-2 border-dashed border-border" />
                    <div
                      ref={userEntryRef}
                      className="bg-warning/[0.06] border-l-2 border-l-warning transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 md:gap-4">
                          {/* Rank Display */}
                          <div className="flex-shrink-0 w-8 text-center">
                            <span className="font-semibold text-base text-warning">{userRank}</span>
                          </div>

                          {/* Avatar */}
                          <Avatar className="size-10 flex-shrink-0 border border-warning">
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
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-semibold text-sm md:text-base text-foreground">
                                {userEntry.user.username}
                                <span className="ml-2 text-warning text-xs font-normal">(You)</span>
                              </h3>
                              {userEntry.stats.level > 0 && (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Zap className="size-3" />
                                  Lvl {userEntry.stats.level}
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs mt-1">
                              <span className="flex items-center gap-1">
                                <Target className="size-3" />
                                {userEntry.stats.totalGames} games
                              </span>
                              {userEntry.stats.streak > 0 && (
                                <span className="flex items-center gap-1 text-warning">
                                  <Flame className="size-3" />
                                  {userEntry.stats.streak} day streak
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Score Display */}
                          <div className="flex-shrink-0 text-right">
                            <div className="font-semibold text-lg text-foreground tabular-nums">
                              {userEntry.stats.points.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground text-xs">points</div>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </>
        )}

        {/* Call to Action */}
        <div className="mt-8 text-center">
          <Link href="/">
            <Button size="lg" className="font-medium">
              Play Today's Puzzle
            </Button>
          </Link>
        </div>

        {/* Achievements & Levels Link */}
        <Link href="/achievements">
          <Card className="group mt-8 cursor-pointer border-border transition-colors hover:border-border-strong/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7928ca] to-[#ff0080]">
                    <Sparkles className="size-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-foreground">
                      Achievements & Levels
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      View all 100 achievements and 8 rank tiers
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* How Scoring Works */}
        <Card className="mt-4 bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-semibold text-base">
              <Trophy className="size-5 text-warning" />
              How Scoring Works
            </CardTitle>
            <CardDescription className="text-sm">Learn how points are calculated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg bg-background p-3">
                <Zap className="size-4 flex-shrink-0 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-foreground">Speed Bonus</p>
                  <p className="text-muted-foreground text-xs">Solve faster for more points</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-background p-3">
                <Target className="size-4 flex-shrink-0 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-foreground">Accuracy Matters</p>
                  <p className="text-muted-foreground text-xs">Fewer attempts = higher score</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-background p-3">
                <Flame className="size-4 flex-shrink-0 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-foreground">Streak Multiplier</p>
                  <p className="text-muted-foreground text-xs">Build streaks for bonus points</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-background p-3">
                <TrendingUp className="size-4 flex-shrink-0 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-foreground">Difficulty Bonus</p>
                  <p className="text-muted-foreground text-xs">Harder puzzles = bigger rewards</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
