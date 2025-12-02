"use client";

import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Lightbulb,
  Lock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { analyticsEvents, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { PuzzleDisplay } from "./PuzzleDisplay";

interface BlogPostContentProps {
  post: {
    slug: string;
    date: string;
    title: string;
    puzzle: string;
    puzzleType?: string;
    answer: string;
    explanation: string;
    content: string;
    publishedAt?: Date;
  };
}

const puzzleTypeLabels: Record<string, string> = {
  rebus: "Rebus",
  "logic-grid": "Logic Grid",
  "cryptic-crossword": "Cryptic Crossword",
  "number-sequence": "Number Sequence",
  "pattern-recognition": "Pattern Recognition",
  "caesar-cipher": "Caesar Cipher",
  trivia: "Trivia",
};

export default function BlogPostContent({ post }: BlogPostContentProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isToday, setIsToday] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const postDate = new Date(post.date);
    postDate.setHours(0, 0, 0, 0);
    const isCurrentPuzzle = today.getTime() === postDate.getTime();
    setIsToday(isCurrentPuzzle);

    if (isCurrentPuzzle) {
      setIsCompleted(false);
    }

    trackEvent(analyticsEvents.BLOG_POST_VIEW, {
      slug: post.slug,
      title: post.title,
    });
  }, [post.slug, post.title, post.date]);

  const handleRevealClick = () => {
    if (isToday && !isCompleted) return;
    setIsRevealed(true);
    trackEvent(analyticsEvents.BLOG_ANSWER_REVEALED, { slug: post.slug });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const typeLabel = post.puzzleType
    ? puzzleTypeLabels[post.puzzleType] || post.puzzleType
    : "Puzzle";

  const canReveal = !isToday || isCompleted;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Blog
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {isToday && (
            <Badge className="bg-amber-500 text-white gap-1">
              <Sparkles className="size-3" />
              Today
            </Badge>
          )}
          <Badge variant="outline">{typeLabel}</Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDate(post.date)}
          </span>
        </div>
        <h1 className="font-semibold text-lg text-foreground">{post.title}</h1>
      </div>

      {/* Puzzle Display */}
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-3">The Puzzle</p>
            <div className="py-4 px-2 rounded-lg bg-muted/30">
              <PuzzleDisplay
                puzzle={post.puzzle}
                puzzleType={post.puzzleType}
                size="large"
                className="text-foreground"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answer Section */}
      <Card>
        <CardContent className="p-4">
          {isRevealed ? (
            <div className="space-y-4">
              {/* Answer */}
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">
                    Answer
                  </span>
                </div>
                <p className="font-semibold text-xl text-green-800 dark:text-green-200">
                  {post.answer}
                </p>
              </div>

              {/* Explanation */}
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="size-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Explanation
                  </span>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  {post.explanation}
                </p>
              </div>

              {/* Hide button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRevealed(false)}
                className="text-muted-foreground"
              >
                <EyeOff className="size-4 mr-1.5" />
                Hide Answer
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleRevealClick}
                disabled={!canReveal}
                className={cn("w-full", !canReveal && "opacity-60")}
              >
                {canReveal ? (
                  <>
                    <Eye className="size-4 mr-1.5" />
                    Reveal Answer
                  </>
                ) : (
                  <>
                    <Lock className="size-4 mr-1.5" />
                    Complete Puzzle First
                  </>
                )}
              </Button>

              {!canReveal && (
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                  <Clock className="size-3" />
                  Play today's puzzle to unlock the solution
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Article Content */}
      {post.content && (
        <Card>
          <CardContent className="p-4">
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Play CTA */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-medium mb-1">Ready for more?</p>
          <p className="text-xs text-muted-foreground mb-3">
            Challenge yourself with today's puzzle
          </p>
          <Link href="/">
            <Button size="sm">
              Play Now
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
