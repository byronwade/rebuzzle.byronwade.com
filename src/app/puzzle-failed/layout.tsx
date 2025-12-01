import type { Metadata } from "next";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...generateStaticPageMetadata({
    title: "Puzzle Failed | Rebuzzle",
    description:
      "Better luck next time! A new puzzle will be available tomorrow. Check out our blog for puzzle-solving tips.",
    url: "/puzzle-failed",
    keywords: ["puzzle failed", "try again", "puzzle tips"],
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function PuzzleFailedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

