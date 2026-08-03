"use client";

import { Award, Calendar, Clock, Edit, Trophy } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Layout from "@/components/Layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { WordleStatsPanel } from "@/components/WordleStatsPanel";
import { type AvatarPreferences, generateAvatarProps, getAvatarClassName } from "@/lib/avatar";

type UserStats = {
  level: number;
  points: number;
  streak: number;
  maxStreak: number;
  totalGames: number;
  wins: number;
  achievements: string[];
  lastPlayDate: string | null;
  dailyChallengeStreak: number;
  streakFreezes: number;
  guessDistribution: number[];
  recentPlayDates: string[];
};

type ProfileAchievement = {
  id: string;
  name: string;
  description: string;
  icon?: string;
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
  maxStreak: 0,
  totalGames: 0,
  wins: 0,
  achievements: [],
  lastPlayDate: null,
  dailyChallengeStreak: 0,
  streakFreezes: 1,
  guessDistribution: [0, 0, 0],
  recentPlayDates: [],
});

// Helper function to load stats from API
const loadStatsFromAPI = async (_userId: string): Promise<UserStats | null> => {
  try {
    const response = await fetch("/api/user/stats", {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.stats) {
        return {
          level: data.stats.level || MIN_LEVEL,
          points: data.stats.points || 0,
          streak: data.stats.streak || 0,
          maxStreak: data.stats.maxStreak || 0,
          totalGames: data.stats.totalGames || 0,
          wins: data.stats.wins || 0,
          achievements: [],
          lastPlayDate: data.stats.lastPlayDate || null,
          dailyChallengeStreak: data.stats.dailyChallengeStreak || 0,
          streakFreezes:
            typeof data.stats.streakFreezes === "number" ? data.stats.streakFreezes : 1,
          guessDistribution: Array.isArray(data.stats.guessDistribution)
            ? data.stats.guessDistribution
            : [0, 0, 0],
          recentPlayDates: Array.isArray(data.stats.recentPlayDates)
            ? data.stats.recentPlayDates
            : [],
        };
      }
    }
  } catch {
    // Fallback to localStorage
  }

  return null;
};

const loadAchievementsFromAPI = async (): Promise<ProfileAchievement[]> => {
  try {
    const response = await fetch("/api/user/achievements", { credentials: "include" });
    if (!response.ok) return [];
    const data = await response.json();
    const rows = Array.isArray(data.unlocked)
      ? data.unlocked
      : Array.isArray(data.recentUnlocks)
        ? data.recentUnlocks
        : [];
    return rows.map(
      (item: {
        id?: string;
        achievementId?: string;
        achievement?: { name?: string; description?: string; icon?: string };
      }) => ({
        id: item.id || item.achievementId || "achievement",
        name: item.achievement?.name || "Achievement",
        description: item.achievement?.description || "Unlocked",
        icon: item.achievement?.icon,
      })
    );
  } catch {
    return [];
  }
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  // Paint instantly from local cache / defaults — refresh from API in background
  const [stats, setStats] = useState<UserStats>(() => {
    if (typeof window === "undefined") return createDefaultStats();
    return loadStatsFromLocalStorage() || createDefaultStats();
  });
  const [avatarPreferences, setAvatarPreferences] = useState<AvatarPreferences | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<ProfileAchievement[]>([]);

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
    if (authLoading) return;

    const loadStats = async () => {
      if (isAuthenticated && user) {
        const [apiStats, achievements] = await Promise.all([
          loadStatsFromAPI(user.id),
          loadAchievementsFromAPI(),
        ]);
        if (apiStats) {
          setStats(apiStats);
        }
        setUnlockedAchievements(achievements);
        if (apiStats) return;
      }

      const localStats = loadStatsFromLocalStorage();
      if (localStats) {
        setStats({ ...createDefaultStats(), ...localStats });
      }
    };

    void loadStats();
  }, [isAuthenticated, user, authLoading]);

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

  const winRate =
    stats.totalGames === 0
      ? 0
      : Math.round((stats.wins / stats.totalGames) * PERCENTAGE_MULTIPLIER);

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-border sm:h-20 sm:w-20 sm:border-4">
                <AvatarFallback
                  className={`font-semibold text-2xl tracking-[-0.04em] sm:text-3xl ${getAvatarClassName(
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
            <Button asChild size="sm" variant="outline" className="font-medium text-sm">
                  <Link href="/settings"><Edit data-icon="inline-start" className="mr-2 h-4 w-4" />
                Edit Profile</Link>
                </Button>
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

              <WordleStatsPanel
                stats={{
                  played: stats.totalGames,
                  winRate,
                  currentStreak: stats.streak,
                  maxStreak: Math.max(stats.maxStreak, stats.streak),
                  guessDistribution: stats.guessDistribution,
                  recentPlayDates: stats.recentPlayDates,
                  streakFreezes: stats.streakFreezes,
                }}
              />

              {stats.lastPlayDate && (
                <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Last played: {new Date(stats.lastPlayDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Achievements — catalog-backed from /api/user/achievements */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold text-base md:text-lg">
                <Award className="h-5 w-5 text-primary" />
                Achievements ({unlockedAchievements.length})
              </h2>
              <Link
                className="font-medium text-primary text-xs underline-offset-2 hover:underline"
                href="/achievements"
              >
                View all
              </Link>
            </div>

            {unlockedAchievements.length > 0 ? (
              <div className="space-y-3">
                {unlockedAchievements.map((achievement) => (
                  <div
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                    key={achievement.id}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-lg">
                      {achievement.icon || "🏅"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-foreground text-sm">
                        {achievement.name}
                      </div>
                      <div className="line-clamp-2 text-muted-foreground text-xs">
                        {achievement.description}
                      </div>
                    </div>
                  </div>
                ))}
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
              <div className="font-semibold text-2xl text-foreground">
                {stats.points.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
              <div className="mb-1 text-muted-foreground text-sm">Current Streak</div>
              <div className="font-semibold text-2xl text-foreground">{stats.streak}</div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
              <div className="mb-1 text-muted-foreground text-sm">Daily Challenge Streak</div>
              <div className="font-semibold text-2xl text-foreground">
                {stats.dailyChallengeStreak}
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Button asChild size="lg" className="w-full font-medium text-sm sm:w-auto">
                  <Link href="/" className="w-full sm:w-auto">Play Today's Puzzle</Link>
                </Button>
          <Button asChild size="lg" variant="outline" className="w-full font-medium text-sm sm:w-auto">
                  <Link href="/leaderboard" className="w-full sm:w-auto">View Leaderboard</Link>
                </Button>
        </div>
      </div>
    </Layout>
  );
}
