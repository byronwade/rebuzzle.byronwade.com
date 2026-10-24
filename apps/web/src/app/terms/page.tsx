import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";
import { TERMS_SECTIONS, TermsBody } from "./terms-body";

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
  return (
    <LegalLayout
      description="The rules for using Rebuzzle, in as plain language as we could manage."
      lastUpdated={LAST_UPDATED}
      sections={TERMS_SECTIONS}
      title="Terms of service."
    >
      <TermsBody />
    </LegalLayout>
  );
}
