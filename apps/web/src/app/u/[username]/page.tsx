import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppLink as Link } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
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

export default async function CreatorProfilePage({ params }: Params) {
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
      <div className="mx-auto max-w-page px-4 py-14 md:px-6 md:py-20">
        <p className="eyebrow">Creator</p>
        <h1 className="mt-4 text-balance font-semibold text-4xl tracking-[-0.055em] md:text-5xl">
          {user.username}
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground leading-7">
          Community rebus boards by {user.username}. Featured wins land in the daily rotation; every
          approved puzzle stays playable here.
        </p>

        <dl className="hairline-grid mt-10 grid grid-cols-2 rounded-lg bg-card sm:grid-cols-4">
          {creatorStats.map(([label, value]) => (
            <div className="px-5 py-4" key={label}>
              <dt className="font-mono text-[11px] text-subtle uppercase tracking-[0.14em]">
                {label}
              </dt>
              <dd className="mt-1.5 font-semibold text-3xl tracking-[-0.04em]">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-semibold text-2xl tracking-[-0.04em]">Puzzles</h2>
          <div className="flex gap-5 text-sm">
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/community"
            >
              Community
            </Link>
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/studio"
            >
              Make your own →
            </Link>
          </div>
        </div>

        {puzzles.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No published boards yet.</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {puzzles.map((puzzle) => (
              <li key={puzzle.id}>
                <Link
                  className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong"
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
                    <p className="truncate font-semibold tracking-[-0.02em]">
                      {puzzle.title || "Untitled board"}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-subtle uppercase tracking-[0.14em]">
                      {puzzle.status === "featured" ? "Featured" : "Play"}
                    </span>
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
