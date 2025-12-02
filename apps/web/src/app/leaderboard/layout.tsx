import type { Metadata } from "next";
import { generateLeaderboardMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = generateLeaderboardMetadata();

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
