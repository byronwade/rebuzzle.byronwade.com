"use client";

import { ArrowLeft, ArrowRight, Calendar, Clock, LockIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { analyticsEvents, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { PuzzleDisplay, PuzzleQuestion } from "./PuzzleDisplay";

interface BlogPostContentProps {
  post: {
    slug: string;
    date: string;
    title: string;
    puzzle: string;
    puzzleType?: string; // Optional puzzle type
    answer: string;
    explanation: string;
    content: string;
    publishedAt?: Date;
  };
}

export default function BlogPostContent({ post }: BlogPostContentProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isToday, setIsToday] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // Check if this is today's puzzle
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const postDate = new Date(post.date);
    postDate.setHours(0, 0, 0, 0);
    const isCurrentPuzzle = today.getTime() === postDate.getTime();
    setIsToday(isCurrentPuzzle);

    // Check if today's puzzle is completed
    // This will be handled by the parent component or API
    if (isCurrentPuzzle) {
      // For now, assume not completed unless we have other data
      setIsCompleted(false);
    }

    trackEvent(analyticsEvents.BLOG_POST_VIEW, {
      slug: post.slug,
      title: post.title,
    });
  }, [post.slug, post.title, post.date]);

  const handleRevealClick = () => {
    if (isToday && !isCompleted) {
      return;
    }
    setIsRevealed(true);
    trackEvent(analyticsEvents.BLOG_ANSWER_REVEALED, { slug: post.slug });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Back to Blog */}
      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
          href="/blog"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Blog</span>
        </Link>
      </div>

      {/* Main Article */}
      <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Header */}
        <div className="border-b bg-muted/30 px-4 py-4 md:px-6 md:py-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Calendar className="size-3.5" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </div>
            {isToday && (
              <div className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground text-xs">
                Today's Puzzle
              </div>
            )}
          </div>
          <h1 className="font-semibold text-base text-foreground md:text-lg">
            {post.title}
          </h1>
        </div>

        {/* Puzzle Section */}
        <div className="px-4 py-4 md:px-6 md:py-6">
          <div className="space-y-4">
            <div>
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-base text-foreground">
                <span className="text-lg">🧩</span>
                <span>The Puzzle</span>
              </h2>
              <div className="rounded-lg border bg-muted/50 p-4 text-center md:p-6">
                <div className="mb-3">
                  <PuzzleDisplay
                    className="text-primary"
                    puzzle={post.puzzle}
                    puzzleType={post.puzzleType}
                    size="large"
                  />
                </div>
                <PuzzleQuestion
                  className="text-muted-foreground text-sm"
                  puzzleType={post.puzzleType}
                />
              </div>
            </div>

            {/* Answer Section */}
            {isRevealed ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border-2 border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
                  <div className="border-b border-green-500/20 bg-green-100/80 px-4 py-3 dark:bg-green-900/30 md:px-6">
                    <h3 className="flex items-center gap-2 font-semibold text-base text-foreground">
                      <div className="flex size-8 items-center justify-center rounded-full bg-green-500 shadow-sm">
                        <span className="font-bold text-sm text-white">✓</span>
                      </div>
                      <span>The Answer</span>
                    </h3>
                  </div>
                  <div className="px-4 py-4 md:px-6 md:py-6">
                    <p className="font-semibold text-2xl text-green-700 tracking-tight dark:text-green-400 md:text-3xl">
                      {post.answer}
                    </p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border-2 border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20">
                  <div className="border-b border-blue-500/20 bg-blue-100/80 px-4 py-3 dark:bg-blue-900/30 md:px-6">
                    <h3 className="flex items-center gap-2 font-semibold text-base text-foreground">
                      <div className="flex size-8 items-center justify-center rounded-full bg-blue-500 shadow-sm">
                        <span className="text-sm text-white">💡</span>
                      </div>
                      <span>Explanation</span>
                    </h3>
                  </div>
                  <div className="px-4 py-4 md:px-6 md:py-6">
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:font-semibold prose-strong:text-foreground">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed md:text-base">
                        {post.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Button
                    className={cn(
                      "font-medium",
                      isToday && !isCompleted && "cursor-not-allowed"
                    )}
                    disabled={isToday && !isCompleted}
                    onClick={handleRevealClick}
                    size="default"
                    variant={isToday && !isCompleted ? "secondary" : "default"}
                  >
                    {isToday && !isCompleted ? (
                      <>
                        <LockIcon className="size-4" />
                        Complete Today's Puzzle First
                      </>
                    ) : (
                      <>
                        <span>Reveal Answer & Explanation</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
                {isToday && !isCompleted && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-50/50 p-3 dark:bg-amber-950/20">
                    <p className="flex items-center gap-1.5 text-amber-700 text-sm dark:text-amber-400">
                      <Clock className="size-3.5" />
                      You need to complete today's puzzle before viewing its
                      solution.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Article Content */}
          <div className="mt-6 border-t pt-6">
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:font-semibold prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-primary prose-code:text-xs prose-pre:bg-muted prose-pre:text-foreground prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-ul:ml-6 prose-ol:ml-6 prose-li:text-muted-foreground md:prose-base">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-6 rounded-lg border bg-muted/50 p-4 text-center md:p-6">
            <h3 className="mb-2 font-semibold text-base text-foreground">
              Ready for More Puzzles?
            </h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Challenge yourself with today's puzzle!
            </p>
            <Button asChild size="default" variant="default">
              <Link href="/">
                <span>Play Today's Puzzle</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}
