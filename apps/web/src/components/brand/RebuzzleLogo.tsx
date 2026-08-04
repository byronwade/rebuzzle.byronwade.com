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

type RebuzzleMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Rebus board mark — two visual clue tiles over a solved answer bar.
 * Unique to Rebuzzle’s visual-word format (not a letter grid).
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
      <rect className="fill-background" height="20" rx="5" width="20" x="10" y="11" />
      <circle className="fill-foreground" cx="20" cy="21" r="5" />
      <rect className="fill-background" height="20" rx="5" width="20" x="34" y="11" />
      <path
        className="stroke-foreground"
        d="M40 21h8M44 17v8"
        strokeLinecap="round"
        strokeWidth="2.75"
      />
      <rect className="fill-link" height="16" rx="5" width="44" x="10" y="37" />
      <rect className="fill-background" height="4" rx="2" width="24" x="20" y="43" />
    </svg>
  );
}

type RebuzzleLogoProps = {
  className?: string;
  markClassName?: string;
  size?: LogoSize;
  showWordmark?: boolean;
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
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
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
