import { AppLink as Link } from "@/components/AppLink";
import { RebuzzleLogo } from "@/components/brand/RebuzzleLogo";
import { SignedOutOnly } from "@/components/signed-out-only-client";

const FOOTER_COLUMNS: {
  heading: string;
  links: { href: string; label: string; signedOutOnly?: boolean }[];
}[] = [
  {
    heading: "Play",
    links: [
      { href: "/", label: "Today’s puzzle" },
      { href: "/studio", label: "Studio" },
      { href: "/community", label: "Community puzzles" },
      { href: "/leaderboard", label: "Leaderboard" },
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
      { href: "/login", label: "Log in", signedOutOnly: true },
      { href: "/signup", label: "Sign up", signedOutOnly: true },
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
 * Four link columns: two-up on phones so the footer isn't a long single list,
 * four-up beside the brand on desktop. Column headings are set in the mono caption voice; the
 * link rows stay in body-sm and only reach full ink on hover.
 */
export function Footer() {
  return (
    <footer className="border-border border-t bg-background">
      <div className="mx-auto max-w-page px-4 py-12 md:px-6 md:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link className="inline-flex transition-opacity hover:opacity-70" href="/">
              <RebuzzleLogo size="md" />
            </Link>
            <p className="mt-3 max-w-[26ch] text-muted-foreground text-sm leading-6">
              One AI-generated puzzle a day. Seven types, one shot, no ads.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav aria-label={column.heading} key={column.heading}>
              <p className="eyebrow">{column.heading}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => {
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
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-border border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          {/* No live year — this renders inside a prerendered shell. */}
          <p className="text-subtle text-xs">© Rebuzzle. All rights reserved.</p>
          <p className="font-medium text-xs text-subtle">A new puzzle every day at midnight</p>
        </div>
      </div>
    </footer>
  );
}
