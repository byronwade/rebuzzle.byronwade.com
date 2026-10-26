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
