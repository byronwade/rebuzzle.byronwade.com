import type { Metadata } from "next";
import Link from "next/link";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...generateStaticPageMetadata({
    title: "AI Quota Exceeded | Rebuzzle",
    description:
      "AI quota limit reached. We've hit our daily limit for AI puzzle generation. Pre-generated puzzles are still available.",
    url: "/ai-quota-exceeded",
    keywords: ["quota", "limit", "service status"],
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function AIQuotaExceededPage() {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <div className="flex justify-center">
          <Card className="w-full max-w-2xl p-8 md:p-12">
            <div className="space-y-6 text-center">
              {/* Icon */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
                <svg
                  className="h-10 w-10 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>

              {/* Message */}
              <div>
                <h1 className="mb-3 font-bold text-3xl text-gray-900">
                  AI Quota Limit Reached
                </h1>
                <p className="mb-4 text-gray-600 text-lg">
                  We've hit our daily limit for AI puzzle generation.
                </p>
                <p className="text-gray-500">
                  Don't worry! We have thousands of pre-generated puzzles ready
                  for you. The AI quota resets daily at midnight PST.
                </p>
              </div>

              {/* Info Box */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-left">
                <h3 className="mb-2 font-semibold text-blue-900">
                  Why did this happen?
                </h3>
                <p className="text-blue-800 text-sm">
                  We use Google's free tier AI service (Gemini) which has a
                  limit of 1,500 requests per day. This helps us keep Rebuzzle
                  free for everyone! The quota automatically resets at midnight.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
                <Link href="/">
                  <Button className="w-full sm:w-auto" size="lg">
                    Play Today's Puzzle
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
                  <strong>Current Status:</strong> Using cached puzzles
                </p>
                <p className="mt-1 text-gray-500 text-sm">
                  <strong>Quota Resets:</strong> Daily at midnight PST
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
