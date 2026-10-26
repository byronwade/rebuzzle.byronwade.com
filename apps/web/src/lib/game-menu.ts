import { BookOpen, Gamepad2, type LucideIcon, Palette, Trophy, Users } from "lucide-react";

/** The game menu: where a player can go, shared by the header and footer. */
export const GAME_MENU: { href: string; label: string; caption: string; icon: LucideIcon }[] = [
  { href: "/", label: "Play", caption: "Today’s puzzle", icon: Gamepad2 },
  { href: "/studio", label: "Studio", caption: "Make a puzzle", icon: Palette },
  { href: "/community", label: "Community", caption: "Player-made puzzles", icon: Users },
  { href: "/leaderboard", label: "Ranks", caption: "Leaderboard", icon: Trophy },
  { href: "/how-it-works", label: "How to play", caption: "Rules and scoring", icon: BookOpen },
];

export function isMenuItemActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Secondary pages: reading, guides and legal. Live in the rail and the More menu, not a footer. */
export const MORE_LINKS: { href: string; label: string; signedOutOnly?: boolean }[] = [
  { href: "/blog", label: "Blog" },
  { href: "/rebuzzle-vs-wordle", label: "Rebuzzle vs Wordle" },
  { href: "/puzzles/rebus", label: "Rebus puzzles" },
  { href: "/puzzles/logic-grid", label: "Logic grids" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/feed.xml", label: "RSS" },
  { href: "https://github.com/sponsors/byronwade", label: "Sponsor" },
];
