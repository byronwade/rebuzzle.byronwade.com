import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

const MARK_SIZE: Record<LogoSize, string> = {
  sm: "size-6",
  md: "size-7",
  lg: "size-9",
};

const WORDMARK_SIZE: Record<LogoSize, string> = {
  sm: "text-[15px]",
  md: "text-[17px]",
  lg: "text-xl",
};

/** Shared path for the puzzle-piece counter inside the R. */
const PUZZLE_PIECE =
  "M27.8 20.8h6.9v1.1c0-2.1 1.55-3.5 3.55-3.5 2.55 0 3.95 2.05 3.95 6.6s-1.4 6.6-3.95 6.6c-2 0-3.55-1.4-3.55-3.5v1.1h-6.9V20.8Z";

const R_WITH_PUZZLE_CUTOUT = `M18 14h16.2c7.35 0 12.3 4.55 12.3 11.15 0 5.05-2.85 8.85-7.55 10.35L48.2 50H38.7L30.4 36.9H25.5V50H18V14Z${PUZZLE_PIECE}`;

type RebuzzleMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Rebuzzle board mark — ink tile, geometric R, puzzle-piece counter in link blue.
 * Uses foreground/background so it flips cleanly with the theme.
 */
export function RebuzzleMark({ className, title }: RebuzzleMarkProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
      fill="none"
      role={title ? "img" : undefined}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <rect className="fill-foreground" height="64" rx="14" width="64" />
      <path className="fill-background" d={R_WITH_PUZZLE_CUTOUT} fillRule="evenodd" />
      <path className="fill-link" d={PUZZLE_PIECE} />
    </svg>
  );
}

type RebuzzleLogoProps = {
  className?: string;
  markClassName?: string;
  size?: LogoSize;
  showWordmark?: boolean;
  /** Accessible name when the logo is the sole content of a link */
  title?: string;
};

export function RebuzzleLogo({
  className,
  markClassName,
  size = "md",
  showWordmark = true,
  title = "Rebuzzle",
}: RebuzzleLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <RebuzzleMark
        className={cn(MARK_SIZE[size], markClassName)}
        title={showWordmark ? undefined : title}
      />
      {showWordmark ? (
        <span
          className={cn("font-semibold text-foreground tracking-[-0.04em]", WORDMARK_SIZE[size])}
        >
          Rebuzzle
        </span>
      ) : null}
    </span>
  );
}
