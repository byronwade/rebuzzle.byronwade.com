"use client";

import { AppLink as Link } from "@/components/AppLink";
import { cn } from "@/lib/utils";

export type CreatorCredit = {
  username: string;
  profilePath: string;
};

/** Compact credit line for daily / community boards. */
export function CreatorAttribution({
  credit,
  className,
}: {
  credit: CreatorCredit;
  className?: string;
}) {
  return (
    <p className={cn("creator-attribution text-center text-sm text-muted-foreground", className)}>
      <span className="text-[0.7rem] uppercase tracking-[0.14em] text-teal-800/70">
        Player puzzle
      </span>
      <span className="mx-2 text-border">·</span>
      <Link
        className="font-medium text-foreground underline-offset-4 transition-colors hover:text-teal-800 hover:underline"
        href={credit.profilePath}
      >
        by {credit.username}
      </Link>
    </p>
  );
}
