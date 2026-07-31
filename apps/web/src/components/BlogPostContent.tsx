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
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BlogPostSections } from "@/db/models";
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
    sections?: BlogPostSections;
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

/** Split markdown so spoilers under "## The Solution" stay behind reveal. */
function splitSafeAndSpoilerContent(content: string): {
  safe: string;
  spoiler: string;
} {
  if (!content?.trim()) return { safe: "", spoiler: "" };
  const match = content.match(/^##\s+the solution\b.*$/im);
  if (!match || match.index === undefined) {
    // No clear solution heading — treat whole body as potentially spoilery
    return { safe: "", spoiler: content };
  }
  return {
    safe: content.slice(0, match.index).trim(),
    spoiler: content.slice(match.index).trim(),
  };
}

function SectionBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-10">
      <h2 className="font-semibold text-foreground text-xl tracking-[-0.03em]">{title}</h2>
      <div className="prose prose-sm mt-3 max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </section>
  );
}

export default function BlogPostContent({ post }: BlogPostContentProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isToday, setIsToday] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const sections = post.sections;
  const hasStructured = Boolean(
    sections?.introduction ||
      sections?.puzzleAnalysis ||
      sections?.solvingStrategy ||
      sections?.puzzleHistory
  );

  const { safe, spoiler } = useMemo(
    () => splitSafeAndSpoilerContent(post.content || ""),
    [post.content]
  );

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
    <div>
      <Link
        className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
        href="/blog"
      >
        <ArrowLeft className="size-3.5" />
        Back to blog
      </Link>

      <header className="mt-8 border-border border-b pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="mono">{typeLabel}</Badge>
          {isToday && (
            <Badge variant="warning">
              <Sparkles className="size-3" />
              Today
            </Badge>
          )}
          <span className="flex items-center gap-1.5 font-mono text-subtle text-xs">
            <Calendar className="size-3" />
            {formatDate(post.date)}
          </span>
        </div>
        <h1 className="mt-4 text-balance font-semibold text-3xl text-foreground tracking-[-0.04em] md:text-4xl">
          {post.title}
        </h1>
      </header>

      <section className="mt-10">
        <p className="eyebrow">The puzzle</p>
        <div className="mt-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="rounded-lg border border-border bg-inset px-4 py-8">
            <PuzzleDisplay puzzle={post.puzzle} puzzleType={post.puzzleType} size="large" />
          </div>
        </div>
      </section>

      {/* Non-spoiler article body */}
      {hasStructured ? (
        <>
          {sections?.introduction && (
            <SectionBlock body={sections.introduction} title="Introduction" />
          )}
          {sections?.puzzleAnalysis && (
            <SectionBlock body={sections.puzzleAnalysis} title="Puzzle analysis" />
          )}
          {sections?.solvingStrategy && (
            <SectionBlock body={sections.solvingStrategy} title="Solving strategy" />
          )}
          {sections?.puzzleHistory && (
            <SectionBlock body={sections.puzzleHistory} title="History" />
          )}
        </>
      ) : (
        safe && (
          <article className="prose prose-sm mt-12 max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{safe}</ReactMarkdown>
          </article>
        )
      )}

      {/* Reveal gate — answer + solution */}
      <section className="mt-10">
        {isRevealed ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-border border-b px-5 py-5">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-3.5 text-success" />
                <span className="font-mono text-[11px] text-subtle uppercase tracking-[0.1em]">
                  Answer
                </span>
              </div>
              <p className="mt-2 font-semibold text-2xl text-foreground tracking-[-0.04em]">
                {post.answer}
              </p>
            </div>

            <div className="px-5 py-5">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-3.5 text-subtle" />
                <span className="font-mono text-[11px] text-subtle uppercase tracking-[0.1em]">
                  Explanation
                </span>
              </div>
              <p className="mt-2 text-muted-foreground text-sm leading-6">{post.explanation}</p>
            </div>

            {(sections?.solution || spoiler) && (
              <div className="border-border border-t px-5 py-5">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {sections?.solution || spoiler}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {sections?.callToAction && (
              <div className="border-border border-t px-5 py-5 text-muted-foreground text-sm leading-6">
                {sections.callToAction}
              </div>
            )}

            <div className="border-border border-t bg-inset px-5 py-3">
              <Button onClick={() => setIsRevealed(false)} size="sm" variant="ghost">
                <EyeOff className="size-3.5" />
                Hide solution
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
            <Button
              className={cn("w-full", !canReveal && "opacity-60")}
              disabled={!canReveal}
              onClick={handleRevealClick}
              size="lg"
            >
              {canReveal ? (
                <>
                  <Eye className="size-4" />
                  Reveal solution
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  Complete the puzzle first
                </>
              )}
            </Button>

            {!canReveal && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-subtle text-xs">
                <Clock className="size-3" />
                Play today&apos;s puzzle to unlock the solution
              </p>
            )}
            {canReveal && (
              <p className="mt-3 text-center text-subtle text-xs">
                Spoilers stay hidden until you click — try the puzzle first for half points.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Fallback: if structured sections exist but we also had unsafe-only markdown */}
      {!hasStructured && !safe && !isRevealed && post.content && (
        <p className="mt-8 text-center text-muted-foreground text-sm">
          Full write-up unlocks with the solution reveal.
        </p>
      )}

      <section className="mt-14 rounded-xl bg-foreground px-6 py-10 text-center text-background">
        <p className="text-balance font-semibold text-xl tracking-[-0.03em]">Ready for more?</p>
        <p className="mt-2 text-background/60 text-sm">
          A fresh puzzle lands every day. Past puzzles are worth half points.
        </p>
        <Link
          className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-pill bg-background px-5 font-medium text-foreground text-sm transition-opacity hover:opacity-90"
          href="/"
        >
          Play today&apos;s puzzle
          <ArrowRight className="size-3.5" />
        </Link>
      </section>
    </div>
  );
}
