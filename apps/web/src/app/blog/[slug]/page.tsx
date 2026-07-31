import { Puzzle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import BlogPostContent from "@/components/BlogPostContent";
import { FAQSection, PostNavigation, PuzzleStatsCard } from "@/components/blog";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateBlogPostMetadata } from "@/lib/seo/metadata";
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateFAQPageSchema,
  generateHowToSchema,
} from "@/lib/seo/structured-data";
import {
  fetchAdjacentPosts,
  fetchBlogPost,
  fetchBlogPosts,
  fetchBlogPostWithStats,
} from "../../actions/blogActions";

const puzzleTypeLabels: Record<string, string> = {
  rebus: "Rebus",
  "logic-grid": "Logic Grid",
  "cryptic-crossword": "Cryptic Crossword",
  "number-sequence": "Number Sequence",
  "pattern-recognition": "Pattern Recognition",
  "caesar-cipher": "Caesar Cipher",
  trivia: "Trivia",
};

export async function generateStaticParams() {
  try {
    const posts = await fetchBlogPosts();
    const validSlugs = posts
      .filter((post) => post.slug.length <= 250)
      .map((post) => ({ slug: post.slug }));

    if (validSlugs.length === 0) {
      return [{ slug: "placeholder" }];
    }
    return validSlugs;
  } catch (error) {
    console.error("Error fetching blog posts for generateStaticParams:", error);
    return [{ slug: "placeholder" }];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const post = await fetchBlogPost(slug);
    if (!post) {
      return {
        title: "Not Found - Rebuzzle Blog",
        description: "The requested blog post could not be found.",
      };
    }

    // Pass date as string - generateBlogPostMetadata will handle conversion
    return generateBlogPostMetadata({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      publishedAt: post.date, // Pass as string, not new Date()
      answer: post.answer,
      puzzleType: post.puzzleType,
    });
  } catch (_error) {
    return {
      title: "Error - Rebuzzle Blog",
      description: "An error occurred while loading the blog post.",
    };
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  // Access headers first to make this component dynamic before any Date() operations
  await connection();

  const { slug } = await params;

  try {
    // Fetch post with stats for richer content
    const postWithStats = await fetchBlogPostWithStats(slug);

    if (!postWithStats) {
      notFound();
    }

    const post = postWithStats;

    // Fetch adjacent posts for navigation and related posts in parallel
    const [adjacentPosts, allPosts] = await Promise.all([
      fetchAdjacentPosts(post.date),
      fetchBlogPosts(),
    ]);

    // Generate schemas - pass dates as strings, schema generator will handle conversion
    const articleSchema = generateArticleSchema({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      publishedAt: post.date, // Pass as string
      updatedAt: post.date, // Pass as string
      authorId: "rebuzzle-team",
      puzzleId: post.answer,
      answer: post.answer,
      puzzleType: post.puzzleType,
    });

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
      { name: post.title, url: `/blog/${post.slug}` },
    ]);

    const puzzleTypeName = post.puzzleType
      ? puzzleTypeLabels[post.puzzleType] || post.puzzleType
      : "Rebus";

    const howToSchema = generateHowToSchema({
      name: `How to Solve ${puzzleTypeName} Puzzles`,
      description: `Learn how to solve ${puzzleTypeName.toLowerCase()} puzzles`,
      steps: [
        { name: "Analyze the Puzzle", text: "Examine all elements carefully" },
        { name: "Look for Patterns", text: "Find connections and relationships" },
        { name: "Make Your Guess", text: "Submit your answer" },
      ],
    });

    // Generate FAQ schema if sections.faq exists
    const faqSchema =
      post.sections?.faq && post.sections.faq.length > 0
        ? generateFAQPageSchema(post.sections.faq)
        : null;

    // Get related posts (only if puzzle type exists)
    const relatedPosts = post.puzzleType
      ? allPosts.filter((p) => p.puzzleType === post.puzzleType && p.slug !== post.slug).slice(0, 3)
      : [];

    // Prepare stats for PuzzleStatsCard
    const puzzleStats = post.puzzleStats
      ? {
          solveRate: post.puzzleStats.solveRate ?? 0,
          avgSolveTime: post.puzzleStats.avgSolveTime ?? 0,
          totalAttempts: post.puzzleStats.totalAttempts ?? 0,
          hintsUsedAvg: post.puzzleStats.hintsUsedAvg ?? 0,
          difficultyComparison: post.puzzleStats.difficultyComparison ?? "average",
        }
      : undefined;

    return (
      <Layout>
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
          type="application/ld+json"
        />
        {faqSchema && (
          <script
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            type="application/ld+json"
          />
        )}

        <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
          <BlogPostContent post={post} />

          {/* Puzzle Statistics */}
          {puzzleStats && <PuzzleStatsCard className="mt-10" stats={puzzleStats} />}

          {/* FAQ Section */}
          {post.sections?.faq && post.sections.faq.length > 0 && (
            <FAQSection className="mt-10" faqs={post.sections.faq} />
          )}

          {/* Post Navigation (Prev/Next) */}
          <PostNavigation className="mt-10" next={adjacentPosts.next} prev={adjacentPosts.prev} />

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-14 border-border border-t pt-10">
              <p className="eyebrow flex items-center gap-2">
                <Puzzle className="size-3" />
                More {puzzleTypeName} puzzles
              </p>
              <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    className="block px-4 py-3.5 transition-colors hover:bg-inset"
                    href={`/blog/${relatedPost.slug}`}
                    key={relatedPost.slug}
                  >
                    <p className="truncate font-medium text-foreground text-sm">
                      {relatedPost.title}
                    </p>
                    {relatedPost.excerpt && (
                      <p className="mt-0.5 truncate text-muted-foreground text-xs">
                        {relatedPost.excerpt}
                      </p>
                    )}
                  </Link>
                ))}
              </div>

              {/* View all link */}
              <Button asChild className="mt-4 w-full" variant="outline">
                <Link href={`/puzzles/${post.puzzleType}`}>View all {puzzleTypeName} puzzles</Link>
              </Button>
            </div>
          )}

          {/* Back link */}
          <div className="mt-12 text-center">
            <Link className="text-link text-sm underline-offset-4 hover:underline" href="/blog">
              ← Back to blog
            </Link>
          </div>
        </div>
      </Layout>
    );
  } catch (_error) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
          <Card variant="inset">
            <CardContent className="px-6 py-14 text-center">
              <p className="eyebrow">Blog</p>
              <h1 className="mt-3 font-semibold text-2xl tracking-[-0.04em]">
                We couldn't load this post.
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">Something went wrong on our end.</p>
              <div className="mt-6 flex justify-center gap-2">
                <Button asChild variant="outline">
                  <Link href="/blog">Back to blog</Link>
                </Button>
                <Button asChild>
                  <Link href="/">Play today's puzzle</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
}
