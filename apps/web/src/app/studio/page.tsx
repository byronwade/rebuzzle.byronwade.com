import type { Metadata } from "next";
import Layout from "@/components/Layout";
import { PuzzleStudio } from "@/components/studio/PuzzleStudio";
import { generatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = generatePageMetadata({
  title: "Studio — Make a rebus puzzle",
  description:
    "Compose your own Rebuzzle boards with a Framer-style editor. Eve grades fairness, then your puzzle can enter the daily lottery and live on your creator profile.",
  keywords: [
    "create rebus puzzle",
    "user generated rebus",
    "puzzle maker",
    "Rebuzzle Studio",
    "make a rebus",
  ],
  url: "/studio",
});

export default function StudioPage() {
  return (
    <Layout>
      <PuzzleStudio />
    </Layout>
  );
}
