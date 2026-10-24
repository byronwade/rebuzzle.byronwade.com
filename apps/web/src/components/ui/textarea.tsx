import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[72px] w-full rounded-lg border border-input bg-inset px-3 py-2 text-base text-foreground shadow-[var(--shadow-field)] focus-ring transition-[border-color,box-shadow] duration-fast",
        "placeholder:text-subtle hover:border-border-strong/50",
        "focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
