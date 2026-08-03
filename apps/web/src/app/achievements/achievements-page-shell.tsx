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
import { AppLink as Link } from "@/components/AppLink";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { withLoadingFlag } from "@/lib/with-loading-flag";
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

/**
 * Rarity ladder. It climbs the brand's own gradient stops — teal → blue →
 * violet → amber — so a wall of badges never introduces a colour that isn't
 * already in the system.
 */
const rarityConfig = {
  common: {
    label: "Common",
    color: "text-muted-foreground",
    bg: "bg-inset",
  },
  uncommon: {
    label: "Uncommon",
    color: "text-[#0d9488] dark:text-[#00dfd8]",
    bg: "bg-[#00dfd8]/10",
  },
  rare: {
    label: "Rare",
    color: "text-link",
    bg: "bg-link/10",
  },
  epic: {
    label: "Epic",
    color: "text-[#7928ca] dark:text-[#a875e8]",
    bg: "bg-[#7928ca]/10",
  },
  legendary: {
    label: "Legendary",
    color: "text-[#ab570a] dark:text-warning",
    bg: "bg-warning/10",
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
  { name: "Rookie", levels: [1, 10], icon: Star, color: "text-subtle" },
  { name: "Bronze", levels: [11, 20], icon: Medal, color: "text-muted-foreground" },
  { name: "Silver", levels: [21, 35], icon: Shield, color: "text-border-strong" },
  { name: "Gold", levels: [36, 50], icon: Trophy, color: "text-[#ab570a] dark:text-warning" },
  { name: "Platinum", levels: [51, 65], icon: Gem, color: "text-[#0d9488] dark:text-[#00dfd8]" },
  { name: "Diamond", levels: [66, 80], icon: Sparkles, color: "text-link" },
  { name: "Master", levels: [81, 95], icon: Crown, color: "text-[#7928ca] dark:text-[#a875e8]" },
  {
    name: "Grandmaster",
    levels: [96, 100],
    icon: Flame,
    color: "text-[#c0005f] dark:text-[#ff4da6]",
  },
];


import { AchievementsPageShellLower } from "./achievements-page-shell-lower";

export function AchievementsPageShell(props: Record<string, any>) {
  const {
    achievements,
    achievementsByCategory,
    category,
    data,
    fetchAchievements,
    filteredAchievements,
    loading,
    progress,
    rarities,
    response,
    selectedRarity,
    setAchievements,
    setLoading,
    setProgress,
    setSelectedRarity
  } = props;
    return (
    <>

    <Layout>      <AchievementsPageShellLower {...props} />
    </>
  );
}
