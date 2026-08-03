import {
  ArrowRight,
  Check,
  Eye,
  Lightbulb,
  MessageCircle,
  MousePointer2,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import { AppLink } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";
import {
  generateFAQPageSchema,
  generateHowToSchema,
  generateSpeakableSchema,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = generateStaticPageMetadata({
  title: "How to Play Rebuzzle | Decode Daily Visual Puzzles",
  description:
    "Learn how to solve Rebuzzle's daily visual word puzzles. Read pictures, notice placement, test your answer, and use progressive hints when you need a nudge.",
  url: "/how-it-works",
  keywords: [
    "how to play Rebuzzle",
    "how to solve rebus puzzles",
    "daily visual puzzle",
    "picture word puzzles",
    "rebus puzzle tips",
  ],
});

const decodingRules = [
  {
    icon: Eye,
    label: "Read what you see",
    copy: "Name every picture, word, number, and symbol. The first meaning is often only the beginning.",
    sample: "HEAD  HEELS",
    note: "Words can become objects",
  },
  {
    icon: MousePointer2,
    label: "Notice where it sits",
    copy: "Above, below, inside, outside, backwards, tiny, repeated—position is part of the sentence.",
    sample: "CYCLE  CYCLE  CYCLE",
    note: "Three cycles → tricycle",
  },
  {
    icon: MessageCircle,
    label: "Say it out loud",
    copy: "Pictures and letters may be sounds. Join them together and listen for a familiar word or phrase.",
    sample: "🐝  +  4",
    note: "Bee + four → before",
  },
] as const;

const dailySteps = [
  {
    number: "01",
    title: "Take in the whole board",
    copy: "Start with the relationship between the clues—not just each clue on its own.",
  },
  {
    number: "02",
    title: "Send your best read",
    copy: "Type the phrase you think the board represents. Close answers get useful feedback, not a dead end.",
  },
  {
    number: "03",
    title: "Ask for a nudge",
    copy: "Reveal a progressive hint when you need one. It points you toward the mechanism without giving away the answer.",
  },
  {
    number: "04",
    title: "Learn the trick",
    copy: "See the explanation, collect your score, and carry the pattern into tomorrow's puzzle.",
  },
] as const;

const fairPuzzleChecks = [
  "Every visual should be recognizable at a glance.",
  "The intended answer should explain every clue.",
  "Difficulty should come from the wordplay—not blurry artwork.",
  "Hints should narrow the path without spoiling the finish.",
] as const;

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function HowItWorksPage() {
  const howToSchema = generateHowToSchema({
    name: "How to solve a Rebuzzle puzzle",
    description: "A four-step guide to reading and solving Rebuzzle's daily visual word puzzles.",
    steps: dailySteps.map((step) => ({ name: step.title, text: step.copy })),
  });

  const faqSchema = generateFAQPageSchema([
    {
      question: "What is a rebus puzzle?",
      answer:
        "A rebus is a visual word puzzle that uses pictures, words, symbols, sounds, and placement to represent a familiar word or phrase.",
    },
    {
      question: "How do hints work in Rebuzzle?",
      answer:
        "Hints are progressive. Each hint gives a more specific nudge toward the puzzle's visual or verbal mechanism without immediately revealing the answer.",
    },
    {
      question: "Do I need special knowledge to play?",
      answer:
        "No. Start by naming what you see, noticing how the clues are arranged, and saying possible combinations aloud. Familiar language and observation do most of the work.",
    },
  ]);

  const speakableSchema = generateSpeakableSchema({
    cssSelector: ["h1", "#decode-rules", "#daily-run"],
  });

  return (
    <Layout>
      {[
        { id: "how-it-works-howto", value: howToSchema },
        { id: "how-it-works-faq", value: faqSchema },
        { id: "how-it-works-speakable", value: speakableSchema },
      ].map((schema) => (
        <script
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema.value) }}
          id={schema.id}
          key={schema.id}
          type="application/ld+json"
        />
      ))}

      <div className="overflow-hidden">
        <section className="relative mx-auto grid max-w-page gap-12 px-4 pt-14 pb-20 md:px-6 md:pt-24 md:pb-28 lg:grid-cols-[minmax(0,0.86fr)_minmax(28rem,1.14fr)] lg:items-center lg:gap-16">
          <div className="relative z-10 max-w-xl">
            <p className="eyebrow">How to play</p>
            <h1 className="mt-5 text-balance font-semibold text-[clamp(3.25rem,7vw,6.75rem)] leading-[0.88] tracking-[-0.075em]">
              See it.
              <br />
              Say it.
              <br />
              <span className="text-muted-foreground">Solve it.</span>
            </h1>
            <p className="mt-7 max-w-lg text-pretty text-lg text-muted-foreground leading-8 md:text-xl">
              Rebuzzle turns familiar words and phrases into visual clues. Your job is to work
              backwards—from what you see to the thought hiding underneath.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <AppLink
                className="group inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-5 font-medium text-background text-sm transition-transform duration-200 hover:-translate-y-0.5 focus-ring"
                href="/"
              >
                Play today&apos;s puzzle
                <ArrowRight
                  aria-hidden
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                />
              </AppLink>
              <a
                className="text-muted-foreground text-sm underline decoration-border-strong underline-offset-4 transition-colors hover:text-foreground"
                href="#decode-rules"
              >
                Learn the patterns
              </a>
            </div>
          </div>

          <div className="relative lg:py-6">
            <div
              aria-hidden
              className="absolute -inset-20 -z-10 opacity-30 blur-3xl [background:conic-gradient(from_110deg_at_50%_50%,var(--grad-develop-start),var(--grad-develop-end),var(--grad-preview-start),var(--grad-preview-end),var(--grad-ship-end),var(--grad-develop-start))] dark:opacity-20"
            />
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#090909] text-white shadow-[0_32px_80px_-32px_rgba(0,0,0,0.65)]">
              <div className="flex items-center justify-between border-white/10 border-b px-5 py-4">
                <span className="font-mono text-[11px] text-white/50 uppercase tracking-[0.18em]">
                  Practice board
                </span>
                <span className="inline-flex items-center gap-2 font-mono text-[11px] text-white/50 uppercase tracking-[0.12em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Easy read
                </span>
              </div>

              <div className="relative flex min-h-[25rem] flex-col items-center justify-center px-6 py-14 sm:px-12">
                <div
                  aria-hidden
                  className="absolute inset-x-[10%] top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(0,124,240,0.22),transparent_70%)]"
                />
                <p className="relative mb-10 text-center text-sm text-white/55">
                  What familiar phrase is pictured here?
                </p>
                <div className="relative w-full max-w-md text-center">
                  <div className="h-px w-full bg-white/35" />
                  <div className="py-7 font-semibold text-[clamp(2.7rem,8vw,5.4rem)] leading-none tracking-[-0.065em]">
                    READING
                  </div>
                  <div className="h-px w-full bg-white/35" />
                </div>
                <details className="group relative mt-12 w-full max-w-md rounded-lg border border-white/15 bg-white/[0.04] open:bg-white/[0.07]">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 [&::-webkit-details-marker]:hidden">
                    Reveal the answer
                    <span className="font-mono text-white/45 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="border-white/10 border-t px-4 py-4">
                    <p className="font-medium">Reading between the lines</p>
                    <p className="mt-1.5 text-sm text-white/55 leading-6">
                      The word READING is literally placed between two lines.
                    </p>
                  </div>
                </details>
              </div>
            </div>
            <p className="mt-4 text-center font-mono text-[10px] text-subtle uppercase tracking-[0.16em]">
              The arrangement is part of the clue
            </p>
          </div>
        </section>

        <section className="border-border border-y bg-card" id="decode-rules">
          <div className="mx-auto max-w-page px-4 py-20 md:px-6 md:py-28">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
              <div>
                <p className="eyebrow">The decoder</p>
                <h2 className="mt-4 max-w-sm text-balance font-semibold text-4xl tracking-[-0.055em] md:text-5xl">
                  The clue is more than the clue.
                </h2>
                <p className="mt-5 max-w-sm text-pretty text-muted-foreground leading-7">
                  A rebus can communicate through meaning, sound, count, direction, scale, or
                  position. Read all of them before you settle on an answer.
                </p>
              </div>

              <div className="divide-y divide-border border-border border-y">
                {decodingRules.map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <article
                      className="group grid gap-5 py-7 sm:grid-cols-[2.5rem_minmax(0,1fr)_12rem] sm:items-center sm:gap-6"
                      key={rule.label}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-inset text-muted-foreground transition-colors group-hover:border-border-strong group-hover:text-foreground">
                        <Icon aria-hidden className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg tracking-[-0.025em]">{rule.label}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground leading-6">
                          {rule.copy}
                        </p>
                      </div>
                      <div className="border-border border-l pl-5 sm:text-right">
                        <p className="whitespace-pre font-mono font-medium text-sm tracking-[0.08em]">
                          {rule.sample}
                        </p>
                        <p className="mt-1.5 text-subtle text-xs">{rule.note}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-page px-4 py-20 md:px-6 md:py-28" id="daily-run">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.72fr)] lg:gap-24">
            <div>
              <p className="eyebrow">Your daily run</p>
              <h2 className="mt-4 max-w-2xl text-balance font-semibold text-4xl tracking-[-0.055em] md:text-5xl">
                One board. A short conversation. One satisfying click.
              </h2>

              <ol className="mt-12 border-border border-t">
                {dailySteps.map((step) => (
                  <li
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 border-border border-b py-7 md:grid-cols-[5rem_minmax(0,1fr)] md:gap-8"
                    key={step.number}
                  >
                    <span className="pt-1 font-mono text-subtle text-xs tabular-nums">
                      {step.number}
                    </span>
                    <div className="grid gap-2 md:grid-cols-[minmax(10rem,0.7fr)_minmax(0,1fr)] md:gap-10">
                      <h3 className="font-semibold text-lg tracking-[-0.025em]">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-6">{step.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="lg:pt-32">
              <div className="rounded-xl border border-border bg-card p-5 shadow-lg">
                <div className="rounded-lg bg-[#0b0b0b] px-5 py-10 text-center text-white">
                  <div className="font-semibold text-3xl tracking-[-0.04em]">
                    CYCLE&nbsp; CYCLE&nbsp; CYCLE
                  </div>
                  <p className="mt-4 font-mono text-[10px] text-white/45 uppercase tracking-[0.16em]">
                    Read the count
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="ml-auto max-w-[78%] rounded-xl rounded-br-sm bg-foreground px-4 py-3 text-background text-sm">
                    Tricycle
                  </div>
                  <div className="max-w-[88%] rounded-xl rounded-bl-sm bg-inset px-4 py-3 text-sm leading-6">
                    <span className="font-medium">Exactly.</span> Three “cycles” make a tri-cycle.
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-border border-t pt-4">
                  <span className="font-mono text-[10px] text-subtle uppercase tracking-[0.14em]">
                    Solved in 1
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <Sparkles aria-hidden className="h-3.5 w-3.5" /> +100
                  </span>
                </div>
              </div>
              <p className="mt-4 px-3 text-center text-subtle text-xs leading-5">
                Guesses become a thread, so every attempt helps you refine the idea.
              </p>
            </aside>
          </div>
        </section>

        <section className="border-border border-y bg-foreground text-background">
          <div className="mx-auto grid max-w-page gap-12 px-4 py-20 md:px-6 md:py-24 lg:grid-cols-[0.75fr_1.25fr] lg:items-start lg:gap-24">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-background/20">
                <Lightbulb aria-hidden className="h-4 w-4" />
              </div>
              <h2 className="mt-7 text-balance font-semibold text-4xl tracking-[-0.055em] md:text-5xl">
                Hard is good.
                <br />
                Hazy isn&apos;t.
              </h2>
              <p className="mt-5 max-w-md text-pretty text-background/60 leading-7">
                The best puzzle makes you work, then makes perfect sense. Rebuzzle evaluates each
                board for clarity, fairness, and that unmistakable aha moment.
              </p>
            </div>

            <ul className="divide-y divide-background/15 border-background/15 border-y">
              {fairPuzzleChecks.map((check) => (
                <li className="flex items-start gap-4 py-5" key={check}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-foreground">
                    <Check aria-hidden className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <span className="text-background/75 leading-6">{check}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-page px-4 py-24 text-center md:px-6 md:py-32">
          <p className="eyebrow">Now you know the language</p>
          <h2 className="mx-auto mt-5 max-w-4xl text-balance font-semibold text-[clamp(3rem,7vw,6.25rem)] leading-[0.92] tracking-[-0.07em]">
            Today&apos;s answer is hiding in plain sight.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-muted-foreground leading-7">
            Look closely, trust the wordplay, and send the answer that makes everything click.
          </p>
          <AppLink
            className="group mx-auto mt-9 inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-6 font-medium text-background transition-transform duration-200 hover:-translate-y-0.5 focus-ring"
            href="/"
          >
            Start today&apos;s Rebuzzle
            <ArrowRight
              aria-hidden
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            />
          </AppLink>
        </section>
      </div>
    </Layout>
  );
}
