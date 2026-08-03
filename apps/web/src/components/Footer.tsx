import { AppLink as Link } from "@/components/AppLink";

const FOOTER_COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Play",
    links: [
      { href: "/", label: "Today's puzzle" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/achievements", label: "Achievements" },
      { href: "/how-it-works", label: "How it works" },
    ],
  },
  {
    heading: "Read",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/rebuzzle-vs-wordle", label: "Rebuzzle vs Wordle" },
      { href: "/puzzles/rebus", label: "Rebus puzzles" },
      { href: "/puzzles/logic-grid", label: "Logic grids" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/profile", label: "Profile" },
      { href: "/settings", label: "Settings" },
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Sign up" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/feed.xml", label: "RSS" },
      { href: "https://github.com/sponsors/byronwade", label: "Sponsor" },
    ],
  },
];

/**
 * Four-column footer. Column headings are set in the mono caption voice; the
 * link rows stay in body-sm and only reach full ink on hover.
 */
export function Footer() {
  return (
    <footer className="border-border border-t bg-background">
      <div className="mx-auto max-w-page px-4 py-14 md:px-6 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link className="font-semibold text-[17px] text-foreground tracking-[-0.04em]" href="/">
              Rebuzzle
            </Link>
            <p className="mt-3 max-w-[26ch] text-muted-foreground text-sm leading-6">
              One AI-generated puzzle a day. Seven types, one shot, no ads.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav aria-label={column.heading} key={column.heading}>
              <p className="eyebrow">{column.heading}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-border border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          {/* No live year — this renders inside a prerendered shell. */}
          <p className="text-subtle text-xs">© Rebuzzle. All rights reserved.</p>
          <p className="font-mono text-[11px] text-subtle uppercase tracking-[0.1em]">
            A new puzzle every day at midnight
          </p>
        </div>
      </div>
    </footer>
  );
}
