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
 * Game mark — a blue solve chip with a token ring.
 * Brand-colored so it stays distinct in light and dark UI.
 */
export function RebuzzleMark({ className, title }: RebuzzleMarkProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
      fill="none"
      role={title ? "img" : undefined}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <rect width="32" height="32" rx="9" fill="#0070F3" />
      <circle cx="16" cy="16" r="7.5" fill="#FAFAFA" />
      <circle cx="16" cy="16" r="5.25" fill="none" stroke="#171717" strokeWidth="2.25" />
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
