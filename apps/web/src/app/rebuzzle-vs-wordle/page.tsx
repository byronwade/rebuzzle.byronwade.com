import { Check, Lightbulb, Puzzle, Sparkles, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { AppLink as Link } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serializeJsonLd } from "@/lib/seo/json-ld";
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
      feature: "Puzzle types",
      rebuzzle:
        "7 types (rebus, logic grid, cryptic crossword, number sequence, pattern recognition, Caesar cipher, trivia)",
      wordle: "1 type (5-letter word guessing)",
      winner: "rebuzzle",
    },
    {
      feature: "Daily puzzles",
      rebuzzle: "Yes, AI-generated unique puzzles",
      wordle: "Yes, one word per day",
      winner: "tie",
    },
    {
      feature: "Cost",
      rebuzzle: "100% free, no ads or subscriptions",
      wordle: "Free (owned by NYT)",
      winner: "tie",
    },
    {
      feature: "Mobile app",
      rebuzzle: "Installable web app (PWA) on any device",
      wordle: "Mobile app available",
      winner: "tie",
    },
    {
      feature: "Hints",
      rebuzzle: "Progressive hint system with multiple levels",
      wordle: "No hints available",
      winner: "rebuzzle",
    },
    {
      feature: "Skills trained",
      rebuzzle: "Logic, pattern recognition, vocabulary, and more",
      wordle: "Vocabulary building",
      winner: "rebuzzle",
    },
    {
      feature: "Offline play",
      rebuzzle: "Yes, full offline support",
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
      feature: "AI-generated",
      rebuzzle: "Yes, unique puzzles every day",
      wordle: "Pre-selected words",
      winner: "rebuzzle",
    },
    {
      feature: "Difficulty",
      rebuzzle: "Adaptive difficulty (5–10 scale)",
      wordle: "Single difficulty",
      winner: "rebuzzle",
    },
  ];

  const rebuzzleWins = comparisonFeatures.filter((f) => f.winner === "rebuzzle").length;
  const wordleWins = comparisonFeatures.filter((f) => f.winner === "wordle").length;
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
        "Rebuzzle offers more variety with 7 different puzzle types compared to Wordle’s single word-guessing format. While both are free, Rebuzzle provides progressive hints, offline play, and AI-generated unique puzzles daily.",
    },
    {
      question: "Can I play Rebuzzle if I like Wordle?",
      answer:
        "Absolutely! If you enjoy Wordle’s daily challenge format, you’ll love Rebuzzle. It offers the same daily ritual but with more puzzle variety, including rebus puzzles, logic grids, cryptic crosswords, and more.",
    },
    {
      question: "Is Rebuzzle free like Wordle?",
      answer:
        "Yes! Rebuzzle is 100% free with no ads and no subscriptions. It’s completely free to play, just like Wordle.",
    },
    {
      question: "What makes Rebuzzle different from Wordle?",
      answer:
        "Rebuzzle offers 7 puzzle types (rebus, logic grid, cryptic crossword, number sequence, pattern recognition, Caesar cipher, trivia) compared to Wordle’s single word-guessing format. Rebuzzle also features progressive hints, offline play, and AI-generated unique puzzles.",
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
          __html: serializeJsonLd(breadcrumbSchema),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(faqSchema),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(itemListSchema),
        }}
        type="application/ld+json"
      />

      <div className="mx-auto max-w-page px-4 py-14 md:px-6 md:py-20">
        {/* Header */}
        <header className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Comparison</p>
          <h1 className="mt-4 text-balance font-semibold text-4xl tracking-[-0.045em] md:text-5xl">
            Rebuzzle vs Wordle.
          </h1>
          <p className="mt-5 text-balance text-lg text-muted-foreground leading-8">
            Same daily ritual, seven puzzle types instead of one. Here’s the side-by-side.
          </p>
        </header>

        {/* Quick Stats — one hairline-divided row, mono numerals */}
        <div className="mt-14 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-card">
          {[
            { label: "Rebuzzle wins", value: rebuzzleWins },
            { label: "Tied", value: ties },
            { label: "Wordle wins", value: wordleWins },
          ].map((stat) => (
            <div className="px-3 py-5 text-center sm:px-6 sm:py-7" key={stat.label}>
              <div className="font-semibold text-3xl sm:text-4xl text-foreground tracking-[-0.045em] tabular-nums">
                {stat.value}
              </div>
              <p className="mt-2 font-medium text-xs text-subtle">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <section className="mt-20">
          <h2 className="font-semibold text-2xl tracking-[-0.04em] md:text-[32px]">
            Feature comparison
          </h2>
          {/* Phones: one card per feature, so the Wordle column never scrolls out of view */}
          <dl className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:hidden">
            {comparisonFeatures.map((feature) => (
              <div className="px-4 py-4" key={feature.feature}>
                <dt className="font-medium text-foreground text-sm">{feature.feature}</dt>
                {(["rebuzzle", "wordle"] as const).map((side) => (
                  <dd
                    className={`mt-2 grid grid-cols-[4.5rem_1fr] gap-2 text-sm ${
                      feature.winner === side
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    }`}
                    key={side}
                  >
                    <span className="font-medium text-subtle text-xs leading-5">
                      {side === "rebuzzle" ? "Rebuzzle" : "Wordle"}
                    </span>
                    <span className="flex items-start gap-2">
                      <Check
                        aria-label={feature.winner === side ? "Better" : undefined}
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                          feature.winner === side ? "text-success" : "invisible"
                        }`}
                      />
                      <span>{feature[side]}</span>
                    </span>
                  </dd>
                ))}
              </div>
            ))}
          </dl>
          <div
            aria-label="Feature comparison table"
            className="mt-6 hidden overflow-x-auto rounded-xl border border-border focus-ring sm:block"
            role="region"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: lets keyboard users scroll the table sideways on phones
            tabIndex={0}
          >
            <table className="w-full min-w-[36rem] table-fixed border-collapse">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[44%]" />
                <col className="w-[32%]" />
              </colgroup>
              <thead>
                <tr className="border-border border-b bg-inset">
                  <th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">
                    Feature
                  </th>
                  {/* Indented past the check slot so the label lines up with the values */}
                  <th className="py-2.5 pr-4 pl-[2.375rem] text-left font-medium text-xs text-muted-foreground">
                    Rebuzzle
                  </th>
                  {/* Indented past the check slot so the label lines up with the values */}
                  <th className="py-2.5 pr-4 pl-[2.375rem] text-left font-medium text-xs text-muted-foreground">
                    Wordle
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {comparisonFeatures.map((feature) => (
                  <tr className="border-border border-b last:border-b-0" key={feature.feature}>
                    <td className="px-4 py-3 align-top font-medium text-foreground text-sm">
                      {feature.feature}
                    </td>
                    <td
                      className={`px-4 py-3 align-top text-sm ${
                        feature.winner === "rebuzzle"
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Check
                          aria-label={feature.winner === "rebuzzle" ? "Better" : undefined}
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            feature.winner === "rebuzzle" ? "text-success" : "invisible"
                          }`}
                        />
                        <span>{feature.rebuzzle}</span>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 align-top text-sm ${
                        feature.winner === "wordle"
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Check
                          aria-label={feature.winner === "wordle" ? "Better" : undefined}
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            feature.winner === "wordle" ? "text-success" : "invisible"
                          }`}
                        />
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
        <section className="mt-20">
          <h2 className="font-semibold text-2xl tracking-[-0.04em] md:text-[32px]">
            Why choose Rebuzzle
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                icon: Puzzle,
                title: "More variety",
                body: "Seven puzzle types against Wordle’s single word-guessing format. A different cognitive skill every day.",
              },
              {
                icon: Sparkles,
                title: "AI-generated puzzles",
                body: "No pre-selected word list. Each puzzle is written fresh daily with difficulty calibrated against real solve data.",
              },
              {
                icon: Lightbulb,
                title: "Progressive hints",
                body: "Stuck? The hint ladder walks you toward the solution without spoiling it. Wordle offers no hints at all.",
              },
              {
                icon: WifiOff,
                title: "Offline play",
                body: "Installable as a PWA with full offline support — solve on planes, trains, or anywhere with no signal.",
              },
            ].map((item) => (
              <Card key={item.title} variant="raised">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-subtle" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-6">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA — the page's one polarity-flipped band */}
        <section className="mt-20 overflow-hidden rounded-xl bg-foreground px-6 py-14 text-center text-background">
          <h2 className="text-balance font-semibold text-3xl tracking-[-0.04em]">
            Ready to try Rebuzzle?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-balance text-background/60 text-sm leading-6">
            One puzzle a day. Free, no ads, no subscription.
          </p>
          <Link
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-pill bg-background px-6 font-medium text-[15px] text-foreground transition-opacity hover:opacity-90"
            href="/"
          >
            <Puzzle className="h-4 w-4" />
            Play today’s puzzle
          </Link>
        </section>
      </div>
    </Layout>
  );
}
