import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppLink as Link } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import { ContentPageSkeleton } from "@/components/page-skeletons";
import { Button } from "@/components/ui/button";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getBaseUrl } from "@/lib/seo/utils";
import { communityPuzzlePath, profilePathForUsername } from "@/lib/ugc/slug";
import { listRecentCommunityPuzzles } from "@/lib/ugc/submissions";

export const metadata: Metadata = generatePageMetadata({
  title: "Community rebus puzzles",
  description:
    "Play player-made rebus puzzles from Rebuzzle Studio. Browse community boards, visit creator profiles, and make your own.",
  keywords: ["community rebus", "user generated puzzle", "Rebuzzle Studio", "player puzzles"],
  url: "/community",
});

async function CommunityPageContent() {
  await connection();
  const puzzles = await listRecentCommunityPuzzles(36);
  const baseUrl = getBaseUrl();
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Rebuzzle community puzzles",
    url: `${baseUrl}/community`,
    description: "Player-authored rebus puzzles from Rebuzzle Studio",
  };

  return (
    <Layout>
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
        type="application/ld+json"
      />
      <div className="mx-auto max-w-page px-4 py-10 md:px-6 md:py-14">
        <PageHeader
          actions={
            puzzles.length > 0 ? (
              <Button asChild className="h-11 sm:h-9">
                <Link href="/studio">Open Studio</Link>
              </Button>
            ) : null
          }
          description="Boards made in Studio, graded by Eve, playable anytime. Featured ones can land in the daily rotation."
          eyebrow="Community"
          title="Player puzzles."
        />

        {puzzles.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed bg-card px-6 py-14 text-center">
            <p className="eyebrow">Empty board</p>
            <p className="mt-3 font-semibold text-2xl tracking-[-0.04em]">
              No community boards yet
            </p>
            <p className="mx-auto mt-3 max-w-sm text-balance text-muted-foreground text-sm leading-6">
              Be the first — compose a rebus in Studio and publish it.
            </p>
            <Button asChild className="mt-7" size="lg">
              <Link href="/studio">Make a puzzle</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {puzzles.map((puzzle) => (
              <li className="group" key={puzzle.id}>
                <Link
                  className="block h-full rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong"
                  href={communityPuzzlePath(puzzle.slug)}
                >
                  <div className="flex min-h-28 items-center justify-center rounded-lg border border-border bg-inset p-3">
                    <PuzzleVisualBoard
                      fallback={puzzle.rebusPuzzle}
                      size="medium"
                      visual={puzzle.visual}
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold tracking-[-0.02em]">
                      {puzzle.title || "Untitled board"}
                    </p>
                    {puzzle.status === "featured" ? (
                      <span className="shrink-0 font-medium text-xs text-subtle">Featured</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-muted-foreground text-sm">by {puzzle.username}</p>
                </Link>
                <Link
                  className="mt-1.5 inline-block px-1 text-subtle text-xs transition-colors hover:text-foreground"
                  href={profilePathForUsername(puzzle.username)}
                >
                  View profile
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}

/** Sync shell — stream the request-time body inside Suspense (Cache Components). */
export default function CommunityPage() {
  return (
    <Suspense fallback={<ContentPageSkeleton />}>
      <CommunityPageContent />
    </Suspense>
  );
}
