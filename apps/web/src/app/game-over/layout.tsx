import type { Metadata } from "next";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...generateStaticPageMetadata({
    title: "Game Over - Puzzle Completed | Rebuzzle",
    description:
      "Congratulations! You've completed today's puzzle. View your stats and share your results.",
    url: "/game-over",
    keywords: ["puzzle completed", "game over", "puzzle solved"],
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function GameOverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
