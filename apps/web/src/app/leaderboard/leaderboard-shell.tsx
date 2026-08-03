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
import { AppLink as Link } from "@/components/AppLink";
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
import { serializeJsonLd } from "@/lib/seo/json-ld";

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


import { LeaderboardShellLower } from "./leaderboard-shell-lower";

export function LeaderboardShell(props: Record<string, any>) {
  const {
    data,
    fetchLeaderboard,
    getAvatarFallback,
    hasMounted,
    leaderboard,
    leaderboardSchema,
    loading,
    response,
    restOfLeaderboard,
    scrollToUserPosition,
    setLeaderboard,
    setLoading,
    setSortBy,
    setTimeframe,
    setUserEntry,
    setUserRank,
    showPodium,
    sortBy,
    timeframe,
    topThree,
    userData,
    userEntry,
    userEntryRef,
    userInLeaderboard,
    userRank,
    userResponse
  } = props;
    return (
    <>

    <Layout>
      {leaderboardSchema && (
        <script
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(leaderboardSchema),
          }}
          type="application/ld+json"
        />
      )}
      <LeaderboardShellLower {...props} />
    </>
  );
}
