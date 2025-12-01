import type { Metadata } from "next";
import Link from "next/link";
import BlogPost from "@/components/BlogPost";
import Layout from "@/components/Layout";
import { generateBlogListMetadata } from "@/lib/seo/metadata";
import {
  generateBreadcrumbSchema,
  generateFAQPageSchema,
  generateItemListSchema,
} from "@/lib/seo/structured-data";
import { fetchBlogPosts } from "../actions/blogActions";

// Puzzle types for category navigation
const PUZZLE_TYPES = [
  { id: "rebus", name: "Rebus" },
  { id: "logic-grid", name: "Logic Grid" },
  { id: "cryptic-crossword", name: "Cryptic Crossword" },
  { id: "number-sequence", name: "Number Sequence" },
  { id: "pattern-recognition", name: "Pattern Recognition" },
  { id: "caesar-cipher", name: "Caesar Cipher" },
  { id: "trivia", name: "Trivia" },
];

/**
 * Generate dynamic metadata for blog listing page
 */
export async function generateMetadata(): Promise<Metadata> {
  const posts = await fetchBlogPosts();
  return generateBlogListMetadata(posts.length);
}

export default async function BlogPage() {
  try {
    const blogPosts = await fetchBlogPosts();

    // Generate ItemList schema for blog posts
    const itemListSchema =
      blogPosts.length > 0
        ? generateItemListSchema({
            items: blogPosts.map((post) => ({
              slug: post.slug,
              title: post.title,
            })),
            name: "Rebuzzle Blog Posts",
            description: "Collection of puzzle solution blog posts",
            url: "/blog",
          })
        : null;

    // Generate Breadcrumb schema
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
    ]);

    // Generate FAQ schema for blog page
    const faqSchema = generateFAQPageSchema([
      {
        question: "What is Rebuzzle?",
        answer:
          "Rebuzzle is a free daily puzzle game featuring AI-generated rebus puzzles, logic grids, cryptic crosswords, number sequences, pattern recognition, Caesar ciphers, and trivia. Like Wordle but with multiple puzzle types!",
      },
      {
        question: "How do I solve rebus puzzles?",
        answer:
          "Rebus puzzles use visual elements like emojis, symbols, and words to represent words or phrases. Look for phonetic connections, compound words, and visual representations. Combine the elements to form the answer.",
      },
      {
        question: "Are puzzle solutions available?",
        answer:
          "Yes! Our blog features detailed solutions and explanations for puzzles. Each blog post includes the puzzle, solution, step-by-step explanation, and solving tips.",
      },
      {
        question: "What puzzle types does Rebuzzle have?",
        answer:
          "Rebuzzle features 7 puzzle types: rebus (visual word puzzles), logic grids, cryptic crosswords, number sequences, pattern recognition, Caesar ciphers, and trivia questions. All are AI-generated and unique daily.",
      },
    ]);

    if (!blogPosts || blogPosts.length === 0) {
      return (
        <Layout>
          <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
            {/* Header */}
            <div className="mb-12 text-center">
              <h1 className="mb-4 font-bold text-4xl text-gray-800">
                Rebuzzle Blog
              </h1>
              <p className="text-gray-600 text-lg">
                Daily puzzle insights and game tips
              </p>
            </div>

            {/* Empty state */}
            <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-lg">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <svg
                  className="h-10 w-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <h2 className="mb-2 font-bold text-2xl text-gray-800">
                No Blog Posts Yet
              </h2>
              <p className="mb-6 text-gray-600">
                We're working on some great content for you!
              </p>
              <p className="text-gray-500 text-sm">
                Check back soon for puzzle insights and tips.
              </p>
            </div>
          </div>
        </Layout>
      );
    }

    // Group posts by puzzle type for category navigation
    const postsByType = PUZZLE_TYPES.map((type) => ({
      ...type,
      count: blogPosts.filter((p) => p.puzzleType === type.id).length,
    })).filter((type) => type.count > 0);

    return (
      <Layout>
        {itemListSchema && (
          <script
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(itemListSchema),
            }}
            type="application/ld+json"
          />
        )}
        {breadcrumbSchema && (
          <script
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(breadcrumbSchema),
            }}
            type="application/ld+json"
          />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema),
          }}
          type="application/ld+json"
        />
        <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-purple-100 px-4 py-2">
              <span className="text-2xl">🧩</span>
            </div>
            <h1 className="mb-4 font-bold text-4xl text-gray-900">
              Puzzle Blog
            </h1>
            <p className="text-gray-600 text-lg">
              Fun insights, solutions, and tips for today's puzzles
            </p>
          </div>

          {/* Category Navigation */}
          {postsByType.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 font-semibold text-base">
                Browse by Puzzle Type
              </h2>
              <div className="flex flex-wrap gap-2">
                {postsByType.map((type) => (
                  <Link
                    className="rounded-lg border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent"
                    href={`/puzzles/${type.id}`}
                    key={type.id}
                  >
                    {type.name} ({type.count})
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Blog posts grid */}
          <div className="space-y-6">
            {blogPosts.map((post) => (
              <BlogPost key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </Layout>
    );
  } catch (error) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 font-bold text-4xl text-gray-800">
              Rebuzzle Blog
            </h1>
            <p className="text-gray-600 text-lg">
              Daily puzzle insights and game tips
            </p>
          </div>

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
            <h2 className="mb-2 font-bold text-2xl text-red-600">
              Oops! Something went wrong
            </h2>
            <p className="mb-6 text-gray-600">
              We encountered an error loading the blog posts.
            </p>
            <a
              className="inline-block rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-purple-700"
              href="/blog"
            >
              Try Again
            </a>
          </div>
        </div>
      </Layout>
    );
  }
}
