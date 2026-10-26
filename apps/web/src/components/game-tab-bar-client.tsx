"use client";

import { BookOpen, Ellipsis } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GAME_MENU, isMenuItemActive, MORE_LINKS } from "@/lib/game-menu";
import { cn } from "@/lib/utils";

// Four modes fit a thumb's reach; How to play moves into More with the small print.
const TAB_ITEMS = GAME_MENU.filter((item) => item.href !== "/how-it-works");

/**
 * Phone game menu: a bottom tab bar, the pattern every mobile game and
 * Duolingo use, in place of a header nav and a footer. It drops away while
 * the keyboard is up on the play screen (see `.tab-bar` in globals.css).
 */
export function GameTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = isMenuItemActive(pathname, "/how-it-works");

  return (
    <nav aria-label="Game menu" className="tab-bar lg:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                aria-current={isMenuItemActive(pathname, item.href) ? "page" : undefined}
                className="tab-bar-item"
                href={item.href}
              >
                <Icon aria-hidden className="size-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Popover onOpenChange={setMoreOpen} open={moreOpen}>
            <PopoverTrigger asChild>
              <button
                aria-current={moreActive ? "page" : undefined}
                className="tab-bar-item w-full"
                type="button"
              >
                <Ellipsis aria-hidden className="size-5" />
                <span>More</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-2" side="top" sideOffset={10}>
              <Link
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-2.5 font-medium text-sm transition-colors hover:bg-muted",
                  moreActive && "bg-muted"
                )}
                href="/how-it-works"
                onClick={() => setMoreOpen(false)}
              >
                <BookOpen aria-hidden className="size-4" />
                How to play
              </Link>
              <ul className="mt-1 grid grid-cols-2 gap-0.5 border-border border-t pt-2">
                {MORE_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="flex min-h-11 items-center rounded-md px-2.5 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                      href={link.href}
                      onClick={() => setMoreOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </li>
      </ul>
    </nav>
  );
}
