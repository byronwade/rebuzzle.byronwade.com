"use client";

import { Heart } from "lucide-react";
import { usePathname } from "next/navigation";
import { AppLink as Link } from "@/components/AppLink";
import { SignedOutOnly } from "@/components/signed-out-only-client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GAME_MENU, isMenuItemActive, MORE_LINKS } from "@/lib/game-menu";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useAuth } from "./AuthProvider";
import { RebuzzleLogo } from "./brand/RebuzzleLogo";
import { NotificationBadge } from "./NotificationBadge";
import { PlayerHud } from "./player-hud-client";
import { UserMenu } from "./UserMenu";

type GameRailProps = {
  nextPlayTime: Date | null;
  /** The in-game status rail already shows the countdown while a puzzle is in play. */
  isPlaying: boolean;
};

/**
 * Desktop game menu: a left rail in place of a site header and footer, the
 * way Duolingo and Chess.com lay out their web apps. Logo, the player's HUD,
 * the main modes, then the player card and the small print at the bottom.
 */
export function GameRail({ nextPlayTime, isPlaying }: GameRailProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  // The bell owns a fetch and a dialog, so it mounts in one place: here on
  // desktop, in the phone HUD strip otherwise.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        aria-label="Game menu"
        className="game-rail sticky top-0 hidden h-[var(--vv-height,100dvh)] w-60 shrink-0 flex-col gap-5 overflow-y-auto overscroll-contain px-3 py-5 lg:flex"
      >
        <Link className="px-2 transition-opacity hover:opacity-70" href="/">
          <RebuzzleLogo size="md" />
        </Link>

        <PlayerHud expanded nextPlayTime={nextPlayTime} showCountdown={!isPlaying} />

        <nav aria-label="Primary">
          <ul className="flex flex-col gap-1">
            {GAME_MENU.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    aria-current={isMenuItemActive(pathname, item.href) ? "page" : undefined}
                    className="rail-item"
                    href={item.href}
                  >
                    <span className="rail-item-icon">
                      <Icon aria-hidden className="size-[18px]" />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <div className="touch-targets flex items-center gap-1.5 px-1">
            <UserMenu isAuthenticated={isAuthenticated} />
            <div className="ml-auto flex items-center gap-1">
              {isDesktop ? <NotificationBadge /> : null}
              <Link
                aria-label="Support the developer"
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                href="https://github.com/sponsors/byronwade"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Heart aria-hidden className="size-4" />
              </Link>
            </div>
          </div>

          <nav aria-label="More" className="px-2">
            <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-subtle text-xs">
              {MORE_LINKS.map((link) => {
                const item = (
                  <li key={link.href}>
                    <Link className="transition-colors hover:text-foreground" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                );
                return link.signedOutOnly ? (
                  <SignedOutOnly key={link.href}>{item}</SignedOutOnly>
                ) : (
                  item
                );
              })}
            </ul>
            <p className="mt-3 text-subtle text-xs [@media(pointer:coarse)]:hidden">
              <kbd className="rounded border border-border bg-card px-1 font-mono text-[11px]">
                ⌘&nbsp;K
              </kbd>{" "}
              command menu
            </p>
          </nav>
        </div>
      </aside>
    </TooltipProvider>
  );
}
