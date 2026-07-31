import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
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
import { fetchBlogPostsPaginated } from "../actions/blogActions";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const page = await fetchBlogPostsPaginated({ page: 1, limit: 1 });
  return generateBlogListMetadata(page.totalCount);
}

function BlogListSkeleton() {
  return (
    <div className="divide-y divide-border border-border border-t">
      {[1, 2, 3, 4, 5].map((i) => (
        <div className="py-6" key={i}>
          <div className="mb-3 flex items-center gap-2">
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
  await connection();

  try {
    const paginatedPosts = await fetchBlogPostsPaginated({ page: 1, limit: 20 });
    const blogPosts = paginatedPosts.posts;

    // Empty state
    if (!blogPosts || blogPosts.length === 0) {
      return (
        <Layout>
          <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
            <header className="border-border border-b pb-8">
              <p className="eyebrow">Blog</p>
              <h1 className="mt-4 font-semibold text-4xl tracking-[-0.045em]">Puzzle solutions.</h1>
              <p className="mt-3 text-muted-foreground leading-7">
                Daily write-ups, strategies and the reasoning behind each puzzle.
              </p>
            </header>

            <Card className="mt-10" variant="inset">
              <CardContent className="px-6 py-14 text-center">
                <FileText className="mx-auto mb-4 size-8 text-subtle" />
                <h2 className="font-semibold text-lg tracking-[-0.03em]">No posts yet</h2>
                <p className="mx-auto mt-2 max-w-xs text-balance text-muted-foreground text-sm leading-6">
                  Write-ups go up alongside each day's puzzle. Check back soon.
                </p>
                <Button asChild className="mt-6" size="lg" variant="pill">
                  <Link href="/">Play today's puzzle</Link>
                </Button>
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

        <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
          {/* Header */}
          <header className="border-border border-b pb-8">
            <p className="eyebrow">Blog</p>
            <h1 className="mt-4 font-semibold text-4xl tracking-[-0.045em]">Puzzle solutions.</h1>
            <p className="mt-3 text-muted-foreground leading-7">
              Daily write-ups, strategies and the reasoning behind each puzzle.
            </p>
          </header>

          {/* Search */}
          <div className="mt-8 mb-8">
            <Suspense fallback={<Skeleton className="h-10 w-full rounded-lg" />}>
              <BlogSearch />
            </Suspense>
          </div>

          {/* Posts list */}
          <Suspense fallback={<BlogListSkeleton />}>
            <div className="divide-y divide-border border-border border-t">
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
          <div className="mt-14 border-border border-t pt-10 text-center">
            <p className="text-muted-foreground text-sm">Ready to test your skills?</p>
            <Button asChild className="mt-4" size="lg" variant="pill">
              <Link href="/">Play today's puzzle</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  } catch (_error) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
          <header className="border-border border-b pb-8">
            <p className="eyebrow">Blog</p>
            <h1 className="mt-4 font-semibold text-4xl tracking-[-0.045em]">Puzzle solutions.</h1>
          </header>

          <Card className="mt-10" variant="inset">
            <CardContent className="px-6 py-14 text-center">
              <h2 className="font-semibold text-lg tracking-[-0.03em]">Something went wrong</h2>
              <p className="mt-2 text-muted-foreground text-sm">We couldn't load the blog posts.</p>
              <div className="mt-6 flex justify-center gap-2">
                <Button asChild variant="outline">
                  <Link href="/blog">Try again</Link>
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
