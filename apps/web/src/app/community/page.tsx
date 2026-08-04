import type { Metadata } from "next";
import { connection } from "next/server";
import { AppLink as Link } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
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

export default async function CommunityPage() {
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
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800/70">
              Community
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-teal-950 md:text-5xl">
              Player puzzles
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground leading-7">
              Boards made in Studio, graded by Eve, playable anytime. Featured ones can land in the
              daily rotation.
            </p>
          </div>
          <Button asChild>
            <Link href="/studio">Open Studio</Link>
          </Button>
        </div>

        {puzzles.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-teal-900/10 bg-teal-50/40 px-6 py-12 text-center">
            <p className="text-lg font-medium text-teal-950">No community boards yet</p>
            <p className="mt-2 text-sm text-teal-900/65">
              Be the first — compose a rebus in Studio and publish it.
            </p>
            <Button asChild className="mt-6">
              <Link href="/studio">Make a puzzle</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {puzzles.map((puzzle) => (
              <li key={puzzle.id}>
                <Link
                  className="block h-full rounded-2xl border border-teal-900/10 bg-white/80 p-4 transition-colors hover:border-teal-800/30 hover:bg-teal-50/40"
                  href={communityPuzzlePath(puzzle.slug)}
                >
                  <div className="flex min-h-28 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#fbfefe,#f3faf8)] p-3">
                    <PuzzleVisualBoard
                      fallback={puzzle.rebusPuzzle}
                      size="medium"
                      visual={puzzle.visual}
                    />
                  </div>
                  <p className="mt-3 truncate font-medium text-teal-950">
                    {puzzle.title || "Untitled board"}
                  </p>
                  <p className="mt-1 text-sm text-teal-900/60">
                    by {puzzle.username}
                    {puzzle.status === "featured" ? " · Featured" : ""}
                  </p>
                </Link>
                <Link
                  className="mt-1 inline-block px-1 text-xs text-teal-800/70 hover:underline"
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
