import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Chat message primitives.
 *
 * Two speakers only: the player, whose guesses sit right-aligned in ink, and
 * Eve, whose replies sit left-aligned on card chrome. Tone is carried by a
 * hairline and a single accent dot rather than a coloured bubble — a wall of
 * red and green bubbles would drown the puzzle above it.
 */

const messageRowVariants = cva("flex w-full gap-2.5", {
  variants: {
    from: {
      user: "justify-end",
      agent: "justify-start",
    },
  },
  defaultVariants: {
    from: "agent",
  },
});

export interface MessageRowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof messageRowVariants> {}

export function MessageRow({ className, from, ...props }: MessageRowProps) {
  return <div className={cn(messageRowVariants({ from }), className)} {...props} />;
}

const bubbleVariants = cva(
  "w-fit max-w-[min(88%,34rem)] text-pretty text-[15px] leading-6 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] [overflow-wrap:anywhere]",
  {
    variants: {
      from: {
        user: "rounded-2xl rounded-br-md bg-foreground px-4 py-2 font-medium text-background shadow-[0_3px_10px_hsl(var(--foreground)/0.12)]",
        agent: "rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-foreground",
      },
      tone: {
        neutral: "",
        positive: "",
        warning: "",
        negative: "",
      },
    },
    compoundVariants: [
      { from: "agent", tone: "positive", className: "border-success/30 bg-success/[0.06]" },
      { from: "agent", tone: "warning", className: "border-warning/30 bg-warning/[0.06]" },
      { from: "agent", tone: "negative", className: "border-destructive/25 bg-destructive/[0.05]" },
    ],
    defaultVariants: {
      from: "agent",
      tone: "neutral",
    },
  }
);

export interface MessageBubbleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bubbleVariants> {}

export function MessageBubble({ className, from, tone, ...props }: MessageBubbleProps) {
  return <div className={cn(bubbleVariants({ from, tone }), className)} {...props} />;
}

const dotVariants = cva("h-1.5 w-1.5 shrink-0 rounded-full", {
  variants: {
    tone: {
      neutral: "bg-border-strong",
      positive: "bg-success",
      warning: "bg-warning",
      negative: "bg-destructive",
    },
  },
  defaultVariants: { tone: "neutral" },
});

/** Eve's mark. A gradient disc — the one place the brand mesh appears small. */
export function MessageAvatar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-sm ring-1 ring-white/20",
        "bg-gradient-to-br from-[#007cf0] to-[#7928ca]",
        "font-semibold text-[10px] text-white",
        className
      )}
    >
      E
    </div>
  );
}

export function MessageMeta({
  className,
  tone,
  children,
}: {
  className?: string;
  tone?: VariantProps<typeof dotVariants>["tone"];
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex min-h-5 items-center gap-1.5 font-medium text-[11px] text-muted-foreground tracking-[0.01em]",
        className
      )}
    >
      {tone ? (
        <span aria-hidden className={dotVariants({ tone })} data-tone-dot />
      ) : null}
      {children}
    </p>
  );
}

/** Three-dot rest state shown while Eve's line is still streaming in. */
export function MessageTyping({ className }: { className?: string }) {
  return (
    <span
      aria-label="Eve is typing"
      className={cn("inline-flex items-center gap-1 py-1.5", className)}
      role="status"
    >
      {[0, 1, 2].map((i) => (
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-border-strong motion-reduce:animate-none"
          key={i}
          style={{ animationDelay: `${i * 160}ms`, animationDuration: "1.1s" }}
        />
      ))}
    </span>
  );
}
