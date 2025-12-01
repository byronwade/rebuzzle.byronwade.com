import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogPostContent from "@/components/BlogPostContent";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { generateBlogPostMetadata } from "@/lib/seo/metadata";
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateHowToSchema,
} from "@/lib/seo/structured-data";
import { fetchBlogPost, fetchBlogPosts } from "../../actions/blogActions";

// Generate static params for all blog posts
// In Cache Components mode, we must return at least one result
export async function generateStaticParams() {
  try {
    const posts = await fetchBlogPosts();
    // Filter out slugs that are too long for filesystem (max ~250 chars for safety)
    // Long slugs will be generated on-demand instead
    const validSlugs = posts
      .filter((post) => post.slug.length <= 250)
      .map((post) => ({
        slug: post.slug,
      }));
    
    // Return valid slugs, or placeholder if none available
    if (validSlugs.length === 0) {
      return [{ slug: 'placeholder' }];
    }
    return validSlugs;
  } catch (error) {
    // If fetch fails during build, return placeholder to satisfy requirement
    console.error('Error fetching blog posts for generateStaticParams:', error);
    return [{ slug: 'placeholder' }];
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

    return generateBlogPostMetadata({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      publishedAt: new Date(post.date),
      answer: post.answer,
      puzzleType: post.puzzleType,
    });
  } catch (error) {
    return {
      title: "Error - Rebuzzle Blog",
      description: "An error occurred while loading the blog post.",
    };
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const post = await fetchBlogPost(slug);

    if (!post) {
      notFound();
    }

    // Generate Article schema for JSON-LD
    const articleSchema = generateArticleSchema({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      publishedAt: new Date(post.date),
      updatedAt: new Date(post.date), // Use date as updatedAt if not available
      authorId: "rebuzzle-team",
      puzzleId: post.answer, // Using answer as identifier
      answer: post.answer,
      puzzleType: post.puzzleType,
    });

    // Generate Breadcrumb schema
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
      { name: post.title, url: `/blog/${post.slug}` },
    ]);

    // Generate HowTo schema if post is instructional
    const puzzleTypeName = post.puzzleType
      ? post.puzzleType
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())
      : "Rebus";

    const howToSchema = generateHowToSchema({
      name: `How to Solve ${puzzleTypeName} Puzzles`,
      description: `Learn how to solve ${puzzleTypeName.toLowerCase()} puzzles like this one: ${post.answer}`,
      steps: [
        {
          name: "Understand the Puzzle Type",
          text: `This is a ${puzzleTypeName.toLowerCase()} puzzle. ${post.puzzleType === "rebus" ? "Look for visual elements, symbols, and words that represent sounds or meanings." : post.puzzleType === "logic-grid" ? "Use logical deduction to fill in the grid based on given clues." : "Analyze the clues carefully to find the pattern or solution."}`,
        },
        {
          name: "Analyze the Clues",
          text: "Examine all elements of the puzzle carefully. Look for patterns, relationships, or wordplay that might lead to the solution.",
        },
        {
          name: "Use Hints if Needed",
          text: "If you're stuck, use the progressive hint system. Start with the first hint and work your way through them systematically.",
        },
        {
          name: "Make Your Guess",
          text: "Based on your analysis, make your best guess. You'll get immediate feedback on whether you're correct.",
        },
        {
          name: "Learn from the Solution",
          text: `The answer is: ${post.answer}. ${post.explanation || "Review the explanation to understand the puzzle's logic and improve your solving skills."}`,
        },
      ],
    });

    // Get related posts (same puzzle type, exclude current)
    const allPosts = await fetchBlogPosts();
    const relatedPosts = allPosts
      .filter((p) => p.puzzleType === post.puzzleType && p.slug !== post.slug)
      .slice(0, 3);

    return (
      <Layout>
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(articleSchema),
          }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(howToSchema),
          }}
          type="application/ld+json"
        />
        <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
          <BlogPostContent post={post} />

          {/* Related Posts & Category Link */}
          <div className="mt-6 space-y-6 border-t pt-6">
            {/* Puzzle Type Category Link */}
            {post.puzzleType && (
              <div>
                <Button asChild size="default" variant="outline">
                  <Link href={`/puzzles/${post.puzzleType}`}>
                    <span>🧩</span>
                    <span>More {puzzleTypeName} Puzzles</span>
                  </Link>
                </Button>
              </div>
            )}

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div>
                <h2 className="mb-4 font-semibold text-base text-foreground">
                  Related {puzzleTypeName} Puzzles
                </h2>
                <div className="grid gap-3 md:grid-cols-3">
                  {relatedPosts.map((relatedPost) => (
                    <Link
                      className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
                      href={`/blog/${relatedPost.slug}`}
                      key={relatedPost.slug}
                    >
                      <h3 className="mb-2 font-medium text-sm text-foreground group-hover:text-primary">
                        {relatedPost.title}
                      </h3>
                      {relatedPost.excerpt && (
                        <p className="line-clamp-2 text-muted-foreground text-xs">
                          {relatedPost.excerpt}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  } catch (error) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
          {/* Error state */}
          <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-lg">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-10 w-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <h1 className="mb-4 font-bold text-3xl text-red-600">
              Error Loading Blog Post
            </h1>
            <p className="mb-6 text-gray-600">
              Sorry, we encountered an error loading this blog post.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-purple-700"
                href="/blog"
              >
                Back to Blog
              </a>
              <a
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors duration-200 hover:bg-gray-50"
                href="/"
              >
                Play Today's Puzzle
              </a>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
}
