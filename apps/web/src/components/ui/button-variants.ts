import { cva, type VariantProps } from "class-variance-authority";

/**
 * Thorbis controls (https://design.thorbis.com):
 *
 * - A commit is ink: type-colour fill, inverse type, 10px radius, 1px rim.
 * - `brand` is the electric-blue action — one per view, for the move that
 *   starts play (Play, Submit guess, Share result).
 * - Utilities stay quiet (outline / secondary / ghost). Icon-only is a circle.
 * - Hover is colour only and gated to a real mouse; press is a 120ms nudge.
 *
 * Peers in one action neighbourhood share height and radius (D-023).
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium text-sm focus-ring transition-[color,background-color,border-color,box-shadow,transform] duration-fast ease-thorbis active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background shadow-[var(--shadow-commit)] hover:bg-foreground/85",
        brand: "bg-brand text-brand-foreground shadow-[var(--shadow-accent)] hover:bg-brand-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-card text-foreground hover:border-border-strong/70 hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "text-link underline-offset-4 active:scale-100 hover:underline",
        // Showcase scale — same ink commit with a pill silhouette.
        pill: "rounded-pill bg-foreground px-5 text-background shadow-[var(--shadow-commit)] hover:bg-foreground/85",
        "pill-outline":
          "rounded-pill border border-border bg-card px-5 text-foreground hover:bg-muted",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-11 px-5 text-[15px]",
        xl: "h-12 px-6 text-base",
        // Icon-only is a circle; the hit area stays at least 36px.
        icon: "size-9 rounded-full",
        "icon-sm": "size-8 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
