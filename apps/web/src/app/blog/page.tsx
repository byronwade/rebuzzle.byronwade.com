import { BookOpen, FileText } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import BlogPost from "@/components/BlogPost";
import { BlogPagination, BlogSearch } from "@/components/blog";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { generateBlogListMetadata } from "@/lib/seo/metadata";
import {
  generateBreadcrumbSchema,
  generateFAQPageSchema,
  generateItemListSchema,
} from "@/lib/seo/structured-data";
import { fetchBlogPosts, fetchBlogPostsPaginated } from "../actions/blogActions";

export async function generateMetadata(): Promise<Metadata> {
  await headers();
  const posts = await fetchBlogPosts();
  return generateBlogListMetadata(posts?.length ?? 0);
}

function BlogListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 rounded-xl border">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-3" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function BlogPage() {
  await headers();

  try {
    const [blogPosts, paginatedPosts] = await Promise.all([
      fetchBlogPosts(),
      fetchBlogPostsPaginated({ page: 1, limit: 20 }),
    ]);

    // Empty state
    if (!blogPosts || blogPosts.length === 0) {
      return (
        <Layout>
          <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
            <div className="mb-6">
              <h1 className="font-bold text-xl text-foreground flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                Puzzle Blog
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Daily puzzle solutions and strategies
              </p>
            </div>

            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <FileText className="size-10 text-muted-foreground mx-auto mb-3" />
                <h2 className="font-semibold text-base mb-1">No posts yet</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Check back soon for puzzle insights and tips
                </p>
                <Link href="/">
                  <Button size="sm">Play Today's Puzzle</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </Layout>
      );
    }

    // Generate schemas
    const itemListSchema = generateItemListSchema({
      items: blogPosts.map((post) => ({
        slug: post.slug,
        title: post.title,
      })),
      name: "Rebuzzle Puzzle Blog",
      description: "Daily puzzle solutions, strategies, and insights",
      url: "/blog",
    });

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
    ]);

    const faqSchema = generateFAQPageSchema([
      {
        question: "What is Rebuzzle?",
        answer:
          "Rebuzzle is a free daily puzzle game featuring AI-generated rebus puzzles, logic grids, cryptic crosswords, number sequences, pattern recognition, Caesar ciphers, and trivia.",
      },
      {
        question: "How do I solve rebus puzzles?",
        answer:
          "Rebus puzzles use visual elements like emojis and symbols to represent words or phrases. Look for phonetic connections and visual representations.",
      },
      {
        question: "Are puzzle solutions available?",
        answer:
          "Yes! Our blog features detailed solutions, strategies, and explanations for every puzzle.",
      },
      {
        question: "How often are new puzzles released?",
        answer:
          "A new puzzle is released every day at midnight. Check back daily for fresh challenges!",
      },
    ]);

    return (
      <Layout>
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          type="application/ld+json"
        />

        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-bold text-xl text-foreground flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              Puzzle Blog
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Daily puzzle solutions, strategies, and insights
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <Suspense fallback={<Skeleton className="h-10 w-full rounded-lg" />}>
              <BlogSearch />
            </Suspense>
          </div>

          {/* Posts list */}
          <Suspense fallback={<BlogListSkeleton />}>
            <div className="space-y-4">
              {blogPosts.map((post) => (
                <BlogPost key={post.slug} post={post} />
              ))}
            </div>
          </Suspense>

          {/* Pagination */}
          {paginatedPosts.totalPages > 1 && (
            <div className="mt-8">
              <BlogPagination currentPage={1} totalPages={paginatedPosts.totalPages} />
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground mb-3">Ready to test your skills?</p>
            <Link href="/">
              <Button>Play Today's Puzzle</Button>
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
            <h1 className="font-bold text-xl text-foreground flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              Puzzle Blog
            </h1>
          </div>

          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <p className="font-medium text-sm mb-1">Something went wrong</p>
              <p className="text-sm text-muted-foreground mb-4">We couldn't load the blog posts</p>
              <div className="flex justify-center gap-2">
                <Link href="/blog">
                  <Button variant="outline" size="sm">
                    Try Again
                  </Button>
                </Link>
                <Link href="/">
                  <Button size="sm">Play Puzzle</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
}
