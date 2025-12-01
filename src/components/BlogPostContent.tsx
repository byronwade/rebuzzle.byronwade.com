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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl">
        {/* Back to Blog */}
        <div className="mb-8">
          <Link
            className="inline-flex items-center gap-2 px-4 py-2 text-purple-600 transition-colors duration-200 hover:text-purple-700"
            href="/blog"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Blog</span>
          </Link>
        </div>

        {/* Main Article */}
        <article className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg">
          {/* Header */}
          <div className="border-purple-100 border-b bg-purple-50 px-6 py-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(post.date)}</span>
              </div>
              {isToday && (
                <div className="rounded-full bg-purple-600 px-3 py-1 font-semibold text-white text-xs">
                  Today's Puzzle
                </div>
              )}
            </div>
            <h1 className="mb-4 font-bold text-4xl text-gray-800">
              {post.title}
            </h1>
          </div>

          {/* Puzzle Section */}
          <div className="p-6 md:p-8">
            <div className="mb-6">
              <h2 className="mb-4 flex items-center gap-3 font-semibold text-gray-700 text-xl md:text-2xl">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                  <span className="text-purple-600">🧩</span>
                </div>
                Today's Puzzle
              </h2>
              <div className="mb-4 rounded-xl border-2 border-gray-200 border-dashed bg-gray-50 p-6 text-center md:rounded-2xl md:p-8">
                <div className="mb-4">
                  <PuzzleDisplay
                    className="text-purple-600"
                    puzzle={post.puzzle}
                    puzzleType={post.puzzleType}
                    size="large"
                  />
                </div>
                <PuzzleQuestion
                  className="text-gray-500"
                  puzzleType={post.puzzleType}
                />
              </div>

              {/* Answer Section */}
              {isRevealed ? (
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-green-100/50 shadow-sm">
                    <div className="border-green-200 border-b bg-green-100/80 px-6 py-4">
                      <h3 className="flex items-center gap-3 font-semibold text-gray-800 text-xl">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 shadow-sm">
                          <span className="font-bold text-lg text-white">
                            ✓
                          </span>
                        </div>
                        <span>The Answer</span>
                      </h3>
                    </div>
                    <div className="px-6 py-6">
                      <p className="font-bold text-4xl text-green-700 tracking-tight">
                        {post.answer}
                      </p>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-sm">
                    <div className="border-blue-200 border-b bg-blue-100/80 px-6 py-4">
                      <h3 className="flex items-center gap-3 font-semibold text-gray-800 text-xl">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 shadow-sm">
                          <span className="text-lg text-white">💡</span>
                        </div>
                        <span>Explanation</span>
                      </h3>
                    </div>
                    <div className="px-6 py-6">
                      <div className="prose prose-lg prose-p:mb-4 max-w-none prose-strong:font-semibold prose-p:text-gray-700 prose-strong:text-gray-900 prose-p:leading-relaxed">
                        <p className="whitespace-pre-wrap text-gray-700 text-lg leading-relaxed">
                          {post.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      className={cn(
                        "font-medium",
                        isToday && !isCompleted
                          ? "cursor-not-allowed"
                          : "border-purple-300 text-purple-700 hover:border-purple-400 hover:bg-purple-50"
                      )}
                      disabled={isToday && !isCompleted}
                      onClick={handleRevealClick}
                      size="default"
                      variant={
                        isToday && !isCompleted ? "secondary" : "outline"
                      }
                    >
                      {isToday && !isCompleted ? (
                        <>
                          <LockIcon className="h-4 w-4" />
                          Complete Today's Puzzle First
                        </>
                      ) : (
                        <>
                          <span>Reveal Answer & Explanation</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                  {isToday && !isCompleted && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="flex items-center gap-2 text-amber-700 text-sm">
                        <Clock className="h-4 w-4" />
                        You need to complete today's puzzle before viewing its
                        solution.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Article Content */}
            <div className="border-gray-200 border-t pt-6 md:pt-8">
              <div className="prose prose-lg prose-li:mb-2 prose-p:mb-6 prose-ol:ml-6 prose-ul:ml-6 max-w-none prose-ol:list-decimal prose-ul:list-disc prose-code:rounded prose-blockquote:border-purple-300 prose-blockquote:border-l-4 prose-code:bg-purple-50 prose-pre:bg-gray-900 prose-code:px-1 prose-code:py-0.5 prose-blockquote:pl-4 prose-headings:font-bold prose-strong:font-semibold prose-a:text-purple-600 prose-code:text-purple-600 prose-code:text-sm prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-headings:text-gray-800 prose-p:text-gray-700 prose-pre:text-gray-100 prose-strong:text-gray-900 prose-blockquote:italic prose-p:leading-relaxed prose-a:underline hover:prose-a:text-purple-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {post.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-8 rounded-xl border border-purple-200 bg-purple-50 p-5 text-center">
              <h3 className="mb-2 font-semibold text-gray-800 text-lg">
                Ready for More Puzzles?
              </h3>
              <p className="mb-4 text-gray-600 text-sm">
                Challenge yourself with today's puzzle!
              </p>
              <Link
                className="inline-flex items-center gap-2 rounded-lg border border-purple-300 bg-white px-4 py-2 font-medium text-purple-700 text-sm transition-colors hover:border-purple-400 hover:bg-purple-50"
                href="/"
              >
                <span>Play Today's Puzzle</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
