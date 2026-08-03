import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Cards sit on the page held by a hairline ring plus a stacked shadow —
 * never a single heavy drop.
 */
const cardVariants = cva("bg-card text-card-foreground", {
  variants: {
    variant: {
      // Level 1 — hairline only. The default "you can see this card" cue.
      default: "rounded-lg border border-border",
      // Level 2 — subtle drop for cards in a denser grid.
      raised: "rounded-lg border border-border shadow-sm",
      // Level 4 — float stack for callouts and pricing-scale panels.
      float: "rounded-xl border border-border shadow-lg",
      // A step deeper than the page, for inset regions inside a card.
      inset: "rounded-lg border border-border bg-inset",
      // Polarity-flipped band — the brand's chief depth cue.
      dark: "rounded-xl bg-foreground text-background",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div className={cn(cardVariants({ variant }), className)} ref={ref} {...props} />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)} ref={ref} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn("font-semibold text-base leading-none tracking-[-0.02em]", className)}
      ref={ref}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn("text-muted-foreground text-sm", className)} ref={ref} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} ref={ref} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn("flex items-center p-5 pt-0 sm:p-6 sm:pt-0", className)}
      ref={ref}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
