import NextLink from "next/link";
import type { ComponentProps } from "react";

export type AppLinkProps = Omit<ComponentProps<typeof NextLink>, "prefetch">;

/**
 * App-wide Link wrapper. Always disables viewport prefetch to avoid Fast
 * Origin Transfer storms.
 */
export function AppLink(props: AppLinkProps) {
  return <NextLink {...props} prefetch={false} />;
}
