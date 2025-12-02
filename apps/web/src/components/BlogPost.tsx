"use client";

import { BookOpen, Calendar, ChevronRight, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BlogPostProps {
  post: {
    slug: string;
    date: string;
    title: string;
    puzzle: string;
    puzzleType?: string;
    answer: string;
    explanation: string;
    excerpt: string;
    publishedAt?: Date;
    seoMetadata?: {
      readingTime?: number;
      wordCount?: number;
    };
  };
  variant?: "default" | "compact" | "featured";
}

const puzzleTypeLabels: Record<string, string> = {
  rebus: "Rebus",
  "logic-grid": "Logic Grid",
  "cryptic-crossword": "Cryptic",
  "number-sequence": "Sequence",
  "pattern-recognition": "Pattern",
  "caesar-cipher": "Cipher",
  trivia: "Trivia",
};

const puzzleTypeColors: Record<string, string> = {
  rebus: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  "logic-grid": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "cryptic-crossword":
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "number-sequence": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "pattern-recognition": "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  "caesar-cipher": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  trivia: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
};

const puzzleTypeAccent: Record<string, string> = {
  rebus: "group-hover:border-purple-500/40",
  "logic-grid": "group-hover:border-blue-500/40",
  "cryptic-crossword": "group-hover:border-emerald-500/40",
  "number-sequence": "group-hover:border-amber-500/40",
  "pattern-recognition": "group-hover:border-pink-500/40",
  "caesar-cipher": "group-hover:border-red-500/40",
  trivia: "group-hover:border-cyan-500/40",
};

export default function BlogPost({ post, variant = "default" }: BlogPostProps) {
  const [isToday, setIsToday] = useState(false);
  const [isYesterday, setIsYesterday] = useState(false);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const postDate = new Date(post.date);
    postDate.setHours(0, 0, 0, 0);
    setIsToday(today.getTime() === postDate.getTime());
    setIsYesterday(yesterday.getTime() === postDate.getTime());
  }, [post.date]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const typeLabel = post.puzzleType
    ? puzzleTypeLabels[post.puzzleType] || post.puzzleType
    : "Puzzle";

  const typeColor = post.puzzleType
    ? puzzleTypeColors[post.puzzleType] || "bg-muted text-muted-foreground"
    : "bg-muted text-muted-foreground";

  const accentColor = post.puzzleType
    ? puzzleTypeAccent[post.puzzleType] || "group-hover:border-primary/40"
    : "group-hover:border-primary/40";

  const readingTime =
    post.seoMetadata?.readingTime || Math.ceil((post.excerpt?.length || 100) / 50);

  if (variant === "featured") {
    return (
      <Link href={`/blog/${post.slug}`} className="block group">
        <article
          className={cn(
            "relative overflow-hidden rounded-xl border transition-all duration-300",
            "hover:shadow-lg hover:-translate-y-0.5",
            accentColor,
            isToday
              ? "bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-300/50 dark:border-amber-700/50"
              : "bg-card"
          )}
        >
          {/* Today ribbon */}
          {isToday && (
            <div className="absolute top-3 -right-8 bg-amber-500 text-white text-xs font-semibold px-10 py-1 rotate-45 shadow-sm">
              Today
            </div>
          )}

          <div className="p-5">
            {/* Top meta */}
            <div className="flex items-center gap-2 mb-3">
              <Badge className={cn("text-xs font-medium border", typeColor)}>{typeLabel}</Badge>
              <span className="text-xs text-muted-foreground">{formatDate(post.date)}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-xs text-muted-foreground">{readingTime} min read</span>
            </div>

            {/* Title */}
            <h2 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h2>

            {/* Excerpt */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{post.excerpt}</p>

            {/* CTA */}
            <div className="flex items-center text-sm font-medium text-primary">
              <BookOpen className="size-4 mr-2" />
              Read the full breakdown
              <ChevronRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link href={`/blog/${post.slug}`} className="block group">
        <article className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-colors">
          {/* Date pill */}
          <div className="flex-shrink-0 w-14 text-center py-1.5 rounded-md bg-muted/50">
            <div className="text-sm font-bold text-foreground leading-none">
              {new Date(post.date).getDate()}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase mt-0.5">
              {new Date(post.date).toLocaleDateString("en-US", { month: "short" })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge className={cn("text-[10px] h-4 font-medium border px-1.5", typeColor)}>
                {typeLabel}
              </Badge>
              {isToday && (
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  NEW
                </span>
              )}
            </div>
            <h2 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
              {post.title}
            </h2>
          </div>

          <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </article>
      </Link>
    );
  }

  // Default variant - clean, content-focused design
  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <article
        className={cn(
          "relative p-4 rounded-xl border transition-all duration-200",
          "hover:shadow-md hover:-translate-y-0.5",
          accentColor,
          isToday
            ? "bg-gradient-to-r from-amber-50/80 via-transparent to-transparent dark:from-amber-950/30 border-amber-200/60 dark:border-amber-800/60"
            : "bg-card"
        )}
      >
        {/* Top row: Badge + Date + Reading time */}
        <div className="flex items-center gap-2 mb-2">
          <Badge className={cn("text-xs font-medium border", typeColor)}>{typeLabel}</Badge>
          {isToday && (
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] h-5 gap-1 font-semibold">
              <Sparkles className="size-3" />
              Today
            </Badge>
          )}
          {isYesterday && !isToday && (
            <span className="text-xs text-muted-foreground">Yesterday</span>
          )}
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDate(post.date)}
          </span>
        </div>

        {/* Title - the main focus */}
        <h2 className="font-semibold text-base text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h2>

        {/* Excerpt teaser */}
        <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{post.excerpt}</p>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {readingTime} min read
          </span>
          <span className="text-xs font-medium text-primary flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
            Read more
            <ChevronRight className="size-4" />
          </span>
        </div>
      </article>
    </Link>
  );
}
