"use client";

import { LoginPrompt } from "./LoginPrompt";

// UserStats interface moved to local definition
interface UserStats {
  level: number;
  points: number;
  streak: number;
  dailyChallengeStreak: number;
  achievements: string[];
}

import { Star, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { getFeatureFlag } from "@/lib/featureFlags";
import { NewLeaderboard } from "./NewLeaderboard";
import { ShareButton } from "./ShareButton";

interface LeaderboardEntry {
  name: string;
  correctAnswers: number[];
}

interface GameOverContentProps {
  answer: string;
  explanation: string;
  leaderboard: LeaderboardEntry[];
  success: boolean;
  userGuess: string;
  isLoggedIn: boolean;
  userStats: UserStats;
  attempts: number;
  maxAttempts: number;
}

const achievementNames: { [key: string]: string } = {
  first_win: "First Win",
  streak_3: "3-Day Streak",
  streak_7: "7-Day Streak",
  games_10: "10 Games Played",
  games_30: "30 Games Played",
  daily_3: "3-Day Daily Challenge Streak",
  daily_7: "7-Day Daily Challenge Streak",
};

export default function GameOverContent({
  answer,
  explanation,
  leaderboard,
  success,
  userGuess,
  isLoggedIn,
  userStats,
  attempts,
  maxAttempts,
}: GameOverContentProps) {
  const newAchievements = userStats.achievements || [];

  const nextLevel = userStats.level < 5 ? userStats.level + 1 : 5;
  const currentLevelThreshold =
    userStats.level > 1 ? 500 * (userStats.level - 1) : 0;
  const nextLevelThreshold = 500 * userStats.level;
  const progressToNextLevel =
    ((userStats.points - currentLevelThreshold) /
      (nextLevelThreshold - currentLevelThreshold)) *
    100;

  const [newLeaderboardEnabled, setNewLeaderboardEnabled] = useState(false);

  useEffect(() => {
    async function checkFeatureFlag() {
      const isEnabled = await getFeatureFlag("NEW_LEADERBOARD");
      setNewLeaderboardEnabled(isEnabled);
    }
    checkFeatureFlag();
  }, []);

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Answer reveal section */}
      <div className="space-y-4 text-center">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="mb-3 font-semibold text-gray-800 text-lg">
            The Answer Was:
          </h3>
          <div className="mb-3 break-words font-bold text-3xl text-blue-600">
            {answer}
          </div>
          {!success && userGuess !== answer && (
            <p className="mb-3 break-words text-gray-600 text-lg">
              Your guess:{" "}
              <span className="font-semibold text-red-600">{userGuess}</span>
            </p>
          )}
          {explanation && (
            <p className="text-gray-600 text-sm leading-relaxed">
              {explanation}
            </p>
          )}
        </div>

        {/* Game stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-center">
            <div className="font-bold text-2xl text-purple-600">{attempts}</div>
            <div className="text-gray-600 text-sm">Attempts Used</div>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
            <div className="font-bold text-2xl text-green-600">
              {maxAttempts}
            </div>
            <div className="text-gray-600 text-sm">Total Attempts</div>
          </div>
        </div>

        {/* Share button */}
        <div className="pt-4">
          <ShareButton
            attempts={attempts}
            className="mx-auto"
            maxAttempts={maxAttempts}
            success={success}
          />
        </div>
      </div>

      {/* Login prompt for non-authenticated users */}
      {!isLoggedIn && (
        <div className="mt-6 mb-6">
          <LoginPrompt />
        </div>
      )}

      {/* User stats and achievements section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stats section */}
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center font-bold text-gray-800 text-xl">
            <Trophy className="mr-2 h-5 w-5 text-yellow-500" /> Your Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-gray-500 text-sm">Level</p>
              <p className="font-semibold text-gray-800 text-xl">
                {userStats.level}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-sm">Points</p>
              <p className="font-semibold text-gray-800 text-xl">
                {userStats.points}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-sm">Streak</p>
              <p className="font-semibold text-gray-800 text-xl">
                {userStats.streak}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-sm">Daily Streak</p>
              <p className="font-semibold text-gray-800 text-xl">
                {userStats.dailyChallengeStreak}
              </p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-gray-500 text-sm">
              Progress to Level {nextLevel}
            </p>
            <Progress className="h-3 w-full" value={progressToNextLevel} />
          </div>
        </div>

        {/* Achievements section */}
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center font-bold text-gray-800 text-xl">
            <Star className="mr-2 h-5 w-5 text-yellow-500" /> New Achievements
          </h3>
          {newAchievements.length > 0 ? (
            <ul className="space-y-2">
              {newAchievements.map((achievement, index) => (
                <li
                  className="flex items-center rounded-lg border border-purple-200 bg-purple-50 p-3"
                  key={index}
                >
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                    <Star className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="font-medium text-purple-700">
                    {achievementNames[achievement] || achievement}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Star className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600">No new achievements this time.</p>
              <p className="mt-1 text-gray-500 text-sm">
                Keep playing to earn more!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {newLeaderboardEnabled ? (
          <NewLeaderboard />
        ) : (
          <>
            <h2 className="mb-6 flex items-center font-bold text-gray-800 text-xl">
              <Zap className="mr-2 h-5 w-5 text-yellow-500" /> Leaderboard
            </h2>
            <div className="space-y-4">
              {leaderboard.map((entry, index) => (
                <div className="rounded-xl bg-gray-50 p-4" key={index}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="truncate pr-2 font-semibold text-gray-800 text-lg">
                      #{index + 1} {entry.name}
                    </span>
                    <span className="shrink-0 text-gray-500 text-sm">
                      {entry.correctAnswers.reduce(
                        (sum, count) => sum + count,
                        0
                      )}{" "}
                      correct
                    </span>
                  </div>
                  <div className="flex space-x-1 overflow-x-auto">
                    {entry.correctAnswers.map((count, dayIndex) => (
                      <div
                        className="h-4 w-4 shrink-0 rounded-sm bg-purple-600"
                        key={dayIndex}
                        style={{ opacity: count > 0 ? 1 : 0.2 }}
                        title={`Day ${dayIndex + 1}: ${count} correct`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
