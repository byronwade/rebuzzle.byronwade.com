"use client";

import { Clock, TrendingDown, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// No cookies needed - data comes from URL params

export default function PuzzleFailedPage() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [canRetry, setCanRetry] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [answer, setAnswer] = useState<string>("");

  useEffect(() => {
    // Get failure data from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const attemptsParam = urlParams.get("attempts");
    const answerParam = urlParams.get("answer");

    if (!(attemptsParam && answerParam)) {
      // No failure data, redirect to home
      router.push("/");
      return;
    }

    try {
      setAttempts(Number.parseInt(attemptsParam) || 0);
      setAnswer(answerParam || "");

      // Calculate next play time (tomorrow at midnight)
      const now = new Date();
      const nextPlayTime = new Date(now);
      nextPlayTime.setDate(nextPlayTime.getDate() + 1);
      nextPlayTime.setHours(0, 0, 0, 0);

      // Update countdown every second
      const interval = setInterval(() => {
        const now = new Date();
        const diff = nextPlayTime.getTime() - now.getTime();

        if (diff <= 0) {
          setCanRetry(true);
          setTimeLeft("Ready to play!");
          clearInterval(interval);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error("Error parsing failure data:", error);
      router.push("/");
    }
  }, [router]);

  const handleRetry = () => {
    if (canRetry) {
      // No cookies to clear - just redirect
      router.push("/");
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <Card className="overflow-hidden rounded-3xl border-2 border-red-100 bg-white shadow-2xl">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <XCircle className="h-16 w-16" />
            </div>
            <h1 className="mb-2 font-bold text-3xl md:text-4xl">
              Puzzle Failed
            </h1>
            <p className="text-lg text-red-100">
              Don't worry, you'll get the next one!
            </p>
          </div>

          {/* Content Section */}
          <div className="space-y-6 p-8">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-gray-50 p-4 text-center">
                <TrendingDown className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <div className="font-bold text-2xl text-gray-900">
                  {attempts}
                </div>
                <div className="text-gray-600 text-sm">Attempts Used</div>
              </div>
              <div className="rounded-xl bg-blue-50 p-4 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                <div className="font-bold text-2xl text-blue-900">
                  {timeLeft || "Calculating..."}
                </div>
                <div className="text-blue-700 text-sm">Until Next Puzzle</div>
              </div>
            </div>

            {/* Answer Reveal */}
            {answer && (
              <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-6">
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-purple-900">
                  <span>💡</span> The Answer Was:
                </h3>
                <p className="text-center font-bold text-3xl text-purple-600 uppercase tracking-wide">
                  {answer}
                </p>
              </div>
            )}

            {/* Encouragement */}
            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
              <h3 className="mb-3 font-semibold text-gray-900">
                Keep Improving! 🚀
              </h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-green-600">✓</span>
                  <span>
                    Every puzzle helps you get better at pattern recognition
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-green-600">✓</span>
                  <span>Tomorrow's puzzle is a fresh challenge</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-green-600">✓</span>
                  <span>
                    Use hints strategically - they're there to help you learn
                  </span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 py-6 font-semibold text-lg hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canRetry}
                onClick={handleRetry}
                size="lg"
              >
                {canRetry ? "Play Next Puzzle" : `Wait ${timeLeft}`}
              </Button>

              <Button
                className="flex-1 border-2 py-6 text-lg"
                onClick={() => router.push("/blog")}
                size="lg"
                variant="outline"
              >
                Read Puzzle Tips
              </Button>
            </div>

            {/* Info */}
            <div className="border-gray-200 border-t pt-4 text-center text-gray-500 text-sm">
              <p>A new puzzle will be available at midnight. Come back then!</p>
              <p className="mt-1">
                In the meantime, check out our blog for puzzle-solving tips.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
