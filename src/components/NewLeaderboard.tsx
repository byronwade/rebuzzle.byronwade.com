"use client";

import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export function NewLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "/api/leaderboard?limit=5&timeframe=allTime"
        );
        const data = await response.json();

        if (data.success) {
          setLeaderboard(data.leaderboard);
        } else {
          console.error("Failed to fetch leaderboard:", data.error);
          setLeaderboard([]);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Generate avatar from username (simple fallback)
  const getAvatarFallback = (username: string) =>
    `/avatars/${username.toLowerCase().charAt(0)}.svg`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4 text-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground text-sm">
            No leaderboard data available yet.
          </div>
        ) : (
          <ul className="space-y-4">
            {leaderboard.map((entry) => (
              <li className="flex items-center space-x-4" key={entry.user.id}>
                <span className="w-6 font-bold text-lg">{entry.rank}.</span>
                <Avatar>
                  <AvatarImage
                    alt={entry.user.username}
                    src={getAvatarFallback(entry.user.username)}
                  />
                  <AvatarFallback>
                    {entry.user.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-grow">{entry.user.username}</span>
                <span className="font-semibold">
                  {entry.stats.points.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
