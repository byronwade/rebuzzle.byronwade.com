import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  // Ensure minimum font size for mobile to prevent zoom
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

/**
 * 40px is the canonical form height; the border darkens rather than glows on
 * focus, and the ring is the same one used everywhere else on the surface.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-card px-3 text-base text-foreground focus-ring transition-[border-color,box-shadow] duration-150",
        "file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm",
        "placeholder:text-subtle",
        "hover:border-border-strong/50",
        "focus-visible:border-foreground/25",
        "disabled:cursor-not-allowed disabled:bg-inset disabled:opacity-60",
        "aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/15",
        "md:text-sm",
        className
      )}
      ref={ref}
      type={type}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
