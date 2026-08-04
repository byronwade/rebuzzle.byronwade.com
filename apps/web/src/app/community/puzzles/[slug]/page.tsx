import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppLink as Link } from "@/components/AppLink";
import { CreatorAttribution } from "@/components/CreatorAttribution";
import Layout from "@/components/Layout";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import { CommunityPuzzlePlay } from "@/components/studio/CommunityPuzzlePlay";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getBaseUrl } from "@/lib/seo/utils";
import { communityPuzzlePath, profilePathForUsername } from "@/lib/ugc/slug";
import { findSubmissionBySlug } from "@/lib/ugc/submissions";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw || "").trim();
  const submission = slug ? await findSubmissionBySlug(slug) : null;
  if (!submission || (submission.status !== "approved" && submission.status !== "featured")) {
    return generatePageMetadata({
      title: "Community puzzle",
      description: "This community rebus could not be found.",
      url: communityPuzzlePath(slug || "missing"),
      noindex: true,
    });
  }
  return generatePageMetadata({
    title: `${submission.title || "Community rebus"} by ${submission.username}`,
    description: `Play a player-made rebus by ${submission.username} on Rebuzzle. Technique: ${submission.techniqueId.replaceAll("_", " ")}.`,
    keywords: [
      "community rebus",
      "user generated puzzle",
      submission.username,
      submission.techniqueId.replaceAll("_", " "),
    ],
    url: communityPuzzlePath(submission.slug),
    author: submission.username,
  });
}

export default async function CommunityPuzzlePage({ params }: Params) {
  await connection();
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw || "").trim();
  const submission = slug ? await findSubmissionBySlug(slug) : null;
  if (!submission || (submission.status !== "approved" && submission.status !== "featured")) {
    notFound();
  }
  if (!submission.puzzleId) notFound();

  const path = communityPuzzlePath(submission.slug);
  const baseUrl = getBaseUrl();
  const schema = {
    "@context": "https://schema.org",
    "@type": "Game",
    name: submission.title || `Rebus by ${submission.username}`,
    author: {
      "@type": "Person",
      name: submission.username,
      url: `${baseUrl}${profilePathForUsername(submission.username)}`,
    },
    url: `${baseUrl}${path}`,
    genre: "Rebus puzzle",
  };

  return (
    <Layout>
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
        type="application/ld+json"
      />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800/70">
          Community puzzle
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-teal-950 md:text-4xl">
          {submission.title || "Untitled board"}
        </h1>
        <CreatorAttribution
          className="mt-3 text-left"
          credit={{
            username: submission.username,
            profilePath: profilePathForUsername(submission.username),
          }}
        />

        <div className="mt-8 flex min-h-48 items-center justify-center rounded-2xl border border-teal-900/10 bg-[linear-gradient(180deg,#fbfefe,#f3faf8)] p-6">
          <PuzzleVisualBoard
            fallback={submission.rebusPuzzle}
            size="large"
            visual={submission.visual}
          />
        </div>

        <CommunityPuzzlePlay
          hints={submission.hints}
          puzzleId={submission.puzzleId}
          techniqueLabel={submission.techniqueId.replaceAll("_", " ")}
        />

        <p className="mt-8 text-sm text-muted-foreground">
          Want to publish your own?{" "}
          <Link className="text-teal-800 underline-offset-4 hover:underline" href="/studio">
            Open Studio
          </Link>
          .
        </p>
      </div>
    </Layout>
  );
}
