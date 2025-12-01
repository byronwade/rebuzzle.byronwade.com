"use client";

import { ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PuzzleDisplay, PuzzleQuestion } from "./PuzzleDisplay";

interface BlogPostProps {
  post: {
    slug: string;
    date: string;
    title: string;
    puzzle: string;
    puzzleType?: string; // Optional puzzle type
    answer: string;
    explanation: string;
    excerpt: string;
    publishedAt?: Date;
  };
}

export default function BlogPost({ post }: BlogPostProps) {
  const [isToday, setIsToday] = useState(false);

  useEffect(() => {
    // Check if this is today's puzzle
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const postDate = new Date(post.date);
    postDate.setHours(0, 0, 0, 0);
    const isCurrentPuzzle = today.getTime() === postDate.getTime();
    setIsToday(isCurrentPuzzle);
  }, [post.date]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-purple-300 hover:shadow-md">
      {/* Header */}
      <div className="border-gray-100 border-b bg-gradient-to-br from-purple-50 to-white px-6 py-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(post.date)}</span>
          </div>
          {isToday && (
            <div className="rounded-full bg-purple-600 px-3 py-1 font-medium text-white text-xs">
              Today's Puzzle
            </div>
          )}
        </div>
        <h2 className="mb-3 line-clamp-2 font-bold text-gray-900 text-xl transition-colors group-hover:text-purple-700">
          {post.title}
        </h2>
        <p className="line-clamp-2 text-gray-600 text-sm leading-relaxed">
          {post.excerpt}
        </p>
      </div>

      {/* Puzzle Section */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-base text-gray-700">
            <span className="text-lg">🧩</span>
            <span>The Puzzle</span>
          </h3>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <div className="mb-3">
              <PuzzleDisplay
                className="text-purple-600"
                puzzle={post.puzzle}
                puzzleType={post.puzzleType}
                size="medium"
              />
            </div>
            <PuzzleQuestion
              className="text-gray-500 text-xs"
              puzzleType={post.puzzleType}
            />
          </div>
        </div>

        {/* Read More Link */}
        <div className="mt-4 border-gray-100 border-t pt-4">
          <Link
            className="inline-flex items-center gap-1.5 font-medium text-purple-600 text-sm transition-colors hover:text-purple-700"
            href={`/blog/${post.slug}`}
          >
            <span>Read Full Article</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
