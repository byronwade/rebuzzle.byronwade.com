import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Layout from "@/components/Layout";
import { AppLink as Link } from "@/components/AppLink";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import { db } from "@/db";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { serializeJsonLd } from "@/lib/seo/json-ld";
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

  return (
    <Layout>
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(personSchema) }}
        type="application/ld+json"
      />
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800/70">
          Creator
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-geist-sans)] text-4xl font-semibold tracking-[-0.04em] text-teal-950 md:text-5xl">
          {user.username}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-7">
          Community rebus boards by {user.username}. Featured wins land in the daily rotation;
          every approved puzzle stays playable here.
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Level", stats?.level ?? 1],
            ["Wins", stats?.wins ?? 0],
            ["Created", puzzles.length],
            ["Featured", puzzles.filter((p) => p.status === "featured").length],
          ].map(([label, value]) => (
            <div className="rounded-xl border border-teal-900/10 bg-teal-50/40 px-4 py-3" key={label}>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-teal-900/60">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight text-teal-950">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Puzzles</h2>
          <div className="flex gap-4 text-sm">
            <Link className="text-teal-800 hover:underline" href="/community">
              Community
            </Link>
            <Link className="text-teal-800 hover:underline" href="/studio">
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
                  className="block rounded-2xl border border-teal-900/10 bg-white/80 p-4 transition-colors hover:border-teal-800/30 hover:bg-teal-50/40"
                  href={communityPuzzlePath(puzzle.slug)}
                >
                  <div className="flex min-h-28 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#fbfefe,#f3faf8)] p-4">
                    <PuzzleVisualBoard
                      fallback={puzzle.rebusPuzzle}
                      size="medium"
                      visual={puzzle.visual}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{puzzle.title || "Untitled board"}</p>
                    <span className="text-[11px] uppercase tracking-[0.12em] text-teal-900/60">
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
