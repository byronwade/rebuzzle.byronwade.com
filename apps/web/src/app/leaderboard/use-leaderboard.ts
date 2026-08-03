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


export function useLeaderboard(props: any = {}) {

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
              `/api/user/stats?userId=${userId}&timeframe=${timeframe}`
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
        }      } catch (error) {
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


  return {
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
  };
}
