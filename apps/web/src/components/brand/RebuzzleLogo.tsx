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

const R_LETTER =
  "M18 15h17.2c9.15 0 15.6 5.85 15.6 14.2 0 6.85-4.05 12.05-10.7 13.85L51 49H40.2l-9.3-5.4H26.2V49H18V15Zm8.2 8.1v12.2h9.2c4.35 0 7.1-2.55 7.1-6.15 0-3.55-2.75-6.05-7.1-6.05h-9.2Z";

type RebuzzleMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Rebuzzle mark — ink board, custom R, link-blue solution spark.
 * Theme-aware via foreground/background fills.
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
      <path className="fill-background" d={R_LETTER} fillRule="evenodd" />
      <circle className="fill-link" cx="39.2" cy="29.2" r="2.6" />
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
