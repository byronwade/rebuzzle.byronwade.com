import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppLink as Link } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import { ContentPageSkeleton } from "@/components/page-skeletons";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getBaseUrl } from "@/lib/seo/utils";
import { communityPuzzlePath, profilePathForUsername } from "@/lib/ugc/slug";
import { listPublicCreatorPuzzles } from "@/lib/ugc/submissions";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw || "").trim();
  const user = username ? await db.userOps.findByUsername(username) : null;
  if (!user || user.isGuest) {
    return generatePageMetadata({
      title: "Creator not found",
      description: "This Rebuzzle creator profile could not be found.",
      url: profilePathForUsername(username || "unknown"),
      noindex: true,
    });
  }
  const puzzles = await listPublicCreatorPuzzles(user.username, 5);
  return generatePageMetadata({
    title: `${user.username} — Rebuzzle creator`,
    description: `Play rebus puzzles by ${user.username}. ${puzzles.length} community boards, plus daily lottery features when Eve green-lights a submission.`,
    keywords: [
      `${user.username} rebus`,
      "user generated rebus",
      "Rebuzzle creator",
      "community puzzles",
    ],
    url: profilePathForUsername(user.username),
    author: user.username,
  });
}

async function CreatorProfilePageContent({ params }: Params) {
  await connection();
  const { username: raw } = await params;
  const username = decodeURIComponent(raw || "").trim();
  const user = username ? await db.userOps.findByUsername(username) : null;
  if (!user || user.isGuest) notFound();

  const [stats, puzzles] = await Promise.all([
    db.userStatsOps.findByUserId(user.id),
    listPublicCreatorPuzzles(user.username, 48),
  ]);

  const profilePath = profilePathForUsername(user.username);
  const baseUrl = getBaseUrl();
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: user.username,
    url: `${baseUrl}${profilePath}`,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CreateAction",
        userInteractionCount: puzzles.length,
      },
    ],
  };

  const creatorStats: Array<[string, number]> = [
    ["Level", stats?.level ?? 1],
    ["Wins", stats?.wins ?? 0],
    ["Created", puzzles.length],
    ["Featured", puzzles.filter((p) => p.status === "featured").length],
  ];

  return (
    <Layout>
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(personSchema) }}
        type="application/ld+json"
      />
      <div className="mx-auto max-w-page px-4 py-12 md:px-6 md:py-16">
        <PageHeader
          actions={
            <Button asChild variant="outline">
              <Link href="/studio">Make your own</Link>
            </Button>
          }
          description={`Community rebus boards by ${user.username}. Featured boards join the daily rotation, and every approved one stays playable here.`}
          eyebrow="Creator"
          title={user.username}
        />

        <dl className="hairline-grid grid grid-cols-2 rounded-lg bg-card sm:grid-cols-4">
          {creatorStats.map(([label, value]) => (
            <div className="px-5 py-4" key={label}>
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="mt-1 font-semibold text-2xl tabular-nums tracking-[-0.03em]">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-semibold text-base text-foreground tracking-[-0.02em]">
            Puzzles <span className="font-normal text-subtle tabular-nums">{puzzles.length}</span>
          </h2>
          <Link
            className="rounded text-muted-foreground text-sm transition-colors hover:text-foreground focus-ring"
            href="/community"
          >
            Browse the community
          </Link>
        </div>

        {puzzles.length === 0 ? (
          <div className="mt-4 rounded-lg border border-border border-dashed px-6 py-12 text-center">
            <p className="font-medium text-foreground text-sm">No published boards yet.</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Approved puzzles from {user.username} will show up here.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {puzzles.map((puzzle) => (
              <li key={puzzle.id}>
                <Link
                  className="block rounded-lg border border-border bg-card p-3 transition-colors hover:border-border-strong focus-ring"
                  href={communityPuzzlePath(puzzle.slug)}
                >
                  <div className="flex min-h-28 items-center justify-center rounded-lg border border-border bg-inset p-4">
                    <PuzzleVisualBoard
                      fallback={puzzle.rebusPuzzle}
                      size="medium"
                      visual={puzzle.visual}
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <p className="truncate font-medium text-foreground text-sm">
                      {puzzle.title || "Untitled board"}
                    </p>
                    {puzzle.status === "featured" ? (
                      <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 font-medium text-link text-xs">
                        Featured
                      </span>
                    ) : (
                      <span className="shrink-0 font-medium text-subtle text-xs">Play</span>
                    )}
                  </div>
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
export default function CreatorProfilePage({ params }: Params) {
  return (
    <Suspense fallback={<ContentPageSkeleton />}>
      <CreatorProfilePageContent params={params} />
    </Suspense>
  );
}
