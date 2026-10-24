import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Sentence-case caption above the title. */
  eyebrow?: ReactNode;
  /** Display title. House style ends it with a full stop. */
  title: ReactNode;
  description?: ReactNode;
  /** Buttons or links that sit beside the title on wide screens. */
  actions?: ReactNode;
  align?: "start" | "center";
  className?: string;
}

/**
 * The one page-title block every scrolling page opens with: caption, display
 * title, one line of context, and optional actions.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  align = "start",
  className,
}: PageHeaderProps) {
  const centered = align === "center";

  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-5 md:mb-10",
        centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className={cn("min-w-0", centered && "flex flex-col items-center")}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1
          className={cn(
            "text-balance font-semibold text-4xl text-foreground tracking-[-0.045em]",
            eyebrow && "mt-3"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "mt-3 max-w-xl text-pretty text-muted-foreground leading-7",
              centered && "mx-auto"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
