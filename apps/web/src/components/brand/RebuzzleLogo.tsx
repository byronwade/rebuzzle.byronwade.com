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

/** Classic jigsaw: tabs on top/right/bottom, socket on the left. */
const PUZZLE_PIECE =
  "M30 22.8H32.55C32.55 20.75 33.7 19.4 35.5 19.4C37.3 19.4 38.45 20.75 38.45 22.8H41C42.45 22.8 43.55 23.9 43.55 25.35V26.5C45.45 26.5 46.75 27.7 46.75 29.55C46.75 31.4 45.45 32.6 43.55 32.6V33.75C43.55 35.2 42.45 36.3 41 36.3H38.45C38.45 38.35 37.3 39.7 35.5 39.7C33.7 39.7 32.55 38.35 32.55 36.3H30C28.55 36.3 27.45 35.2 27.45 33.75V32.6C27.45 32.6 31.1 32.6 31.1 29.55C31.1 26.5 27.45 26.5 27.45 26.5V25.35C27.45 23.9 28.55 22.8 30 22.8Z";

const R_WITH_PUZZLE_CUTOUT = `M18 14h16.2c7.35 0 12.3 4.55 12.3 11.15 0 5.05-2.85 8.85-7.55 10.35L48.2 50H38.7L30.4 36.9H25.5V50H18V14Z${PUZZLE_PIECE}`;

type RebuzzleMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Rebuzzle board mark — ink tile, geometric R, classic puzzle-piece counter.
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
