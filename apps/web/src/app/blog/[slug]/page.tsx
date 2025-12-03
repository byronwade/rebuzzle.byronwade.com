import { headers } from "next/headers";
import { BookOpen, Puzzle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  const headersList = await headers();
  headersList.get("x-forwarded-proto");

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

        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
          <BlogPostContent post={post} />

          {/* Puzzle Statistics */}
          {puzzleStats && <PuzzleStatsCard stats={puzzleStats} className="mt-6" />}

          {/* FAQ Section */}
          {post.sections?.faq && post.sections.faq.length > 0 && (
            <FAQSection faqs={post.sections.faq} className="mt-6" />
          )}

          {/* Post Navigation (Prev/Next) */}
          <PostNavigation prev={adjacentPosts.prev} next={adjacentPosts.next} className="mt-6" />

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h2 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Puzzle className="size-4 text-muted-foreground" />
                More {puzzleTypeName} Puzzles
              </h2>
              <div className="space-y-2">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.slug}
                    href={`/blog/${relatedPost.slug}`}
                    className="block p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <p className="font-medium text-sm text-foreground truncate">
                      {relatedPost.title}
                    </p>
                    {relatedPost.excerpt && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {relatedPost.excerpt}
                      </p>
                    )}
                  </Link>
                ))}
              </div>

              {/* View all link */}
              <Link href={`/puzzles/${post.puzzleType}`} className="block mt-3">
                <Button variant="outline" size="sm" className="w-full">
                  View All {puzzleTypeName} Puzzles
                </Button>
              </Link>
            </div>
          )}

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Blog
            </Link>
          </div>
        </div>
      </Layout>
    );
  } catch (_error) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
          <div className="mb-6">
            <h1 className="font-semibold text-xl text-foreground flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              Blog Post
            </h1>
          </div>

          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <p className="font-medium text-sm mb-1">Error loading post</p>
              <p className="text-xs text-muted-foreground mb-4">
                Something went wrong while loading this post
              </p>
              <div className="flex justify-center gap-2">
                <Link href="/blog">
                  <Button size="sm" variant="outline">
                    Back to Blog
                  </Button>
                </Link>
                <Link href="/">
                  <Button size="sm">Play Today's Puzzle</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
}
