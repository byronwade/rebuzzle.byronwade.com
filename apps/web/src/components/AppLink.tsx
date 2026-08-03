import NextLink from "next/link";
import type { ComponentProps } from "react";

export type AppLinkProps = ComponentProps<typeof NextLink>;

/**
 * App-wide Link wrapper. Defaults `prefetch` to false to avoid viewport
 * prefetch storms (Fast Origin Transfer). Pass `prefetch` for critical CTAs.
 */
export function AppLink({ prefetch, ...props }: AppLinkProps) {
  const wantPrefetch = prefetch === true;
  return <NextLink prefetch={false} {...props} {...(wantPrefetch ? { prefetch: true as const } : {})} />;
}
