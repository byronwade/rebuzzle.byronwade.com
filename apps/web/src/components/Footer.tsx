import { AppLink as Link } from "@/components/AppLink";
import { RebuzzleMark } from "@/components/brand/RebuzzleLogo";
import { SignedOutOnly } from "@/components/signed-out-only-client";
import { Button } from "@/components/ui/button";
import { GAME_MENU } from "@/lib/game-menu";
import { Timer } from "./Timer";

const SYSTEM_LINKS: { href: string; label: string; signedOutOnly?: boolean }[] = [
  { href: "/blog", label: "Blog" },
  { href: "/rebuzzle-vs-wordle", label: "Rebuzzle vs Wordle" },
  { href: "/puzzles/rebus", label: "Rebus puzzles" },
  { href: "/puzzles/logic-grid", label: "Logic grids" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
  { href: "/login", label: "Log in", signedOutOnly: true },
  { href: "/signup", label: "Sign up", signedOutOnly: true },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/feed.xml", label: "RSS" },
  { href: "https://github.com/sponsors/byronwade", label: "Sponsor" },
];

/**
 * Footer as an end-of-level screen: the countdown to the next puzzle with a
 * play button, a level-select row of the game menu, then the small system
 * links (reading, account, legal) on one wrapped line.
 */
export function Footer() {
  return (
    <footer className="border-border border-t bg-background">
      <div className="mx-auto max-w-page px-4 py-10 md:px-6 md:py-14">
        <section
          aria-labelledby="footer-next-puzzle"
          className="flex flex-col gap-6 rounded-xl bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-7"
        >
          <div>
            <p className="eyebrow" id="footer-next-puzzle">
              Next puzzle drops in
            </p>
            <Timer
              className="mt-1.5 font-semibold text-4xl tracking-[-0.04em] md:text-5xl"
              compact
              nextPlayTime={null}
            />
            <p className="mt-2 text-muted-foreground text-sm">
              One puzzle a day, three guesses, resets at your local midnight.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link href="/">Play today’s puzzle</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/studio">Make a puzzle</Link>
            </Button>
          </div>
        </section>

        <nav aria-label="Game menu" className="mt-6">
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {GAME_MENU.map((item) => {
              const Icon = item.icon;
              return (
                <li className="last:odd:col-span-2 md:last:odd:col-span-1" key={item.href}>
                  <Link className="menu-tile" href={item.href}>
                    <span className="menu-tile-icon">
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{item.label}</span>
                      <span className="truncate text-muted-foreground text-xs">{item.caption}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-10 flex flex-col gap-5 border-border border-t pt-6 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="More">
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {SYSTEM_LINKS.map((link) => {
                const item = (
                  <li key={link.href}>
                    <Link
                      className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
                // Signed-in players don't need Log in / Sign up in the footer.
                return link.signedOutOnly ? (
                  <SignedOutOnly key={link.href}>{item}</SignedOutOnly>
                ) : (
                  item
                );
              })}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-subtle text-xs">
            <RebuzzleMark className="size-5" />
            {/* No live year — this renders inside a prerendered shell. */}
            <span>© Rebuzzle</span>
            <span aria-hidden>·</span>
            <span className="[@media(pointer:coarse)]:hidden">
              Press{" "}
              <kbd className="rounded border border-border bg-card px-1 font-mono text-[11px]">
                ⌘K
              </kbd>{" "}
              for the command menu
            </span>
            <span className="hidden [@media(pointer:coarse)]:inline">No ads, ever</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
