import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[72px] w-full rounded-md border border-input bg-card px-3 py-2 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150",
        "placeholder:text-subtle hover:border-border-strong/50",
        "focus-visible:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring/15",
        "disabled:cursor-not-allowed disabled:bg-inset disabled:opacity-60 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
