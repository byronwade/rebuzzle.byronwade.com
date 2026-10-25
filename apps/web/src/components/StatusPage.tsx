import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Centered message for dead ends: 404s, outages, quota limits. One mark, one
 * title, one line of context, at most two actions, and an optional footnote.
 */
export function StatusPage({
  icon: Icon,
  tone = "neutral",
  eyebrow,
  title,
  description,
  actions,
  footnote,
  className,
}: {
  icon?: LucideIcon;
  tone?: "neutral" | "success" | "warning" | "destructive";
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footnote?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center",
        className
      )}
    >
      {Icon ? (
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
          <Icon
            aria-hidden
            className={cn(
              "h-5 w-5",
              tone === "success" && "text-success",
              tone === "warning" && "text-warning",
              tone === "destructive" && "text-destructive",
              tone === "neutral" && "text-muted-foreground"
            )}
          />
        </div>
      ) : null}
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1
        className={cn(
          "text-balance font-semibold text-3xl text-foreground tracking-[-0.04em]",
          eyebrow && "mt-3"
        )}
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-3 text-balance text-muted-foreground text-sm leading-6">{description}</p>
      ) : null}
      {actions ? (
        <div className="mt-8 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
          {actions}
        </div>
      ) : null}
      {footnote ? (
        <p className="mt-8 text-balance border-border border-t pt-6 text-subtle text-xs leading-5">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
