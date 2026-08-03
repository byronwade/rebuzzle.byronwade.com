import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { AppLink as Link } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = generateStaticPageMetadata({
  title: "Terms of Service | Rebuzzle",
  description:
    "Terms of Service for Rebuzzle - Read our terms and conditions for using our puzzle game service.",
  url: "/terms",
  keywords: ["terms of service", "terms and conditions", "user agreement", "legal"],
});

/** Static legal copy — no request-time Date/connection (keeps the page prerenderable). */
const LAST_UPDATED = "July 1, 2026";


export function useTermsPage(props: any = {}) {

  const lastUpdated = LAST_UPDATED;


  return {
    lastUpdated
  };
}
