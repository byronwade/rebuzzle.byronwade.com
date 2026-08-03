import { ArrowLeft, ArrowRight } from "lucide-react";
import type { BlogPostResponse } from "@/app/actions/blogActions";
import { AppLink as Link } from "@/components/AppLink";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PostNavigationProps {
  prev: BlogPostResponse | null;
  next: BlogPostResponse | null;
  className?: string;
}

const PUZZLE_TYPE_LABELS: Record<string, string> = {
  rebus: "Rebus",
  "logic-grid": "Logic Grid",
  "cryptic-crossword": "Cryptic",
  "number-sequence": "Sequence",
  "pattern-recognition": "Pattern",
  "caesar-cipher": "Cipher",
  trivia: "Trivia",
};

export function PostNavigation({ prev, next, className }: PostNavigationProps) {
  if (!prev && !next) return null;

  return (
    <nav
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}
      aria-label="Post navigation"
    >
      {/* Previous post */}
      {prev ? (
        <Link
          href={`/blog/${prev.slug}`}
          className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong/50"
        >
          <div className="mb-3 flex items-center gap-1.5 font-mono text-[11px] text-subtle uppercase tracking-[0.08em]">
            <ArrowLeft className="size-3" />
            <span>Previous puzzle</span>
          </div>
          <div className="mb-1.5 flex items-center gap-2">
            {prev.puzzleType && (
              <Badge variant="mono">{PUZZLE_TYPE_LABELS[prev.puzzleType] || prev.puzzleType}</Badge>
            )}
            <span className="font-mono text-subtle text-xs">{prev.date}</span>
          </div>
          <p className="line-clamp-2 font-medium text-foreground text-sm">{prev.title}</p>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}

      {/* Next post */}
      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong/50 sm:text-right"
        >
          <div className="mb-3 flex items-center gap-1.5 font-mono text-[11px] text-subtle uppercase tracking-[0.08em] sm:justify-end">
            <span>Next puzzle</span>
            <ArrowRight className="size-3" />
          </div>
          <div className="mb-1.5 flex items-center gap-2 sm:justify-end">
            {next.puzzleType && (
              <Badge variant="mono">{PUZZLE_TYPE_LABELS[next.puzzleType] || next.puzzleType}</Badge>
            )}
            <span className="font-mono text-subtle text-xs">{next.date}</span>
          </div>
          <p className="line-clamp-2 font-medium text-foreground text-sm">{next.title}</p>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
    </nav>
  );
}
