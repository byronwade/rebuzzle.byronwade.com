import { Hourglass } from "lucide-react";
import type { Metadata } from "next";
import { AppLink as Link } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { StatusPage } from "@/components/StatusPage";
import { Button } from "@/components/ui/button";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...generateStaticPageMetadata({
    title: "AI Quota Exceeded | Rebuzzle",
    description:
      "AI quota limit reached. We've hit our daily limit for AI puzzle generation. Pre-generated puzzles are still available.",
    url: "/ai-quota-exceeded",
    keywords: ["quota", "limit", "service status"],
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function AIQuotaExceededPage() {
  return (
    <Layout>
      <StatusPage
        actions={
          <>
            <Button asChild size="lg">
              <Link href="/">Play today's puzzle</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/blog">Read puzzle tips</Link>
            </Button>
          </>
        }
        description="New AI puzzles are paused until the daily limit resets at midnight Pacific. Puzzles already made are still ready to play."
        eyebrow="Daily limit reached"
        footnote="A daily cap on AI generation is part of how Rebuzzle stays free for everyone."
        icon={Hourglass}
        title="That's all the new puzzles for today."
        tone="warning"
      />
    </Layout>
  );
}
