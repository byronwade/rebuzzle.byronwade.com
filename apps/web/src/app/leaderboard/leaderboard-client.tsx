"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import {
  ArrowDown,
  Award,
  ChevronRight,
  Crown,
  Flame,
  Medal,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsEvents, trackEvent } from "@/lib/analytics";
import { getLevelProgress as getProgress } from "@/lib/gameSettings";
import { serializeJsonLd } from "@/lib/seo/json-ld";
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
        if (!response.ok) {
          console.error("Failed to fetch leaderboard:", response.status);
          setLeaderboard([]);
        } else {
          const data = await response.json();

          if (data.success) {
            setLeaderboard(data.leaderboard);
          } else {
            console.error("Failed to fetch leaderboard:", data.error);
            setLeaderboard([]);
          }

          if (isAuthenticated && userId) {
            const userResponse = await fetch(
              `/api/user/stats?userId=${userId}&timeframe=${timeframe}&includeRank=true`
            );
            if (userResponse.ok) {
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
          }
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [timeframe, sortBy, isAuthenticated, userId, initialTimeframe, initialSortBy]);

  const scrollToUserPosition = () => {
    if (userEntryRef.current) {
      userEntryRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      userEntryRef.current.classList.add("ring-2", "ring-brand", "ring-offset-2");
      setTimeout(() => {
        userEntryRef.current?.classList.remove("ring-2", "ring-brand", "ring-offset-2");
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
            __html: serializeJsonLd(leaderboardSchema),
          }}
          type="application/ld+json"
        />
      )}

      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <PageHeader
          align="center"
          description={
            sortBy === "streak"
              ? "Players with the longest active win streaks."
              : "The sharpest solvers, ranked by points."
          }
          eyebrow="Standings"
          title="Leaderboard."
        />

        {/* Ranking controls — what to rank by, and over what window */}
        <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <RadioGroupPrimitive.Root
            aria-label="Rank by"
            className="inline-grid grid-cols-2 gap-1 rounded-lg bg-inset p-1"
            onValueChange={(value) => setSortBy(value as typeof sortBy)}
            orientation="horizontal"
            value={sortBy}
          >
            {(
              [
                { value: "points", label: "Points", icon: Trophy },
                { value: "streak", label: "Streaks", icon: Flame },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <RadioGroupPrimitive.Item
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-md sm:h-9 px-4 font-medium text-sm transition-colors focus-ring ${
                  sortBy === value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                key={value}
                value={value}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </RadioGroupPrimitive.Item>
            ))}
          </RadioGroupPrimitive.Root>

          {sortBy === "points" && (
            <RadioGroupPrimitive.Root
              aria-label="Time window"
              className="touch-targets inline-flex h-11 items-center gap-0.5 rounded-md border border-border bg-inset p-1"
              onValueChange={(value) => setTimeframe(value as typeof timeframe)}
              orientation="horizontal"
              value={timeframe}
            >
              {(
                [
                  { value: "today", label: "Today" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                  { value: "allTime", label: "All time" },
                ] as const
              ).map(({ value, label }) => (
                <RadioGroupPrimitive.Item
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3.5 py-1 font-medium text-muted-foreground text-sm focus-ring transition-colors hover:text-foreground data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-sm"
                  key={value}
                  value={value}
                >
                  {label}
                </RadioGroupPrimitive.Item>
              ))}
            </RadioGroupPrimitive.Root>
          )}
        </div>

        {/* User's Rank Highlight */}
        {userRank && userEntry && (
          <Card className="mb-6 border-brand/25 bg-brand/[0.05]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand font-mono font-medium text-brand-foreground text-sm tabular-nums">
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
                        <div className="mb-1.5 flex justify-between font-medium text-xs text-subtle">
                          <span>Lvl {userEntry.stats.level}</span>
                          <span>Lvl {userEntry.stats.level + 1}</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-inset">
                          <div
                            className="h-full rounded-full bg-brand transition-[width] duration-500"
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
                      <ArrowDown className="size-3.5" data-icon="inline-start" />
                      Find me
                    </Button>
                  )}
                  {userRank <= 25 && <Badge variant="secondary">Top 25</Badge>}
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
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:px-6 sm:py-14">
              <Trophy aria-hidden className="size-7 text-subtle" />
              <p className="mt-4 font-semibold text-foreground text-lg tracking-[-0.02em]">
                No one on the board yet
              </p>
              <p className="mt-1.5 max-w-xs text-muted-foreground text-sm">
                Solve today's puzzle and the top spot is yours.
              </p>
              <Button asChild className="mt-6" size="lg">
                <Link href="/">Play today's puzzle</Link>
              </Button>
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
                        ${isCurrentUser ? "bg-brand/[0.05] shadow-[inset_2px_0_0_hsl(var(--brand))]" : ""}
                      `}
                    >
                      <CardContent className="px-3 py-4 sm:px-5 sm:py-5">
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Rank Display */}
                          <div className="w-9 shrink-0 text-center sm:w-10">
                            <span className="font-semibold text-muted-foreground text-sm tabular-nums sm:text-base">
                              {actualRank}
                            </span>
                          </div>

                          {/* Avatar */}
                          <Avatar className="size-11 shrink-0 sm:size-12">
                            <AvatarImage
                              src={getAvatarFallback(entry.user.username)}
                              alt={entry.user.username}
                            />
                            <AvatarFallback>{entry.user.username[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>

                          {/* Player Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-foreground text-sm sm:text-base">
                                {entry.user.username}
                                {isCurrentUser && (
                                  <span className="ml-2 font-normal text-brand text-xs">(You)</span>
                                )}
                              </p>
                              {entry.stats.level > 0 && (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Zap className="size-3" />
                                  Lvl {entry.stats.level}
                                </Badge>
                              )}
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
                              <span className="flex items-center gap-1">
                                <Target className="size-3.5" />
                                {entry.stats.totalGames}{" "}
                                {entry.stats.totalGames === 1 ? "game" : "games"}
                              </span>
                              {entry.stats.streak > 0 && (
                                <span className="flex items-center gap-1">
                                  <Flame className="size-3.5" />
                                  {entry.stats.streak} day streak
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Score Display */}
                          <div className="shrink-0 text-right tabular-nums">
                            <div className="font-semibold text-foreground text-lg tabular-nums sm:text-xl">
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
                      className="bg-brand/[0.05] shadow-[inset_2px_0_0_hsl(var(--brand))] transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 md:gap-4">
                          {/* Rank Display */}
                          <div className="flex-shrink-0 w-8 text-center">
                            <span className="font-semibold text-base text-brand tabular-nums">
                              {userRank}
                            </span>
                          </div>

                          {/* Avatar */}
                          <Avatar className="size-10 flex-shrink-0 border border-brand">
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
                              <p className="truncate font-semibold text-sm md:text-base text-foreground">
                                {userEntry.user.username}
                                <span className="ml-2 font-normal text-brand text-xs">(You)</span>
                              </p>
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
                                {userEntry.stats.totalGames}{" "}
                                {userEntry.stats.totalGames === 1 ? "game" : "games"}
                              </span>
                              {userEntry.stats.streak > 0 && (
                                <span className="flex items-center gap-1">
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

        {leaderboard.length > 0 && !loading ? (
          <div className="mt-8 text-center">
            <Button asChild size="lg">
              <Link href="/">Play today's puzzle</Link>
            </Button>
          </div>
        ) : null}

        {/* How scoring works */}
        <section className="mt-14">
          <div className="mb-4 touch-targets flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <h2 className="font-semibold text-base text-foreground tracking-[-0.02em]">
                How scoring works
              </h2>
              <p className="mt-0.5 text-muted-foreground text-sm">
                Four things move your score on every solve.
              </p>
            </div>
            <Link
              className="inline-flex shrink-0 items-center gap-0.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              href="/achievements"
            >
              Achievements and levels
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {SCORING_RULES.map(({ icon: Icon, title, body }) => (
              <div className="bg-card p-4" key={title}>
                <dt className="flex items-center gap-3 font-medium text-foreground text-sm">
                  <Icon aria-hidden className="size-4 shrink-0 text-subtle" />
                  {title}
                </dt>
                <dd className="mt-0.5 pl-7 text-muted-foreground text-sm">{body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Layout>
  );
}

const SCORING_RULES = [
  { icon: Zap, title: "Speed", body: "Solve faster for more points." },
  { icon: Target, title: "Accuracy", body: "Fewer attempts means a higher score." },
  { icon: Flame, title: "Streaks", body: "Consecutive days multiply your points." },
  { icon: TrendingUp, title: "Difficulty", body: "Harder puzzles pay bigger rewards." },
] as const;
