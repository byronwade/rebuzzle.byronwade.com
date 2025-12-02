"use client";

import { Award, Calendar, Clock, Edit, Flame, Target, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Layout from "@/components/Layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { type AvatarPreferences, generateAvatarProps, getAvatarClassName } from "@/lib/avatar";

type UserStats = {
  level: number;
  points: number;
  streak: number;
  totalGames: number;
  wins: number;
  achievements: string[];
  lastPlayDate: string | null;
  dailyChallengeStreak: number;
};

const POINTS_PER_LEVEL = 1000;
const MIN_LEVEL = 1;
const PERCENTAGE_MULTIPLIER = 100;
const MAX_PROGRESS = 100;

// Helper function to load avatar preferences
const loadAvatarPreferences = async (
  isAuthenticated: boolean,
  userId: string | undefined
): Promise<AvatarPreferences | null> => {
  if (!isAuthenticated) {
    return null;
  }
  if (!userId) {
    return null;
  }

  try {
    const response = await fetch("/api/user/profile", {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        return {
          colorIndex: data.user.avatarColorIndex,
          customInitials: data.user.avatarCustomInitials,
        };
      }
    }
  } catch {
    // Silently fail - avatar preferences are optional
  }

  return null;
};

// Helper function to create default stats
const createDefaultStats = (): UserStats => ({
  level: MIN_LEVEL,
  points: 0,
  streak: 0,
  totalGames: 0,
  wins: 0,
  achievements: [],
  lastPlayDate: null,
  dailyChallengeStreak: 0,
});

// Helper function to load stats from API
const loadStatsFromAPI = async (userId: string): Promise<UserStats | null> => {
  try {
    const response = await fetch(`/api/user/stats?userId=${userId}`, {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.stats) {
        return {
          level: data.stats.level || MIN_LEVEL,
          points: data.stats.points || 0,
          streak: data.stats.streak || 0,
          totalGames: data.stats.totalGames || 0,
          wins: data.stats.wins || 0,
          achievements: [],
          lastPlayDate: data.stats.lastPlayDate || null,
          dailyChallengeStreak: data.stats.dailyChallengeStreak || 0,
        };
      }
    }
  } catch {
    // Fallback to localStorage
  }

  return null;
};

// Helper function to load stats from localStorage
const loadStatsFromLocalStorage = (): UserStats | null => {
  const savedStats = localStorage.getItem("userStats");
  if (savedStats) {
    try {
      return JSON.parse(savedStats);
    } catch {
      return null;
    }
  }
  return null;
};

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarPreferences, setAvatarPreferences] = useState<AvatarPreferences | null>(null);

  // Get username from auth context
  const username = user?.username ?? "Guest";

  // Load avatar preferences
  useEffect(() => {
    loadAvatarPreferences(isAuthenticated, user?.id)
      .then((prefs) => {
        if (prefs) {
          setAvatarPreferences(prefs);
        }
      })
      .catch(() => {
        // Silently fail
      });
  }, [isAuthenticated, user]);

  useEffect(() => {
    const loadStats = async () => {
      if (isAuthenticated && user) {
        const apiStats = await loadStatsFromAPI(user.id);
        if (apiStats) {
          setStats(apiStats);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to localStorage for guest users or if database fetch fails
      const localStats = loadStatsFromLocalStorage();
      setStats(localStats || createDefaultStats());
      setIsLoading(false);
    };

    loadStats().catch(() => {
      setIsLoading(false);
    });
  }, [isAuthenticated, user]);

  if (isLoading || !stats) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  // Calculate level and progress
  const calculateLevelProgress = (userStats: UserStats) => {
    const calculatedLevel = Math.floor(userStats.points / POINTS_PER_LEVEL) + 1;
    const level = Math.max(calculatedLevel, userStats.level, MIN_LEVEL);

    const levelThreshold = POINTS_PER_LEVEL * (level - 1);
    const nextThreshold = POINTS_PER_LEVEL * level;
    const pointsInLevel = userStats.points - levelThreshold;
    const pointsNeeded = nextThreshold - levelThreshold;
    const progress = Math.min(
      Math.max((pointsInLevel / pointsNeeded) * PERCENTAGE_MULTIPLIER, 0),
      MAX_PROGRESS
    );
    const pointsToNext = nextThreshold - userStats.points;

    return {
      currentLevel: level,
      currentLevelThreshold: levelThreshold,
      nextLevelThreshold: nextThreshold,
      progressToNextLevel: progress,
      pointsToNextLevel: pointsToNext,
    };
  };

  const levelProgress = calculateLevelProgress(stats);
  const { currentLevel, nextLevelThreshold, progressToNextLevel, pointsToNextLevel } =
    levelProgress;

  // Calculate win rate
  const calculateWinRate = (userStats: UserStats) => {
    if (userStats.totalGames === 0) {
      return 0;
    }
    return Math.round((userStats.wins / userStats.totalGames) * PERCENTAGE_MULTIPLIER);
  };

  const winRate = calculateWinRate(stats);

  const achievementDetails = {
    first_win: {
      name: "First Victory",
      icon: "🏆",
      description: "Won your first puzzle",
    },
    streak_3: {
      name: "3-Day Streak",
      icon: "🔥",
      description: "Played 3 days in a row",
    },
    streak_7: {
      name: "Week Warrior",
      icon: "⚡",
      description: "Played 7 days in a row",
    },
    games_10: {
      name: "Puzzle Explorer",
      icon: "🎯",
      description: "Played 10 games",
    },
    games_30: {
      name: "Puzzle Master",
      icon: "👑",
      description: "Played 30 games",
    },
  };

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-border sm:h-20 sm:w-20 sm:border-4">
                <AvatarFallback
                  className={`font-bold text-2xl sm:text-3xl ${getAvatarClassName(
                    generateAvatarProps(username, avatarPreferences || undefined),
                    true
                  )}`}
                >
                  {generateAvatarProps(username, avatarPreferences || undefined).initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold text-base text-foreground md:text-lg">{username}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="font-medium text-xs">
                    Level {currentLevel}
                  </Badge>
                  <Badge variant="outline" className="font-medium text-xs">
                    {stats.points.toLocaleString()} points
                  </Badge>
                </div>
              </div>
            </div>
            <Link href="/settings">
              <Button size="sm" variant="outline" className="font-medium text-sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Stats Overview */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-base md:text-lg">
              <Trophy className="h-5 w-5 text-primary" />
              Statistics
            </h2>

            <div className="space-y-4">
              {/* Level Progress */}
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Level Progress</span>
                  <span className="font-semibold text-foreground">
                    {stats.points.toLocaleString()} / {nextLevelThreshold.toLocaleString()}
                  </span>
                </div>
                <Progress className="h-3" value={progressToNextLevel} />
                <p className="mt-1.5 text-muted-foreground text-xs">
                  {pointsToNextLevel > 0
                    ? `${pointsToNextLevel.toLocaleString()} points to Level ${currentLevel + 1}`
                    : "Max level reached!"}
                </p>
              </div>

              <Separator />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                  <Target className="mb-2 h-6 w-6 text-primary" />
                  <div className="font-bold text-2xl text-foreground">{stats.totalGames}</div>
                  <div className="text-muted-foreground text-xs">Games Played</div>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                  <Trophy className="mb-2 h-6 w-6 text-primary" />
                  <div className="font-bold text-2xl text-foreground">{stats.wins}</div>
                  <div className="text-muted-foreground text-xs">Puzzles Solved</div>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                  <Flame className="mb-2 h-6 w-6 text-primary" />
                  <div className="font-bold text-2xl text-foreground">{stats.streak}</div>
                  <div className="text-muted-foreground text-xs">Current Streak</div>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                  <TrendingUp className="mb-2 h-6 w-6 text-primary" />
                  <div className="font-bold text-2xl text-foreground">{winRate}%</div>
                  <div className="text-muted-foreground text-xs">Win Rate</div>
                </div>
              </div>

              {/* Last Played */}
              {stats.lastPlayDate && (
                <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Last played: {new Date(stats.lastPlayDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Achievements */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-base md:text-lg">
              <Award className="h-5 w-5 text-primary" />
              Achievements ({stats.achievements.length})
            </h2>

            {stats.achievements.length > 0 ? (
              <div className="space-y-3">
                {stats.achievements.map((achievement) => {
                  const details =
                    achievementDetails[achievement as keyof typeof achievementDetails];
                  return (
                    <div
                      className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                      key={achievement}
                    >
                      <div className="text-3xl">{details?.icon || "🏅"}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground text-sm">
                          {details?.name || achievement}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {details?.description || "Achievement unlocked!"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <Award className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="mb-2 font-medium text-foreground text-sm">No achievements yet</p>
                <p className="text-muted-foreground text-xs">
                  Keep playing to unlock achievements!
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Activity Section */}
        <Card className="mt-6 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-base md:text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Activity Summary
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
              <div className="mb-1 text-muted-foreground text-sm">Total Points</div>
              <div className="font-bold text-2xl text-foreground">
                {stats.points.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
              <div className="mb-1 text-muted-foreground text-sm">Current Streak</div>
              <div className="font-bold text-2xl text-foreground">{stats.streak}</div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
              <div className="mb-1 text-muted-foreground text-sm">Daily Challenge Streak</div>
              <div className="font-bold text-2xl text-foreground">{stats.dailyChallengeStreak}</div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Link href="/" className="w-full sm:w-auto">
            <Button size="lg" className="w-full font-medium text-sm sm:w-auto">
              Play Today's Puzzle
            </Button>
          </Link>
          <Link href="/leaderboard" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full font-medium text-sm sm:w-auto">
              View Leaderboard
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
