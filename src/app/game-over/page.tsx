"use client";

import { Flame, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { CountdownTimer } from "@/components/CountdownTimer";
import { EnhancedShareButton } from "@/components/EnhancedShareButton";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { gameSettings } from "@/lib/gameSettings";
import { fetchGameData } from "../actions/gameActions";

interface GameData {
  answer: string;
  explanation: string;
  difficulty: number;
  puzzleType?: string;
  metadata?: {
    puzzleType?: string;
  };
}

export default function GameOverPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [params, setParams] = useState<{
    [key: string]: string | string[] | undefined;
  }>({});
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await searchParams;
        setParams(resolvedParams);

        const data = await fetchGameData();
        setGameData(data as GameData);

        // Load streak from database
        try {
          const response = await fetch("/api/user/stats?userId=current-user");
          if (response.ok) {
            const userStats = await response.json();
            setStreak(userStats.streak || 0);
          }
        } catch (error) {
          console.error("Error loading user stats:", error);
        }
      } catch (error) {
        console.error("Error loading game data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [searchParams]);

  const success = params.success === "true";
  const attempts =
    typeof params.attempts === "string"
      ? Number.parseInt(params.attempts, 10)
      : gameSettings.maxAttempts;
  const guess = typeof params.guess === "string" ? params.guess : "";

  if (loading || !gameData) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {success && <Confetti />}

      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        {/* Main Result Card - Wordle Style */}
        <Card className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div
            className={`p-8 text-center ${success ? "bg-gradient-to-r from-green-50 to-emerald-50" : "bg-gradient-to-r from-red-50 to-orange-50"}`}
          >
            <div className="mb-4 animate-bounce text-6xl">
              {success ? "🎉" : "😔"}
            </div>
            <h1
              className={`mb-2 font-bold text-4xl ${success ? "text-green-600" : "text-red-600"}`}
            >
              {success ? "Genius!" : "Almost There!"}
            </h1>
            <p className="text-gray-600 text-lg">
              {success
                ? "You solved today's Rebuzzle!"
                : "Better luck tomorrow!"}
            </p>
          </div>

          {/* Stats Grid - Wordle Style */}
          <div className="space-y-6 p-6">
            {/* Attempt Visualization */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Your Attempts
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {[...Array(gameSettings.maxAttempts)].map((_, i) => (
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg font-bold text-lg text-white transition-all ${
                      i < attempts
                        ? success
                          ? "scale-110 bg-green-500"
                          : "bg-red-500"
                        : "bg-gray-200 text-gray-400"
                    }`}
                    key={i}
                  >
                    {i < attempts ? (success ? "✓" : "✗") : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* Answer Reveal */}
            <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
              <div className="space-y-2 text-center">
                <div className="font-semibold text-purple-600 text-sm uppercase tracking-wide">
                  The Answer
                </div>
                <div className="font-bold text-4xl text-purple-900 uppercase tracking-wider">
                  {gameData.answer}
                </div>
                <div className="mt-3 text-gray-600 text-sm leading-relaxed">
                  {gameData.explanation}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                <Target className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                <div className="font-bold text-2xl text-blue-900">
                  {attempts}
                </div>
                <div className="text-blue-700 text-xs">Attempts</div>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
                <Flame className="mx-auto mb-2 h-6 w-6 text-orange-600" />
                <div className="font-bold text-2xl text-orange-900">
                  {streak}
                </div>
                <div className="text-orange-700 text-xs">Day Streak</div>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-center">
                <Trophy className="mx-auto mb-2 h-6 w-6 text-purple-600" />
                <div className="font-bold text-2xl text-purple-900">
                  {gameData.difficulty}/10
                </div>
                <div className="text-purple-700 text-xs">Difficulty</div>
              </div>
            </div>

            {/* Enhanced Share Button */}
            <EnhancedShareButton
              attempts={attempts}
              answer={gameData.answer}
              className="w-full"
              difficulty={gameData.difficulty}
              maxAttempts={gameSettings.maxAttempts}
              puzzleType={gameData.puzzleType || gameData.metadata?.puzzleType}
              streak={streak}
              success={success}
            />
          </div>

          {/* Footer Actions */}
          <div className="border-gray-200 border-t bg-gray-50 p-6">
            <div className="space-y-3">
              {/* No "Play Again" button - they must wait! */}
              <div className="rounded-xl border-2 border-purple-200 bg-purple-50 py-4 text-center">
                <p className="mb-1 font-semibold text-purple-900">
                  🎉 You've completed today's puzzle!
                </p>
                <p className="text-purple-700 text-sm">
                  Come back tomorrow for a new challenge
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link className="block" href="/leaderboard">
                  <Button
                    className="w-full border-2 bg-purple-600 py-4 hover:bg-purple-700"
                    variant="default"
                  >
                    🏆 Leaderboard
                  </Button>
                </Link>
                <Link className="block" href="/blog">
                  <Button className="w-full border-2 py-4" variant="outline">
                    📚 Read Tips
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        {/* Next Puzzle Countdown - Real-time */}
        <div className="mt-6 text-center">
          <CountdownTimer />
          <p className="mt-3 text-gray-500 text-xs">
            Come back when the timer hits zero!
          </p>
        </div>

        {/* Powered by AI badge */}
        <div className="mt-4 text-center">
          <span className="text-gray-500 text-xs">
            🤖 Puzzle generated by Google AI · Unique every day
          </span>
        </div>
      </div>
    </Layout>
  );
}
