"use client";

import {
  Book,
  Brain,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Crown,
  Flame,
  Gem,
  Gift,
  Heart,
  Lock,
  Medal,
  Puzzle,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Sword,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gameSettings, getPointsForLevel } from "@/lib/gameSettings";
import { cn } from "@/lib/utils";
import { withLoadingFlag } from "@/lib/with-loading-flag";

interface Achievement {
  id: string;
  name: string;
  description: string;
  hint: string;
  icon: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  points: number;
  order: number;
  secret?: boolean;
  unlocked: boolean;
  unlockedAt?: string;
}

interface AchievementProgress {
  unlocked: number;
  total: number;
  percentage: number;
  pointsEarned: number;
  totalPossiblePoints: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  flame: Flame,
  target: Target,
  clock: Clock,
  crown: Crown,
  gem: Gem,
  medal: Medal,
  rocket: Rocket,
  brain: Brain,
  lightning: Zap,
  heart: Heart,
  shield: Shield,
  sword: Sword,
  puzzle: Puzzle,
  book: Book,
  calendar: Calendar,
  gift: Gift,
  sparkles: Sparkles,
};

/**
 * Rarity ladder on Thorbis hues: marker → success → electric blue → pumpkin →
 * gold. The tier is always also a word, so colour is never the only cue.
 */
const rarityConfig = {
  common: {
    label: "Common",
    dot: "bg-subtle",
    color: "text-muted-foreground",
    bg: "bg-inset",
  },
  uncommon: {
    label: "Uncommon",
    dot: "bg-success",
    color: "text-success",
    bg: "bg-success/10",
  },
  rare: {
    label: "Rare",
    dot: "bg-brand",
    color: "text-link",
    bg: "bg-brand/10",
  },
  epic: {
    label: "Epic",
    dot: "bg-pumpkin",
    color: "text-pumpkin",
    bg: "bg-pumpkin/10",
  },
  legendary: {
    label: "Legendary",
    dot: "bg-warning",
    color: "text-warning",
    bg: "bg-warning/10",
  },
};

/** Rows each category shows before folding the remaining locked ones away. */
const COLLAPSED_ROWS = 5;

/** Expanded categories live in `?open=a,b` so the view survives refresh and deep links. */
const EXPANDED_PARAM = "open";

function readExpandedFromUrl(): string[] {
  const raw = new URLSearchParams(window.location.search).get(EXPANDED_PARAM);
  return raw ? raw.split(",").filter(Boolean) : [];
}

function writeExpandedToUrl(categories: string[]) {
  const url = new URL(window.location.href);
  if (categories.length > 0) {
    url.searchParams.set(EXPANDED_PARAM, categories.join(","));
  } else {
    url.searchParams.delete(EXPANDED_PARAM);
  }
  window.history.replaceState(window.history.state, "", url);
}

const categoryConfig: Record<
  string,
  { name: string; icon: React.ComponentType<{ className?: string }> }
> = {
  beginner: { name: "Getting Started", icon: Star },
  solving: { name: "Puzzle Solver", icon: Puzzle },
  speed: { name: "Speed Runner", icon: Zap },
  streaks: { name: "Streak Master", icon: Flame },
  mastery: { name: "Mastery", icon: Crown },
  explorer: { name: "Explorer", icon: Target },
  social: { name: "Social", icon: Heart },
  collector: { name: "Collector", icon: Gem },
  elite: { name: "Elite", icon: Trophy },
  legendary: { name: "Legendary", icon: Sparkles },
};

// Level tiers - simplified
const levelTiers: Array<{
  name: string;
  levels: [number, number];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { name: "Rookie", levels: [1, 10], icon: Star, color: "text-subtle" },
  { name: "Bronze", levels: [11, 20], icon: Medal, color: "text-muted-foreground" },
  { name: "Silver", levels: [21, 35], icon: Shield, color: "text-border-strong" },
  { name: "Gold", levels: [36, 50], icon: Trophy, color: "text-warning" },
  { name: "Platinum", levels: [51, 65], icon: Gem, color: "text-success" },
  { name: "Diamond", levels: [66, 80], icon: Sparkles, color: "text-link" },
  {
    name: "Master",
    levels: [81, 95],
    icon: Crown,
    color: "text-pumpkin",
  },
  {
    name: "Grandmaster",
    levels: [96, 100],
    icon: Flame,
    color: "text-burnt dark:text-destructive",
  },
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchAchievements = async () => {
      await withLoadingFlag(setLoading, async () => {
        try {
          const response = await fetch("/api/achievements");
          if (!response.ok) {
            console.error("Failed to load achievements");
            return;
          }
          const data = await response.json();

          if (data.success) {
            setAchievements(data.achievements);
            setProgress(data.progress);
            setExpandedCategories(readExpandedFromUrl());
          }
        } catch (error) {
          console.error("Error fetching achievements:", error);
        }
      });
    };

    void fetchAchievements();
  }, []);

  // Filter achievements by rarity
  const filteredAchievements = achievements.filter((a) => {
    if (selectedRarity !== "all" && a.rarity !== selectedRarity) return false;
    return true;
  });

  // Group by category
  const achievementsByCategory = filteredAchievements.reduce(
    (acc, achievement) => {
      const category = achievement.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(achievement);
      return acc;
    },
    {} as Record<string, Achievement[]>
  );

  const rarities = Object.keys(rarityConfig) as Array<keyof typeof rarityConfig>;

  function toggleCategory(category: string) {
    const next = expandedCategories.includes(category)
      ? expandedCategories.filter((candidate) => candidate !== category)
      : [...expandedCategories, category];
    setExpandedCategories(next);
    writeExpandedToUrl(next);
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        {/* Header */}
        <PageHeader
          description="Track what you’ve unlocked and what’s still ahead."
          eyebrow="Progress"
          title="Achievements."
        />

        {/* Guests learn up front that progress needs an account */}
        {!isAuthenticated && (
          <Card className="mb-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="font-medium text-foreground text-sm">Log in to keep your progress</p>
              <p className="mt-0.5 text-muted-foreground text-sm">
                Achievements and levels are saved to your account.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="achievements" className="space-y-6">
          <TabsList className="touch-targets h-11 w-full sm:max-w-xs">
            <TabsTrigger value="achievements" className="flex-1">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="levels" className="flex-1">
              Levels
            </TabsTrigger>
          </TabsList>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6 mt-6">
            {/* Progress */}
            {progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {progress.unlocked}/{progress.total}
                  </span>
                </div>
                <Progress
                  aria-label="Achievements unlocked"
                  className="h-2"
                  value={progress.percentage}
                />
              </div>
            )}

            {/* Rarity Filter */}
            <div className="touch-targets flex flex-wrap gap-x-2 gap-y-3">
              <Button
                variant={selectedRarity === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedRarity("all")}
                className="h-8"
              >
                All
              </Button>
              {rarities.map((rarity) => {
                const config = rarityConfig[rarity];
                return (
                  <Button
                    key={rarity}
                    variant={selectedRarity === rarity ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedRarity(rarity)}
                    className="h-8 gap-1.5"
                  >
                    <span aria-hidden className={cn("size-1.5 rounded-full", config.dot)} />
                    {config.label}
                  </Button>
                );
              })}
            </div>

            {/* Loading */}
            {loading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              /* Achievement List */
              <div className="space-y-6">
                {Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => {
                  const config = categoryConfig[category];
                  const Icon = config?.icon || Star;
                  const unlockedCount = categoryAchievements.filter((a) => a.unlocked).length;
                  // Unlocked first, then the nearest locked ones; the rest fold away so
                  // 100+ rows don't bury the categories below.
                  const sorted = [...categoryAchievements].sort(
                    (a, b) => Number(b.unlocked) - Number(a.unlocked)
                  );
                  const expanded = expandedCategories.includes(category);
                  const visibleCount = Math.max(unlockedCount + 3, COLLAPSED_ROWS);
                  const visible = expanded ? sorted : sorted.slice(0, visibleCount);
                  const hiddenCount = sorted.length - visible.length;

                  return (
                    <div key={category}>
                      {/* Category Header */}
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                        <Icon className="size-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{config?.name || category}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {unlockedCount}/{categoryAchievements.length}
                        </span>
                      </div>

                      {/* Achievement Rows */}
                      <Card className="divide-y divide-border overflow-hidden">
                        {visible.map((achievement) => {
                          const rarity = rarityConfig[achievement.rarity] || rarityConfig.common;
                          const IconComponent = iconMap[achievement.icon] || Star;

                          return (
                            <div
                              key={achievement.id}
                              className="flex items-center gap-3 p-3 sm:px-4"
                            >
                              {/* Icon */}
                              <div
                                className={cn(
                                  "flex size-9 flex-shrink-0 items-center justify-center rounded-full",
                                  achievement.unlocked ? rarity.bg : "bg-inset"
                                )}
                              >
                                {achievement.unlocked ? (
                                  <IconComponent className={cn("size-4", rarity.color)} />
                                ) : (
                                  <Lock className="size-4 text-subtle" />
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "truncate font-medium text-sm",
                                      !achievement.unlocked && "text-muted-foreground"
                                    )}
                                  >
                                    {achievement.name}
                                  </span>
                                  {achievement.unlocked && (
                                    <CheckCircle className="size-3.5 shrink-0 text-success" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {achievement.description}
                                </p>
                              </div>

                              {/* Points */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="hidden items-center gap-1.5 text-muted-foreground text-xs sm:inline-flex">
                                  <span
                                    aria-hidden
                                    className={cn("size-1.5 rounded-full", rarity.dot)}
                                  />
                                  {rarity.label}
                                </span>
                                <Badge variant="secondary" className="text-xs font-medium">
                                  +{achievement.points}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </Card>
                      {hiddenCount > 0 || expanded ? (
                        <Button
                          aria-expanded={expanded}
                          className="mt-1.5 h-11 px-2 text-muted-foreground text-xs sm:h-8"
                          onClick={() => toggleCategory(category)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
                          <ChevronDown
                            aria-hidden
                            className={cn(
                              "size-3.5 transition-transform",
                              expanded && "rotate-180"
                            )}
                            data-icon="inline-end"
                          />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Levels Tab */}
          <TabsContent value="levels" className="space-y-6 mt-6">
            {/* Info */}
            <p className="text-sm text-muted-foreground">
              Earn{" "}
              <span className="font-medium text-foreground">
                {gameSettings.pointsPerLevel.toLocaleString()} points
              </span>{" "}
              per level.
            </p>

            {/* Level Table */}
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {levelTiers.map((tier) => {
                    const TierIcon = tier.icon;
                    const startPoints = getPointsForLevel(tier.levels[0]);
                    const endPoints = getPointsForLevel(tier.levels[1] + 1) - 1;

                    return (
                      <div key={tier.name} className="flex items-center gap-3 p-3">
                        <TierIcon className={cn("size-5 shrink-0", tier.color)} />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-sm">{tier.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            Lvl&nbsp;{tier.levels[0]}–{tier.levels[1]}
                          </span>
                        </div>
                        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                          {startPoints.toLocaleString()}–{endPoints.toLocaleString()} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Scoring Info */}
            <Card>
              <CardContent className="p-4">
                <h2 className="eyebrow mb-4">How points work</h2>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="size-3.5 text-subtle" />
                    <span className="text-muted-foreground">
                      Base: <span className="text-foreground">100</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-subtle" />
                    <span className="text-muted-foreground">
                      Speed: <span className="text-foreground">+50 max</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="size-3.5 text-subtle" />
                    <span className="text-muted-foreground">
                      Streak: <span className="text-foreground">+5/day</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="size-3.5 text-subtle" />
                    <span className="text-muted-foreground">
                      Hard: <span className="text-foreground">+10/lvl</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
