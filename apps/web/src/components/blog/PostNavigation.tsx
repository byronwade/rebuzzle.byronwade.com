import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { BlogPostResponse } from "@/app/actions/blogActions";
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
      className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}
      aria-label="Post navigation"
    >
      {/* Previous post */}
      {prev ? (
        <Link
          href={`/blog/${prev.slug}`}
          className="group flex flex-col p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <ArrowLeft className="size-4" />
            <span>Previous Puzzle</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            {prev.puzzleType && (
              <Badge variant="outline" className="text-xs">
                {PUZZLE_TYPE_LABELS[prev.puzzleType] || prev.puzzleType}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{prev.date}</span>
          </div>
          <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {prev.title}
          </p>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}

      {/* Next post */}
      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          className="group flex flex-col p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors sm:text-right"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 sm:justify-end">
            <span>Next Puzzle</span>
            <ArrowRight className="size-4" />
          </div>
          <div className="flex items-center gap-2 mb-1 sm:justify-end">
            {next.puzzleType && (
              <Badge variant="outline" className="text-xs">
                {PUZZLE_TYPE_LABELS[next.puzzleType] || next.puzzleType}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{next.date}</span>
          </div>
          <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {next.title}
          </p>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
    </nav>
  );
}
