import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { AppLink as Link } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";
import { TermsBody } from "./terms-body";

export const metadata: Metadata = generateStaticPageMetadata({
  title: "Terms of Service | Rebuzzle",
  description:
    "Terms of Service for Rebuzzle - Read our terms and conditions for using our puzzle game service.",
  url: "/terms",
  keywords: ["terms of service", "terms and conditions", "user agreement", "legal"],
});

/** Static legal copy — no request-time Date/connection (keeps the page prerenderable). */
const LAST_UPDATED = "July 1, 2026";

export default function TermsOfServicePage() {
  const lastUpdated = LAST_UPDATED;

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
        <header className="border-border border-b pb-8">
          <p className="eyebrow mb-4">Legal</p>
          <div className="mb-2 flex items-center gap-3">
            <FileText className="h-6 w-6 text-subtle" />
            <h1 className="font-semibold text-2xl tracking-[-0.04em] md:text-3xl">
              Terms of Service
            </h1>
          </div>
          <p className="font-mono text-subtle text-xs">Last updated: {lastUpdated}</p>
        </header>

        <TermsBody />

        <div className="mt-8 text-center">
          <Link className="text-link text-sm underline-offset-4 hover:underline" href="/">
            ← Back to Home
          </Link>
        </div>
      </div>
    </Layout>
  );
}
