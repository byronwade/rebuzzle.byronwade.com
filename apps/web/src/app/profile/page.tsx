"use client";

import { format as formatDateFns } from "date-fns";
import { Award, CalendarDays, ChevronRight, ExternalLink, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import Layout from "@/components/Layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WordleStatsPanel } from "@/components/WordleStatsPanel";
import { type AvatarPreferences, generateAvatarProps, getAvatarClassName } from "@/lib/avatar";
import { profilePathForUsername } from "@/lib/ugc/slug";

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

  const avatar = generateAvatarProps(username, avatarPreferences || undefined);
  const formatNumber = (value: number) => value.toLocaleString("en-US", { useGrouping: true });

  const headline = [
    { label: "Points", value: formatNumber(stats.points) },
    { label: "Played", value: formatNumber(stats.totalGames) },
    { label: "Win rate", value: `${winRate}%` },
    { label: "Streak", value: formatNumber(stats.streak) },
    { label: "Best streak", value: formatNumber(Math.max(stats.maxStreak, stats.streak)) },
    { label: "Daily streak", value: formatNumber(stats.dailyChallengeStreak) },
  ];

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
        {/* Identity */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between md:mb-10">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <Avatar className="h-16 w-16 shrink-0 sm:h-20 sm:w-20">
              <AvatarFallback
                className={`font-semibold text-2xl tracking-[-0.04em] sm:text-3xl ${getAvatarClassName(avatar, true)}`}
              >
                {avatar.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="eyebrow">Profile</p>
              <h1 className="mt-1 truncate font-semibold text-3xl text-foreground tracking-[-0.045em] sm:text-4xl">
                {username}
              </h1>
              <p className="mt-1.5 text-muted-foreground text-sm">
                Level&nbsp;{currentLevel}
                {stats.lastPlayDate ? (
                  <>
                    {" · "}Last played {formatDateFns(new Date(stats.lastPlayDate), "MMM d, yyyy")}
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAuthenticated && user?.username ? (
              <Button asChild className="h-11 sm:h-8" size="sm" variant="outline">
                <Link href={profilePathForUsername(user.username)}>
                  <ExternalLink aria-hidden className="h-4 w-4" data-icon="inline-start" />
                  Public page
                </Link>
              </Button>
            ) : null}
            <Button asChild className="h-11 sm:h-8" size="sm" variant="outline">
              <Link href="/studio">Studio</Link>
            </Button>
            <Button asChild className="h-11 sm:h-8" size="sm" variant="outline">
              <Link href="/settings">
                <Settings aria-hidden className="h-4 w-4" data-icon="inline-start" />
                Settings
              </Link>
            </Button>
          </div>
        </header>

        {/* Level progress + headline numbers */}
        <Card className="overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-foreground text-sm">
                {pointsToNextLevel > 0
                  ? `Progress to level ${currentLevel + 1}`
                  : `Level ${currentLevel}`}
              </p>
              <p className="font-mono text-subtle text-xs tabular-nums">
                {formatNumber(stats.points)} / {formatNumber(nextLevelThreshold)}
              </p>
            </div>
            <Progress
              aria-label={`Progress to level ${currentLevel + 1}`}
              className="mt-3 h-2"
              value={progressToNextLevel}
            />
            <p className="mt-2 text-muted-foreground text-xs">
              {pointsToNextLevel > 0
                ? `${formatNumber(pointsToNextLevel)} ${pointsToNextLevel === 1 ? "point" : "points"} to go`
                : "Max level reached."}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-px border-border border-t bg-border sm:grid-cols-3 lg:grid-cols-6">
            {headline.map((item) => (
              <div className="flex flex-col-reverse bg-card px-5 py-4" key={item.label}>
                <dt className="mt-1 text-muted-foreground text-xs">{item.label}</dt>
                <dd className="font-semibold text-2xl text-foreground tabular-nums tracking-[-0.04em]">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="flex flex-col p-5 sm:p-6">
            <h2 className="mb-5 font-semibold text-base text-foreground tracking-[-0.02em]">
              History
            </h2>
            {stats.totalGames === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border border-dashed px-6 py-10 text-center">
                <CalendarDays aria-hidden className="h-6 w-6 text-subtle" />
                <p className="mt-3 font-medium text-foreground text-sm">No games yet</p>
                <p className="mt-1 max-w-[16rem] text-muted-foreground text-xs leading-5">
                  Your guess distribution and play calendar fill in as you solve.
                </p>
              </div>
            ) : (
              <WordleStatsPanel
                showTiles={false}
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
            )}
          </Card>

          {/* Achievements — catalog-backed from /api/user/achievements */}
          <Card className="flex flex-col p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-base text-foreground tracking-[-0.02em]">
                Achievements
                <span className="ml-2 font-mono font-normal text-subtle text-xs tabular-nums">
                  {unlockedAchievements.length}
                </span>
              </h2>
              <Link
                className="inline-flex items-center gap-0.5 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
                href="/achievements"
              >
                View all<span className="sr-only"> achievements</span>
                <ChevronRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            </div>

            {unlockedAchievements.length > 0 ? (
              <ul className="-mx-2 space-y-0.5">
                {unlockedAchievements.slice(0, 6).map((achievement) => (
                  <li className="flex items-center gap-3 rounded-md p-2" key={achievement.id}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-inset text-base">
                      {achievement.icon || "🏅"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground text-sm">
                        {achievement.name}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">
                        {achievement.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border border-dashed px-6 py-10 text-center">
                <Award aria-hidden className="h-6 w-6 text-subtle" />
                <p className="mt-3 font-medium text-foreground text-sm">No achievements yet</p>
                <p className="mt-1 max-w-[16rem] text-muted-foreground text-xs leading-5">
                  Solve your first puzzle to start unlocking them.
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="w-full sm:w-auto" size="lg">
            <Link href="/">Play today's puzzle</Link>
          </Button>
          <Button asChild className="w-full sm:w-auto" size="lg" variant="ghost">
            <Link href="/leaderboard">See the leaderboard</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
