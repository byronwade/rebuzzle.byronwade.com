"use client";

import {
  Book,
  Brain,
  Calendar,
  CheckCircle,
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
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gameSettings, getPointsForLevel } from "@/lib/gameSettings";
import { cn } from "@/lib/utils";

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

const rarityConfig = {
  common: {
    label: "Common",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/50",
  },
  uncommon: {
    label: "Uncommon",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/30",
  },
  rare: {
    label: "Rare",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
  },
  epic: {
    label: "Epic",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/30",
  },
  legendary: {
    label: "Legendary",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
  },
};

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
  { name: "Rookie", levels: [1, 10], icon: Star, color: "text-slate-500" },
  { name: "Bronze", levels: [11, 20], icon: Medal, color: "text-amber-700 dark:text-amber-600" },
  { name: "Silver", levels: [21, 35], icon: Shield, color: "text-slate-400" },
  { name: "Gold", levels: [36, 50], icon: Trophy, color: "text-yellow-600 dark:text-yellow-500" },
  { name: "Platinum", levels: [51, 65], icon: Gem, color: "text-cyan-600 dark:text-cyan-400" },
  { name: "Diamond", levels: [66, 80], icon: Sparkles, color: "text-blue-500 dark:text-blue-400" },
  { name: "Master", levels: [81, 95], icon: Crown, color: "text-purple-600 dark:text-purple-400" },
  { name: "Grandmaster", levels: [96, 100], icon: Flame, color: "text-red-600 dark:text-red-400" },
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/achievements");
        const data = await response.json();

        if (data.success) {
          setAchievements(data.achievements);
          setProgress(data.progress);
        }
      } catch (error) {
        console.error("Error fetching achievements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
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

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-semibold text-xl text-foreground flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            Achievements & Levels
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your progress and unlock rewards
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="achievements" className="space-y-6">
          <TabsList className="w-full max-w-xs">
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
                <Progress value={progress.percentage} className="h-2" />
              </div>
            )}

            {/* Rarity Filter */}
            <div className="flex flex-wrap gap-2">
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
                    className={cn("h-8", selectedRarity !== rarity && config.color)}
                  >
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
                      <div className="space-y-1.5">
                        {categoryAchievements.map((achievement) => {
                          const rarity = rarityConfig[achievement.rarity] || rarityConfig.common;
                          const IconComponent = iconMap[achievement.icon] || Star;

                          return (
                            <div
                              key={achievement.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                                achievement.unlocked ? rarity.bg : "bg-muted/40 opacity-60"
                              )}
                            >
                              {/* Icon */}
                              <div
                                className={cn(
                                  "flex size-9 items-center justify-center rounded-full flex-shrink-0",
                                  achievement.unlocked ? rarity.bg : "bg-muted"
                                )}
                              >
                                {achievement.unlocked ? (
                                  <IconComponent className={cn("size-4", rarity.color)} />
                                ) : (
                                  <Lock className="size-4 text-muted-foreground" />
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-sm truncate">
                                    {achievement.name}
                                  </span>
                                  {achievement.unlocked && (
                                    <CheckCircle className="size-3.5 text-green-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {achievement.description}
                                </p>
                              </div>

                              {/* Points */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={cn("text-xs", rarity.color)}>{rarity.label}</span>
                                <Badge variant="secondary" className="text-xs font-medium">
                                  +{achievement.points}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                        <TierIcon className={cn("size-5", tier.color)} />
                        <div className="flex-1">
                          <span className={cn("font-medium text-sm", tier.color)}>{tier.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            Lvl {tier.levels[0]}-{tier.levels[1]}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {startPoints.toLocaleString()}-{endPoints.toLocaleString()} pts
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
                <h3 className="font-medium text-sm mb-3">How Points Work</h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-green-500" />
                    <span className="text-muted-foreground">
                      Base: <span className="text-foreground">100</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-blue-500" />
                    <span className="text-muted-foreground">
                      Speed: <span className="text-foreground">+50 max</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="size-4 text-orange-500" />
                    <span className="text-muted-foreground">
                      Streak: <span className="text-foreground">+5/day</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="size-4 text-purple-500" />
                    <span className="text-muted-foreground">
                      Hard: <span className="text-foreground">+10/lvl</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sign in CTA */}
        {!isAuthenticated && (
          <Card className="mt-8 border-dashed">
            <CardContent className="p-6 text-center">
              <p className="font-medium text-sm mb-1">Sign in to track progress</p>
              <p className="text-xs text-muted-foreground mb-4">
                Create an account to save your achievements
              </p>
              <div className="flex justify-center gap-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Game
          </Link>
        </div>
      </div>
    </Layout>
  );
}
