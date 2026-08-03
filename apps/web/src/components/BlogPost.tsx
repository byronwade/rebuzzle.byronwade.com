"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
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
  "logic-grid": "Logic grid",
  "cryptic-crossword": "Cryptic",
  "number-sequence": "Sequence",
  "pattern-recognition": "Pattern",
  "caesar-cipher": "Cipher",
  trivia: "Trivia",
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

  const readingTime =
    post.seoMetadata?.readingTime || Math.ceil((post.excerpt?.length || 100) / 50);

  // Featured — the one card that gets a shadow and a full excerpt.
  if (variant === "featured") {
    return (
      <Link className="group block" href={`/blog/${post.slug}`}>
        <article
          className={cn(
            "rounded-xl border border-border bg-card p-6 shadow-sm transition-colors duration-200",
            "hover:border-border-strong/50"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="mono">{typeLabel}</Badge>
            {isToday && <Badge variant="secondary">Today</Badge>}
            <span className="font-mono text-subtle text-xs">
              {formatDate(post.date)} · {readingTime} min
            </span>
          </div>

          <h2 className="mt-4 line-clamp-2 text-balance font-semibold text-foreground text-xl tracking-[-0.03em]">
            {post.title}
          </h2>

          <p className="mt-2 line-clamp-2 text-muted-foreground text-sm leading-6">
            {post.excerpt}
          </p>

          <span className="mt-5 inline-flex items-center gap-1.5 font-medium text-foreground text-sm">
            Read the breakdown
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </article>
      </Link>
    );
  }

  // Compact — sidebar / "more posts" list.
  if (variant === "compact") {
    return (
      <Link className="group block" href={`/blog/${post.slug}`}>
        <article className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted">
          <div className="w-12 shrink-0 rounded-md border border-border bg-inset py-1.5 text-center">
            <div className="font-mono font-medium text-foreground text-sm leading-none tabular-nums">
              {new Date(post.date).getDate()}
            </div>
            <div className="mt-1 font-mono text-[9px] text-subtle uppercase tracking-[0.08em]">
              {new Date(post.date).toLocaleDateString("en-US", { month: "short" })}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
                {typeLabel}
              </span>
              {isToday && (
                <span className="font-mono text-[10px] text-warning uppercase tracking-[0.08em]">
                  New
                </span>
              )}
            </div>
            <h2 className="truncate font-medium text-foreground text-sm">{post.title}</h2>
          </div>

          <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
        </article>
      </Link>
    );
  }

  // Default — a hairline-separated index row. No card chrome; the rule between
  // rows carries the structure, which keeps a long archive calm.
  return (
    <Link className="group block" href={`/blog/${post.slug}`}>
      <article className="-mx-4 rounded-lg px-4 py-6 transition-colors hover:bg-card">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Badge variant="mono">{typeLabel}</Badge>
          {isToday && <Badge variant="secondary">Today</Badge>}
          {isYesterday && !isToday && (
            <span className="font-mono text-subtle text-xs">Yesterday</span>
          )}
          <span className="ml-auto font-mono text-subtle text-xs tabular-nums">
            {formatDate(post.date)} · {readingTime} min
          </span>
        </div>

        <h2 className="mt-3 line-clamp-2 text-balance font-semibold text-foreground text-lg tracking-[-0.03em]">
          {post.title}
        </h2>

        <p className="mt-1.5 line-clamp-2 text-muted-foreground text-sm leading-6">
          {post.excerpt}
        </p>

        <span className="mt-3 inline-flex items-center gap-1.5 font-medium text-foreground text-sm">
          Read more
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </article>
    </Link>
  );
}
