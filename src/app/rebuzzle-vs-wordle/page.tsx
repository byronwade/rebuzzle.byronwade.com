import { Check, Puzzle, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generatePageMetadata } from "@/lib/seo/metadata";
import {
  generateBreadcrumbSchema,
  generateFAQPageSchema,
  generateItemListSchema,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = generatePageMetadata({
  title: "Rebuzzle vs Wordle - Which Puzzle Game is Better?",
  description:
    "Compare Rebuzzle and Wordle side-by-side. Discover why Rebuzzle offers more variety with 7 puzzle types, AI-generated challenges, and free daily puzzles. The ultimate Wordle alternative!",
  url: "/rebuzzle-vs-wordle",
  keywords: [
    "rebuzzle vs wordle",
    "wordle alternative",
    "wordle like games",
    "best wordle alternative",
    "free wordle alternative",
    "puzzle game like wordle",
    "daily puzzle game",
    "rebus puzzle game",
    "word puzzle game",
  ],
});

export default function RebuzzleVsWordlePage() {
  const comparisonFeatures = [
    {
      feature: "Puzzle Types",
      rebuzzle:
        "7 types (rebus, logic-grid, cryptic-crossword, number-sequence, pattern-recognition, caesar-cipher, trivia)",
      wordle: "1 type (5-letter word guessing)",
      winner: "rebuzzle",
    },
    {
      feature: "Daily Puzzles",
      rebuzzle: "Yes - AI-generated unique puzzles",
      wordle: "Yes - One word per day",
      winner: "tie",
    },
    {
      feature: "Cost",
      rebuzzle: "100% Free - No ads, no subscriptions",
      wordle: "Free (owned by NYT)",
      winner: "tie",
    },
    {
      feature: "Mobile App",
      rebuzzle: "Progressive Web App (PWA) - Install on any device",
      wordle: "Mobile app available",
      winner: "tie",
    },
    {
      feature: "Hints System",
      rebuzzle: "Progressive hint system with multiple levels",
      wordle: "No hints available",
      winner: "rebuzzle",
    },
    {
      feature: "Educational Value",
      rebuzzle:
        "Multiple cognitive skills (logic, pattern recognition, vocabulary, etc.)",
      wordle: "Vocabulary building",
      winner: "rebuzzle",
    },
    {
      feature: "Offline Play",
      rebuzzle: "Yes - Full offline support",
      wordle: "Requires internet",
      winner: "rebuzzle",
    },
    {
      feature: "Leaderboard",
      rebuzzle: "Global leaderboard with streaks",
      wordle: "Share results with friends",
      winner: "rebuzzle",
    },
    {
      feature: "AI-Generated",
      rebuzzle: "Yes - Unique puzzles every day",
      wordle: "Pre-selected words",
      winner: "rebuzzle",
    },
    {
      feature: "Difficulty Levels",
      rebuzzle: "Adaptive difficulty (5-10 scale)",
      wordle: "Single difficulty",
      winner: "rebuzzle",
    },
  ];

  const rebuzzleWins = comparisonFeatures.filter(
    (f) => f.winner === "rebuzzle"
  ).length;
  const wordleWins = comparisonFeatures.filter(
    (f) => f.winner === "wordle"
  ).length;
  const ties = comparisonFeatures.filter((f) => f.winner === "tie").length;

  // Generate structured data
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Rebuzzle vs Wordle", url: "/rebuzzle-vs-wordle" },
  ]);

  const faqSchema = generateFAQPageSchema([
    {
      question: "Is Rebuzzle better than Wordle?",
      answer:
        "Rebuzzle offers more variety with 7 different puzzle types compared to Wordle's single word-guessing format. While both are free, Rebuzzle provides progressive hints, offline play, and AI-generated unique puzzles daily.",
    },
    {
      question: "Can I play Rebuzzle if I like Wordle?",
      answer:
        "Absolutely! If you enjoy Wordle's daily challenge format, you'll love Rebuzzle. It offers the same daily ritual but with more puzzle variety, including rebus puzzles, logic grids, cryptic crosswords, and more.",
    },
    {
      question: "Is Rebuzzle free like Wordle?",
      answer:
        "Yes! Rebuzzle is 100% free with no ads and no subscriptions. It's completely free to play, just like Wordle.",
    },
    {
      question: "What makes Rebuzzle different from Wordle?",
      answer:
        "Rebuzzle offers 7 puzzle types (rebus, logic-grid, cryptic-crossword, number-sequence, pattern-recognition, caesar-cipher, trivia) compared to Wordle's single word-guessing format. Rebuzzle also features progressive hints, offline play, and AI-generated unique puzzles.",
    },
    {
      question: "Does Rebuzzle have a mobile app?",
      answer:
        "Rebuzzle is a Progressive Web App (PWA) that works on any device. You can install it on your phone, tablet, or desktop for a native app-like experience with offline support.",
    },
  ]);

  const itemListSchema = generateItemListSchema({
    items: comparisonFeatures.map((f, i) => ({
      id: `feature-${i}`,
      title: f.feature,
    })),
    name: "Rebuzzle vs Wordle Comparison Features",
    description: "Side-by-side comparison of Rebuzzle and Wordle features",
    url: "/rebuzzle-vs-wordle",
  });

  return (
    <Layout>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema),
        }}
        type="application/ld+json"
      />

      <div className="mx-auto max-w-6xl px-4 py-3 md:px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex justify-center gap-4">
            <Puzzle className="h-12 w-12 text-purple-600" />
            <span className="text-4xl">vs</span>
            <Sparkles className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="mb-4 font-semibold text-2xl md:text-3xl">
            Rebuzzle vs Wordle: Which Puzzle Game is Better?
          </h1>
          <p className="mx-auto max-w-3xl text-muted-foreground text-sm leading-relaxed md:text-base">
            Compare Rebuzzle and Wordle side-by-side. Discover why Rebuzzle
            offers more variety, better features, and a superior puzzle-solving
            experience.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mb-12 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Rebuzzle Wins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-3xl text-purple-600">
                {rebuzzleWins}
              </div>
              <p className="text-muted-foreground text-sm">features</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tied Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-3xl text-blue-600">{ties}</div>
              <p className="text-muted-foreground text-sm">features</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Wordle Wins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-3xl text-green-600">
                {wordleWins}
              </div>
              <p className="text-muted-foreground text-sm">features</p>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Table */}
        <section className="mb-12">
          <h2 className="mb-6 font-semibold text-xl md:text-2xl">
            Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-sm">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">
                    Rebuzzle
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">
                    Wordle
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, index) => (
                  <tr className="border-b" key={index}>
                    <td className="px-4 py-3 font-medium text-sm">
                      {feature.feature}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="flex items-center justify-center gap-2">
                        {feature.winner === "rebuzzle" && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        <span>{feature.rebuzzle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="flex items-center justify-center gap-2">
                        {feature.winner === "wordle" && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        <span>{feature.wordle}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Why Choose Rebuzzle */}
        <section className="mb-12">
          <h2 className="mb-6 font-semibold text-xl md:text-2xl">
            Why Choose Rebuzzle?
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Puzzle className="h-5 w-5 text-purple-600" />
                  More Variety
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  With 7 different puzzle types, Rebuzzle offers far more
                  variety than Wordle's single word-guessing format. Challenge
                  different cognitive skills every day!
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  AI-Generated Puzzles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Every puzzle is AI-generated and unique. No pre-selected words
                  - each puzzle is crafted fresh daily with intelligent
                  difficulty calibration.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-purple-600" />
                  Progressive Hints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Stuck on a puzzle? Rebuzzle's progressive hint system guides
                  you toward the solution without spoiling the answer. Wordle
                  offers no hints.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Offline Play
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Play Rebuzzle anywhere, even without internet! Full offline
                  support means you can solve puzzles on planes, trains, or
                  anywhere else.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-8 rounded-lg border bg-muted/50 p-8 text-center">
          <h2 className="mb-4 font-semibold text-xl">Ready to Try Rebuzzle?</h2>
          <p className="mb-6 text-muted-foreground text-sm">
            Experience the ultimate Wordle alternative with more variety, better
            features, and AI-generated puzzles.
          </p>
          <Link
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
            href="/"
          >
            <Puzzle className="h-5 w-5" />
            Play Today's Puzzle
          </Link>
        </section>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            className="text-purple-600 text-sm hover:text-purple-700"
            href="/"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </Layout>
  );
}

