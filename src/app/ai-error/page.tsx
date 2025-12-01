import type { Metadata } from "next";
import Link from "next/link";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...generateStaticPageMetadata({
    title: "AI Service Error | Rebuzzle",
    description:
      "AI service temporarily unavailable. We're experiencing temporary issues with our AI service. Try again or play pre-generated puzzles.",
    url: "/ai-error",
    keywords: ["error", "service unavailable", "technical issue"],
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function AIErrorPage() {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <div className="flex justify-center">
          <Card className="w-full max-w-2xl p-8 md:p-12">
            <div className="space-y-6 text-center">
              {/* Icon */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-10 w-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>

              {/* Message */}
              <div>
                <h1 className="mb-3 font-bold text-3xl text-gray-900">
                  AI Service Temporarily Unavailable
                </h1>
                <p className="mb-4 text-gray-600 text-lg">
                  We're experiencing temporary issues with our AI service.
                </p>
                <p className="text-gray-500">
                  This is usually resolved quickly. In the meantime, you can
                  still play our pre-generated puzzles!
                </p>
              </div>

              {/* What Happened */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
                <h3 className="mb-2 font-semibold text-gray-900">
                  What happened?
                </h3>
                <ul className="list-inside list-disc space-y-1 text-gray-700 text-sm">
                  <li>AI service may be temporarily down</li>
                  <li>Network connection issues</li>
                  <li>Service maintenance in progress</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
                <Link href="/">
                  <Button className="w-full sm:w-auto" size="lg">
                    Try Again
                  </Button>
                </Link>
                <Link href="/blog">
                  <Button
                    className="w-full sm:w-auto"
                    size="lg"
                    variant="outline"
                  >
                    Read Puzzle Tips
                  </Button>
                </Link>
              </div>

              {/* Additional Info */}
              <div className="border-gray-200 border-t pt-6">
                <p className="text-gray-500 text-sm">
                  If this problem persists, please contact support or try again
                  in a few minutes.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
