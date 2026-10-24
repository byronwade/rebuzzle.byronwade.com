import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  // Ensure minimum font size for mobile to prevent zoom
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

/**
 * A Thorbis field is a well: one step darker than its sheet, inset, with a 1px
 * rim that follows the radius. Focus swaps the rim for the accent ring. 16px
 * type on phones so iOS never zooms.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-inset px-3 text-base text-foreground shadow-[var(--shadow-field)] focus-ring transition-[border-color,box-shadow] duration-fast",
        "file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm",
        "placeholder:text-subtle",
        "hover:border-border-strong/50",
        "focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
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
