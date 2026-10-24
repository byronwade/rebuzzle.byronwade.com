import { CloudOff } from "lucide-react";
import type { Metadata } from "next";
import { AppLink as Link } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { StatusPage } from "@/components/StatusPage";
import { Button } from "@/components/ui/button";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...generateStaticPageMetadata({
    title: "AI Service Error | Rebuzzle",
    description:
      "AI service temporarily unavailable. We're experiencing temporary issues with our AI service. Try again or play pre-generated puzzles.",
    url: "/ai-error",
    keywords: ["error", "service unavailable", "technical issue"],
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function AIErrorPage() {
  return (
    <Layout>
      <StatusPage
        actions={
          <>
            <Button asChild size="lg">
              <Link href="/">Try again</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/blog">Read puzzle tips</Link>
            </Button>
          </>
        }
        description="Puzzle generation hit a snag. It usually clears up within a few minutes, and today's puzzle is still playable."
        eyebrow="Service issue"
        footnote="Still seeing this after a few minutes? The AI service may be down for maintenance. Try again a little later."
        icon={CloudOff}
        title="We couldn't reach the puzzle engine."
        tone="warning"
      />
    </Layout>
  );
}
