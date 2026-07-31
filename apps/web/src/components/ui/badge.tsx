import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-medium text-xs focus-ring transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-foreground text-background",
        secondary: "border-border bg-inset text-muted-foreground",
        destructive: "border-destructive/25 bg-destructive/10 text-destructive",
        success: "border-success/25 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        info: "border-link/25 bg-link/10 text-link",
        outline: "border-border text-foreground",
        // Technical metadata — the mono voice, at caption scale.
        mono: "border-border bg-inset font-mono text-[11px] text-muted-foreground uppercase tracking-[0.08em]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
