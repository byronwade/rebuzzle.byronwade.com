/**
 * SEO Metadata Helpers
 *
 * Functions to generate enhanced metadata for Next.js pages
 */

import type { Metadata } from "next";
import { getBaseUrl, getCanonicalUrl, truncateDescription } from "./utils";

interface PageMetadataOptions {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
  noindex?: boolean;
  nofollow?: boolean;
}

/**
 * Generate comprehensive metadata for a page
 */
export function generatePageMetadata(options: PageMetadataOptions): Metadata {
  const {
    title,
    description,
    keywords = [],
    image,
    url,
    type = "website",
    publishedTime,
    modifiedTime,
    author,
    section,
    tags = [],
    noindex = false,
    nofollow = false,
  } = options;

  const baseUrl = getBaseUrl();
  const canonicalUrl = url ? getCanonicalUrl(url) : getBaseUrl();
  // Use dynamic OG images when available, fallback to static
  const ogImage = image || `${baseUrl}/opengraph-image`;
  const twitterImage = image || `${baseUrl}/opengraph-image`;

  const metadata: Metadata = {
    title: {
      default: title,
      template: "%s | Rebuzzle",
    },
    description: truncateDescription(description, 160),
    keywords: keywords.length > 0 ? keywords : undefined,
    authors: author ? [{ name: author }] : [{ name: "Rebuzzle Team" }],
    creator: author || "Rebuzzle Team",
    publisher: "Rebuzzle",
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type,
      locale: "en_US",
      url: canonicalUrl,
      siteName: "Rebuzzle",
      title,
      description: truncateDescription(description, 200),
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(section && { section }),
      ...(tags.length > 0 && { tags }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: truncateDescription(description, 200),
      images: [twitterImage],
      creator: "@rebuzzle",
      site: "@rebuzzle",
    },
    other: {
      ...(publishedTime && { "article:published_time": publishedTime }),
      ...(modifiedTime && { "article:modified_time": modifiedTime }),
      ...(author && { "article:author": author }),
      ...(section && { "article:section": section }),
      ...(tags.length > 0 && { "article:tag": tags.join(", ") }),
      // LinkedIn sharing
      "og:image:secure_url": ogImage,
      // Pinterest
      "pinterest:description": truncateDescription(description, 200),
    },
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };

  return metadata;
}

/**
 * Generate metadata for blog posts
 */
export function generateBlogPostMetadata(post: {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  publishedAt: Date | string;
  answer?: string;
  puzzleType?: string;
}): Metadata {
  const publishedDate =
    typeof post.publishedAt === "string"
      ? new Date(post.publishedAt)
      : post.publishedAt;

  const description = post.excerpt || truncateDescription(post.content, 160);
  const puzzleTypeName = post.puzzleType
    ? post.puzzleType
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
    : "Puzzle";

  const keywords = [
    "rebus puzzle",
    "puzzle game",
    "puzzle solution",
    "how to solve puzzles",
    "puzzle tips",
    "puzzle guide",
    "wordle alternative",
    "daily puzzle",
    "puzzle solver",
    post.puzzleType || "puzzle",
    post.answer || "",
    `${puzzleTypeName.toLowerCase()} puzzle`,
    "brain teaser",
    "word game",
    "puzzle explanation",
    "puzzle walkthrough",
  ].filter(Boolean);

  return generatePageMetadata({
    title: post.title,
    description,
    keywords,
    url: `/blog/${post.slug}`,
    type: "article",
    publishedTime: publishedDate.toISOString(),
    modifiedTime: publishedDate.toISOString(),
    author: "Rebuzzle Team",
    section: puzzleTypeName,
    tags: [post.puzzleType || "puzzle", post.answer || ""].filter(Boolean),
    image: `${getBaseUrl()}/blog/${post.slug}/opengraph-image`,
  });
}

/**
 * Generate metadata for puzzle/game pages
 */
export function generatePuzzleMetadata(puzzle: {
  answer: string;
  puzzleType?: string;
  difficulty?: string | number;
  explanation?: string;
}): Metadata {
  const puzzleTypeName = puzzle.puzzleType
    ? puzzle.puzzleType
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
    : "Rebus";

  const title = `Today's ${puzzleTypeName} Puzzle - Rebuzzle | Free Daily Puzzle Game`;
  const description = puzzle.explanation
    ? truncateDescription(
        `Solve today's ${puzzleTypeName.toLowerCase()} puzzle: ${puzzle.answer}. ${puzzle.explanation}`,
        160
      )
    : `Challenge yourself with today's ${puzzleTypeName.toLowerCase()} puzzle. Free daily puzzle game like Wordle but with visual rebus puzzles, logic grids, and more!`;

  const keywords = [
    "rebus puzzle",
    "daily puzzle",
    "wordle alternative",
    "wordle like games",
    "free puzzle game",
    "daily word puzzle",
    puzzle.puzzleType || "puzzle",
    puzzle.answer,
    "brain teaser",
    "word game",
    "puzzle solver",
    "online puzzle",
    "puzzle challenge",
    "daily brain teaser",
    "visual puzzle",
    "logic puzzle",
    "cryptic crossword",
    "number sequence",
    "pattern recognition",
    "caesar cipher",
    "trivia puzzle",
  ].filter(Boolean);

  return generatePageMetadata({
    title,
    description,
    keywords,
    url: "/",
    type: "website",
    image: `${getBaseUrl()}/opengraph-image`,
  });
}

/**
 * Generate metadata for blog listing page
 */
export function generateBlogListMetadata(postCount?: number): Metadata {
  const description = postCount
    ? `Browse ${postCount} puzzle blog posts with solutions, tips, and insights. Learn how to solve rebus puzzles, logic grids, cryptic crosswords, and more. Free puzzle guides and walkthroughs.`
    : "Discover fun puzzle solutions, solving tips, and insights. Learn how to solve rebus puzzles, logic grids, cryptic crosswords, number sequences, and more. Free puzzle guides and walkthroughs.";

  return generatePageMetadata({
    title: "Puzzle Blog - Solutions, Tips & Guides | Rebuzzle",
    description,
    keywords: [
      "puzzle blog",
      "puzzle solutions",
      "how to solve puzzles",
      "puzzle guide",
      "puzzle walkthrough",
      "rebus puzzle solutions",
      "logic puzzle tips",
      "cryptic crossword guide",
      "puzzle solver",
      "puzzle help",
      "daily puzzle solutions",
      "wordle alternative",
      "puzzle strategies",
      "brain teaser solutions",
      "puzzle explanations",
    ],
    url: "/blog",
    type: "website",
  });
}

/**
 * Generate metadata for leaderboard page
 */
export function generateLeaderboardMetadata(): Metadata {
  return generatePageMetadata({
    title: "Leaderboard - Top Puzzle Players | Rebuzzle",
    description:
      "See the top players on Rebuzzle leaderboard. Compete daily, build your streak, and climb the ranks! Free puzzle game competition.",
    keywords: [
      "puzzle leaderboard",
      "game rankings",
      "top players",
      "puzzle competition",
      "daily challenge",
      "puzzle scores",
      "puzzle rankings",
      "best puzzle players",
      "puzzle game leaderboard",
      "wordle leaderboard alternative",
    ],
    url: "/leaderboard",
    type: "website",
  });
}

/**
 * Generate metadata for puzzle type category pages
 */
export function generatePuzzleTypeMetadata(
  type: string,
  name: string,
  description: string,
  keywords: string[]
): Metadata {
  return generatePageMetadata({
    title: `${name} - Free Daily Puzzles | Rebuzzle`,
    description: `${description} Play free daily ${name.toLowerCase()} puzzles on Rebuzzle - The ultimate Wordle alternative!`,
    keywords: [
      ...keywords,
      "free puzzle game",
      "daily puzzle",
      "wordle alternative",
      "puzzle solver",
    ],
    url: `/puzzles/${type}`,
    type: "website",
  });
}

/**
 * Generate metadata for static pages
 */
export function generateStaticPageMetadata({
  title,
  description,
  url,
  keywords = [],
}: {
  title: string;
  description: string;
  url: string;
  keywords?: string[];
}): Metadata {
  return generatePageMetadata({
    title,
    description,
    keywords,
    url,
    type: "website",
  });
}
