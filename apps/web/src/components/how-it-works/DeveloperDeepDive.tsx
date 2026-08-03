import { HowItWorksFeedbackForm } from "@/components/how-it-works/FeedbackForm";

const toc = [
  { href: "#system-map", label: "System map" },
  { href: "#apex-eve", label: "Apex & Eve" },
  { href: "#publish-gates", label: "Publish gates" },
  { href: "#pictograms", label: "Pictograms" },
  { href: "#play-loop", label: "Play-loop AI" },
  { href: "#learning", label: "Self-learning" },
  { href: "#daily-ops", label: "Daily ops" },
  { href: "#discovery", label: "Discovery" },
  { href: "#open-source", label: "Open source" },
  { href: "#feedback", label: "Feedback" },
] as const;

const systemPieces = [
  {
    name: "Master orchestrator",
    path: "ai/services/master-puzzle-orchestrator.ts",
    why: "Chooses Apex tournament vs classic Eve ToolLoop and returns a single publishable candidate or a reserve fallback.",
  },
  {
    name: "Apex engine",
    path: "ai/puzzle-agent/apex/engine.ts",
    why: "Multi-candidate contest: curriculum → answer-first seeds → Eve slots → critique/repair → player sim → rubric → finalist.",
  },
  {
    name: "Eve ToolLoop",
    path: "ai/puzzle-agent/run-generation.ts",
    why: "Tool-using agent that proposes boards, visuals, and explanations under a difficulty band.",
  },
  {
    name: "Vercel AI Gateway",
    path: "AI_PROVIDER / AI_GATEWAY_API_KEY",
    why: "Model routing for generation, critique, embeddings, and quips without baking a single vendor into the app.",
  },
] as const;

const gateSteps = [
  {
    title: "Cue-plan preflight",
    detail:
      "Deterministic check that every answer-seed cue is represented before we spend on judges.",
  },
  {
    title: "Semantic alignment",
    detail:
      "semantic-alignment-v1 rejects boards where the visual story cannot plausibly land on the intended phrase.",
  },
  {
    title: "Asset & recognition",
    detail:
      "Pictogram integrity, clarity, and multi-model recognition consensus so icons read at play size—not just in a design tool.",
  },
  {
    title: "Blind solve / player sim",
    detail:
      "Independent solvers attempt the board without the answer. If they cannot converge, it does not ship.",
  },
  {
    title: "Publish rubric",
    detail:
      "evaluatePublishGates enforces leak checks, technique coverage, uniqueness, difficulty band, and funScore thresholds.",
  },
  {
    title: "Human calibration",
    detail:
      "Quarantined or edge candidates can require human playtest / icon naming evidence before the quarantine bit clears.",
  },
] as const;

const playLoop = [
  {
    title: "Authoritative guesses",
    detail:
      "POST /api/puzzles/guess is the only scorer. The active board never ships the answer; the DB is the source of truth.",
  },
  {
    title: "Lenient validation",
    detail:
      "validateAnswer combines fuzzy string distance, contraction maps, and word-order tolerance so near-misses feel fair.",
  },
  {
    title: "Reaction tiers",
    detail:
      "Instant feedback: correct · close (≥70) · warm (≥40) · cold · out. Built in lib/game/reactions.ts for a snappy first beat.",
  },
  {
    title: "Eve quips",
    detail:
      "POST /api/puzzles/quip streams a short riff. The model is never told the answer—only the guess and tier—so it cannot spoil.",
  },
] as const;

const learningSignals = [
  {
    title: "Difficulty perception",
    detail:
      "Post-solve Too easy / Just right / Brutal votes hit /api/puzzles/difficulty-feedback and feed AIFeedback.",
  },
  {
    title: "Quality ratings",
    detail: "Like/dislike + reason tags via /api/puzzles/rating steer puzzle_quality learning.",
  },
  {
    title: "Adaptive difficulty",
    detail:
      "Learning calibration adjusts the daily band (Hard → Impossible) from recent play and rejection digests—not vibes alone.",
  },
  {
    title: "Local midnight unlock",
    detail:
      "One puzzle document per YYYY-MM-DD publication key; each player unlocks at their local midnight so the habit matches the calendar.",
  },
] as const;

const cronRows = [
  {
    when: "00:00 UTC",
    what: "generate-puzzles → daily-content workflow (today + tomorrow pre-gen)",
  },
  { when: "08:00 UTC", what: "send-blog-emails" },
  { when: "16:00 UTC", what: "send-notifications (puzzle-ready)" },
  { when: "20:00 UTC", what: "generate-blog PR + streak-reminder" },
] as const;

export function DeveloperDeepDive() {
  return (
    <div className="border-border border-t" id="under-the-hood">
      <section className="bg-card">
        <div className="mx-auto max-w-page px-4 py-20 md:px-6 md:py-28">
          <p className="eyebrow">Under the hood</p>
          <h2 className="mt-4 max-w-3xl text-balance font-semibold text-4xl tracking-[-0.055em] md:text-5xl">
            Built for players. Documented for builders.
          </h2>
          <p className="mt-5 max-w-2xl text-pretty text-muted-foreground leading-7">
            Rebuzzle is open source. Below is how the AI systems actually work—what each piece is
            for, why it exists, and where to look in the repo if you want to fork, critique, or
            contribute.
          </p>

          <nav aria-label="Technical topics" className="mt-10">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 border-border border-y py-4 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
              {toc.map((item) => (
                <li key={item.href}>
                  <a className="transition-colors hover:text-foreground" href={item.href}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20" id="system-map">
        <p className="eyebrow">Architecture</p>
        <h3 className="mt-3 font-semibold text-3xl tracking-[-0.04em]">System map</h3>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground leading-6">
          Generation is fail-closed: if evidence is thin, we fall back to a curated reserve rather
          than ship a weak board. Paths below live under{" "}
          <code className="font-mono text-xs">apps/web/src/</code>.
        </p>
        <div className="mt-10 divide-y divide-border border-border border-y">
          {systemPieces.map((piece) => (
            <article
              className="grid gap-2 py-6 md:grid-cols-[minmax(10rem,0.35fr)_minmax(0,1fr)] md:gap-10"
              key={piece.name}
            >
              <div>
                <h4 className="font-semibold tracking-[-0.02em]">{piece.name}</h4>
                <p className="mt-1 font-mono text-[11px] text-subtle break-all">{piece.path}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-6">{piece.why}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-border border-y bg-inset/40" id="apex-eve">
        <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
          <p className="eyebrow">Generators</p>
          <h3 className="mt-3 font-semibold text-3xl tracking-[-0.04em]">
            Apex tournament &amp; Eve
          </h3>
          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            <div>
              <h4 className="font-semibold text-lg tracking-[-0.02em]">Why Apex exists</h4>
              <p className="mt-3 text-sm text-muted-foreground leading-6">
                A single model draft is optimistic. Apex runs a short tournament so we pick the
                board that survives critique, blind solve pressure, and a rubric—not the first
                fluent JSON blob. Curriculum + answer-first seeds force technique coverage and stop
                “pretty but unmoored” rebus art.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-lg tracking-[-0.02em]">Why Eve still matters</h4>
              <p className="mt-3 text-sm text-muted-foreground leading-6">
                Eve is the tool-loop workhorse inside each slot: proposing displays, calling visual
                tools, writing explanations and progressive hints. Apex orchestrates; Eve crafts.
                Difficulty bands (Hard → Impossible) constrain how far wordplay can stretch.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20" id="publish-gates">
        <p className="eyebrow">Quality contract</p>
        <h3 className="mt-3 font-semibold text-3xl tracking-[-0.04em]">Publish gates</h3>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground leading-6">
          Shipping a daily puzzle is a privilege. Gates exist so “hard” never means “illegible” or
          “the answer leaked in the art.”
        </p>
        <ol className="mt-10 border-border border-t">
          {gateSteps.map((step, index) => (
            <li
              className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-border border-b py-6 md:grid-cols-[4.5rem_minmax(12rem,0.45fr)_minmax(0,1fr)] md:gap-8"
              key={step.title}
            >
              <span className="pt-0.5 font-mono text-subtle text-xs tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h4 className="font-semibold tracking-[-0.02em]">{step.title}</h4>
              <p className="text-sm text-muted-foreground leading-6 md:col-start-3">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-border border-y bg-card" id="pictograms">
        <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
          <p className="eyebrow">Visual stack</p>
          <h3 className="mt-3 font-semibold text-3xl tracking-[-0.04em]">Pictograms</h3>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground leading-6">
            Boards prefer catalog-grounded icons (and carefully vetted generated paths) over
            decorative noise. We rasterize at play sizes, run pixel-integrity checks, and require
            recognition consensus before a symbol is publication-eligible. Third-party Material
            Symbol subsets are Apache-2.0 vendored and documented in{" "}
            <code className="font-mono text-xs">docs/THIRD_PARTY_PICTOGRAMS.md</code>.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20" id="play-loop">
        <p className="eyebrow">In session</p>
        <h3 className="mt-3 font-semibold text-3xl tracking-[-0.04em]">Play-loop AI</h3>
        <div className="mt-10 divide-y divide-border border-border border-y">
          {playLoop.map((item) => (
            <article
              className="grid gap-2 py-6 md:grid-cols-[minmax(10rem,0.35fr)_minmax(0,1fr)] md:gap-10"
              key={item.title}
            >
              <h4 className="font-semibold tracking-[-0.02em]">{item.title}</h4>
              <p className="text-sm text-muted-foreground leading-6">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-border border-y bg-inset/40" id="learning">
        <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
          <p className="eyebrow">Closed loop</p>
          <h3 className="mt-3 font-semibold text-3xl tracking-[-0.04em]">Self-learning signals</h3>
          <div className="mt-10 divide-y divide-border border-border border-y">
            {learningSignals.map((item) => (
              <article
                className="grid gap-2 py-6 md:grid-cols-[minmax(10rem,0.35fr)_minmax(0,1fr)] md:gap-10"
                key={item.title}
              >
                <h4 className="font-semibold tracking-[-0.02em]">{item.title}</h4>
                <p className="text-sm text-muted-foreground leading-6">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20" id="daily-ops">
        <p className="eyebrow">Operations</p>
        <h3 className="mt-3 font-semibold text-3xl tracking-[-0.04em]">Daily content workflow</h3>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground leading-6">
          Cron jobs (see root <code className="font-mono text-xs">vercel.json</code>) drive{" "}
          <code className="font-mono text-xs">/api/workflows/daily-content</code>: calibrate →
          publish today → pre-generate tomorrow → open a draft blog PR for yesterday. Blog posts are
          human-merged before they go live (
          <code className="font-mono text-xs">docs/AI_BLOG_PULL_REQUESTS.md</code>).
        </p>
        <div className="mt-10 divide-y divide-border border-border border-y">
          {cronRows.map((row) => (
            <div
              className="grid gap-2 py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-8"
              key={row.when}
            >
              <span className="font-mono text-xs text-subtle tabular-nums">{row.when}</span>
              <span className="text-sm text-muted-foreground leading-6">{row.what}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-border border-y bg-card" id="discovery">
        <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
          <p className="eyebrow">Beyond today</p>
          <h3 className="mt-3 font-semibold text-3xl tracking-[-0.04em]">Discovery AI</h3>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground leading-6">
            Puzzle embeddings (Gateway / Gemini embedding model) power semantic search and
            recommendations mixed with category affinity, difficulty fit, and novelty. Useful for
            archive play and “more like this”—not for spoiling tomorrow.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20" id="open-source">
        <p className="eyebrow">Contribute</p>
        <h3 className="mt-3 font-semibold text-3xl tracking-[-0.04em]">Open source notes</h3>
        <ul className="mt-8 list-disc space-y-3 pl-5 text-sm text-muted-foreground leading-6">
          <li>
            Monorepo: <code className="font-mono text-xs">apps/web</code> (Next.js), shared{" "}
            <code className="font-mono text-xs">packages/game-logic</code> &amp;{" "}
            <code className="font-mono text-xs">packages/config</code>.
          </li>
          <li>
            Deeper writeups: <code className="font-mono text-xs">apps/web/docs/</code> (generator
            v2, difficulty, blog PRs, pictogram licensing).
          </li>
          <li>
            Security reports go through <code className="font-mono text-xs">SECURITY.md</code>—not
            the public feedback form.
          </li>
          <li>
            PRs welcome for gates, docs, UX, and tests. See root{" "}
            <code className="font-mono text-xs">CONTRIBUTING.md</code>.
          </li>
        </ul>
      </section>

      <section className="border-border border-t bg-foreground text-background" id="feedback">
        <div className="mx-auto grid max-w-page gap-12 px-4 py-20 md:px-6 md:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="font-mono text-[11px] text-background/50 uppercase tracking-[0.18em]">
              Feedback
            </p>
            <h3 className="mt-4 text-balance font-semibold text-3xl tracking-[-0.04em] md:text-4xl">
              Tell us what we got wrong—or what to build next.
            </h3>
            <p className="mt-5 max-w-md text-pretty text-background/60 leading-7">
              Developers, players, and puzzle pedants welcome. Notes about gates, model choices,
              docs gaps, or product feel all help. Optional email if you want a reply.
            </p>
          </div>
          <div className="rounded-xl border border-background/15 bg-background p-6 text-foreground md:p-8">
            <HowItWorksFeedbackForm />
          </div>
        </div>
      </section>
    </div>
  );
}
