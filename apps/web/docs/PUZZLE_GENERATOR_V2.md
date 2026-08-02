# Rebuzzle Generator V2: Recognition-First Architecture

## Objective

Generate daily rebus puzzles that are recognizable, fair, novel, and delightful at the size and layout players actually see. A puzzle is not publishable because the generator intended to draw a car; it is publishable only when independent observers can identify the rendered car and the complete rendered board supports one fair solution.

## Audit finding

The current Apex/Eve pipeline already has strong conceptual machinery: multiple candidates, named techniques, uniqueness checks, difficulty calibration, adversarial critique, simulated players, and a tournament rubric. Its critical blind spot is visual evidence.

Generated SVGs are currently checked mainly through markup heuristics such as shape count, strokes, and palette. Blind recognition receives SVG source text rather than rendered pixels. Apex critique receives the declared pictogram concepts and Unicode fallback rather than the visual shown to the player. As a result, a structurally valid SVG can be scored as a recognizable “car” even when its rendered silhouette does not resemble one.

## Non-negotiable publish contract

A candidate may publish only when all of these are true:

1. Every visual object passes blind recognition from rendered pixels at production size.
2. The full rendered board passes visual integrity checks at large and compact breakpoints.
3. Blind solver evaluations see only the rendered board, not the answer, declared icon labels, explanation, or generation intent.
4. Every required independent judge must rank the intended answer first and above the strongest alternate in every production presentation; one agreeing judge cannot mask another judge's materially different reading, and lower-ranked mentions receive no solve credit.
5. Difficulty is calibrated against human outcomes for the exact technique family, not just an LLM estimate.
6. Novelty is measured across answer, mechanism, visual topology, and cue combination.
7. Quality-evaluator failures are fail-closed. A deterministic fallback puzzle is preferable to an unverified generated puzzle.

## Target deep module

Expose one generation interface:

```ts
generatePublishablePuzzle(brief): Promise<PublishablePuzzle>
```

The implementation owns these internal stages:

```text
curriculum brief
  -> concept candidates
  -> grounded visual plan
  -> asset resolution
  -> production-size render
  -> object recognition gate
  -> board perception gate
  -> blind solve tournament
  -> human-calibrated quality gate
  -> archive registration
```

Callers should not coordinate individual validators or know retry rules. The generation module should return a publishable puzzle with evidence, or a typed rejection report.

## Visual asset strategy

Use a three-tier resolver in this order:

### Tier 1: vetted local icon catalog

Common nouns should resolve to a reviewed, versioned local SVG asset. Lucide is already used by the product and provides a consistent ISC-licensed icon system. Each catalog entry should include aliases, forbidden confusions, required visual features, player-size recognition results, and an asset version.

This is the default for objects such as car, key, eye, clock, house, plane, book, and umbrella. These objects should not be redrawn by an LLM every day.

### Tier 2: approved generated asset cache

Long-tail concrete nouns may use a generated vector, but generation happens offline or ahead of publication. Produce several variants, test rendered pixels, retain the winner in a reviewed asset registry, and reuse it by stable concept ID. Recraft's current vector models are a strong candidate for this lane because they are designed for production vector output; the existing Vercel AI Gateway can remain the model seam.

### Tier 3: scene illustration

Use a raster image only when the mechanism genuinely requires a scene or relationship that a single icon cannot express. Scene tiles must pass the same rendered recognition and board-solve gates. They should be exceptional, not a fallback for weak grounding.

## Recognition gate

For each object:

1. Sanitize the SVG.
2. Render it at the real 72px player size; test the compact 36px presentation as well.
3. Enlarge those pixels without adding detail for evaluator compatibility.
4. Ask at least two independent vision models to name the object without revealing its intended concept.
5. Require semantic agreement, sufficient confidence, and no high-probability conflicting reading.
6. On failure, select a vetted asset, redraw from specific feedback, substitute a more concrete cue, or reject the candidate.

Structural SVG heuristics remain useful for security and craft, but they are not semantic-recognition evidence.

## Whole-board gate

Object recognition alone is insufficient. Render the same component used by the game at 375px, 768px, and 1280px widths and evaluate screenshots for:

- clipped, overlapping, or tiny cues;
- spatial relationships surviving flex wrapping;
- typography and strike/stack/overlay semantics;
- unintended answer leakage;
- object order and operator clarity;
- alternate readings introduced by layout;
- accessibility fallback matching the visual meaning without exposing the answer.

The current `flex-wrap` row renderer can change visual topology across widths, so generation must either lock a composition grid or validate each responsive state.

## Blind solve tournament

The solver should receive only a screenshot first. Run independent attempts that produce:

- literal inventory of visible objects/text;
- perceived spatial and typographic relationships;
- top three answer hypotheses with confidence;
- cue-to-answer mapping;
- ambiguity and missing-cue report.

Only after that first pass should hints be introduced one at a time. Do not reveal declared pictogram concepts, answer, explanation, or technique ID to the solver. A candidate fails when judges can “solve” only after seeing generator metadata.

VLM solve rate is a screening signal, not ground truth. Published research shows that current models still struggle sharply on difficult rebuses, so final difficulty and fairness must be calibrated against player telemetry and periodic human panels.

## Human benchmark and metrics

Build a versioned benchmark with at least:

- 150 vetted positive puzzles across every supported technique and difficulty tier;
- 100 known failures, including wrong-object, ambiguous-object, responsive-layout, answer-leak, cliché, and unfair-hint cases;
- dedicated icon naming sets at 36px and 72px;
- alternate-answer annotations;
- demographic and device slices where enough data exists.

Track:

| Metric | Initial release gate | Market-leading target |
| --- | ---: | ---: |
| Common-icon top-1 human naming | 90% | 97%+ |
| Generated-icon top-1 human naming | 80% | 92%+ |
| Board visual integrity | 98% | 99.8%+ |
| Unhinted solve rate by tier | calibrated band | stable within ±5 points |
| “Unfair / unrecognizable” reports | <3% | <1% |
| Material alternate-answer rate | <5% | <2% |
| Repeated answer/mechanism in lookback | 0 | 0 |

Thresholds must be recalibrated from real data rather than treated as permanent constants.

## Delivery stages

### Current implementation status

The first implementation slice now includes:

- a 98-concept publication catalog selected from 118 local Lucide-backed candidates, with 20 benchmark-failing assets quarantined behind exact provenance checks until replacements pass;
- catalog-first resolution before long-tail SVG generation;
- 36px and 72px rasterization so evaluators see compact and large player-level detail;
- two independent blind vision judges at every icon size;
- one shared presentation specification used by the React player and server renderer;
- independent board perception at compact 320px, mobile 375px, and desktop 768px;
- screenshot-only solve tournaments across every production profile, separated from answer-aware hint review;
- rank-aware two-judge solve consensus that requires the intended answer to be top-ranked and dominant for every judge in every profile;
- an independent answer-aware screenshot rejection lane for missing cues, answer leakage, wrong objects, unreadability, broken layout, and stronger alternate answers;
- fail-closed behavior for unavailable recognition/solve judges;
- fail-closed master generation: Apex rejection can no longer fall through to a less-verified Eve result, and explicitly selected Eve generation must pass the same screenshot playability gates;
- hard rejection of low-recognition, revise, unfair-hint, and below-rubric Apex candidates;
- persisted per-size and per-profile model, confidence, vote, and wrapping evidence;
- a frozen 196-specimen publication icon evaluator corpus producing 392 required decisions, plus an opt-in diagnostic lane for quarantined candidates;
- an admin-only blind human naming panel for all 196 publication catalog/size specimens, with opaque fixture IDs and browser payloads that contain no concept, alias, asset ID, or correctness signal;
- immutable one-response-per-reviewer/specimen storage, reviewer-specific randomized order, private no-store transport, and results withheld until that reviewer completes the full panel;
- separate human release (90%) and market-leading (97%) top-1 gates at both 36px and 72px, requiring at least three independent reviewers for every specimen;
- a per-specimen two-of-three hard floor so a single unusable icon cannot hide behind a strong catalog average, plus weakest-concept and semantic-confusion reports for replacement decisions;
- a versioned generated-pictogram registry for long-tail concepts that are not covered by the curated catalog;
- one pending generated candidate per normalized concept, immutable blind reviews, and unanimous three-reviewer approval at both 36px and 72px before an asset can be reused;
- exact SVG hash and sanitization checks plus current two-size recognition on every approved-cache retrieval, with automatic quarantine and append-only audit history when integrity or recognition regresses;
- an admin-only generated-asset panel whose queue payload contains no concept, aliases, candidate ID, or correctness, and whose reports reveal a candidate only after that reviewer has completed both sizes;
- automatic shadow sampling of every successfully persisted AI-generated rebus board into a versioned blind human playtest registry;
- one responsive screenshot per reviewer/puzzle, least-covered profile assignment across compact 320px, mobile 375px, and desktop 768px, and three independent reviewers required for every profile before a candidate is complete;
- immutable screenshot-only solve decisions with confidence, elapsed time, and explicit unrecognizable-artwork, unreadable-layout, missing-cue, multiple-answer, too-hard, or other failure attribution;
- difficulty-adjusted human solve floors plus release and market-leading gates for sample size, candidate pass rate, ambiguity, visual failures, high-confidence wrong answers, responsive solve-rate drift, and calibration error between automated and observed solve rates;
- a frozen 24-puzzle editorial solve corpus producing 72 multi-profile solve decisions;
- a paired editorial seed corpus with those 24 known-good boards plus 12 deliberately broken boards covering all six current failure classes;
- separate automated-gate and market-readiness results, so a green evaluator cannot be mistaken for a sufficiently large human-calibrated corpus;
- absolute promotion gates plus baseline-regression checks for evaluator/model changes;
- persisted blind rank, responsive-profile, alternate-confidence, and answer-aware editorial evidence on every published puzzle;
- a fail-closed structural novelty ledger over the full answer archive and a 90-day composition lookback;
- canonical signatures for mechanism family, exact mechanism, visual topology, cue combination, and ordered cues, built from the actual `PuzzleVisual` layers rather than emoji-only fallback text;
- rejection of exact answer reuse, repeated structural compositions, 88%+ structural similarity, a third mechanism-family use in seven days, and a fourth topology use in seven days;
- persisted and indexed novelty evidence so every publication can be audited and archive patterns can be queried without recomputing old boards;
- a 69-puzzle, catalog-grounded reserve corpus for degraded service, kept disjoint from evaluator holdouts and validated for unique answers, valid visual schemas, answer leakage, catalog provenance, and duplicate structural compositions;
- archive-aware reserve selection that applies the same answer, mechanism, topology, and cue novelty contract as AI output and fails closed instead of recycling after exhaustion;
- removal of the emergency duplicate-answer bypass from every persistence path;
- database-level partial unique locks for new answer keys and UTC publication dates, closing concurrent generation races without pretending legacy rows have already been audited;
- a versioned 7-day/28-day quality SLO report using Wilson binomial intervals for unrecognizable, ambiguous/unfair, dislike, and generation-failure signals;
- a multi-window circuit breaker that moves daily publication to the validated reserve only when both fast and slow windows confirm a severe budget burn, while sparse or one-window evidence remains watch/degraded;
- operational generation thresholds calibrated to daily generation cadence instead of incorrectly requiring player-feedback sample volumes;
- strict telemetry loading for the admin health surface, so a database outage is reported as unavailable rather than silently converted into an empty healthy window;
- circuit-breaker reserve audits that are excluded from generation-attempt denominators, allowing automatic recovery instead of creating a self-sustaining failure latch;
- structured player dislike reasons for unrecognizable, ambiguous, unfair, boring, hint, and difficulty failures, fed back into generation guidance;
- deterministic tests for catalog authenticity, spoof resistance, responsive rendering, recognition consensus, board consensus, benchmark promotion, and blind solve scoring.
- a pinned external-corpus importer, row-level rights/answer review gate, non-overwriting review template, and screenshot-only external evaluator benchmark that cannot feed public puzzle content back into generation.
- an admin-only benchmark review queue with immutable fixture metadata, optimistic concurrency, append-only decision history, readiness coverage, and evaluator-compatible review export.

Live vision-model and human benchmark calibration still require configured AI Gateway credentials and real player/panel samples. The automated gates are implemented; their thresholds are provisional until calibrated.

The structural novelty policy is intentionally independent of answer wording. A candidate with a new answer can still fail when it reuses the same technique, layout, layer topology, and ordered cues. Reordered cues retain a strong similarity penalty but are not treated as an exact duplicate when order materially changes the rebus. Catalog aliases such as `car` and `automobile` resolve to one canonical cue before comparison. Archive read failures stop publication instead of silently declaring a puzzle unique.

Degraded service is part of the publication contract rather than an exception to it. The reserve selector loads the complete answer archive and one 90-day structural snapshot, then deterministically chooses an unused board that passes current novelty limits. A deterministic simulation proves 30 consecutive reserve days without answer reuse or mechanism/topology fatigue. If the database cannot prove archive state, every reserve answer is spent, or all remaining boards are structurally stale, publication fails rather than serving a repeated or unverified puzzle.

### Longitudinal quality circuit breaker

Per-puzzle gates prevent an individual bad candidate from publishing; the longitudinal breaker detects a generator or evaluator that has drifted while still passing those gates. The admin generation-health response now includes contract `quality-slo-v1`, with 7-day and 28-day windows, observed rates, 95% Wilson intervals, quality-budget burn, evidence sufficiency, and one of `healthy`, `watch`, `degraded`, or `critical` for each metric.

The current provisional SLOs are 1% player-reported unrecognizable, 2% ambiguous or unfair, 20% dislike, and 5% attempted-generation failure/fallback. A player metric needs at least 20 fast-window or 50 slow-window votes; generation health uses 5 and 14 attempts because production generation is approximately daily. A critical halt requires statistically confirmed breaches in both windows, at least three/five player events (two/three generation events), at least 4x fast burn, and at least 2x slow burn. Slow-only or lower-burn confirmed drift blocks evaluator/model promotion and triggers review, but does not replace a potentially good AI puzzle with reserve content.

When any metric is critical, the daily generation action does not call the AI generator. It persists an unused, catalog-grounded reserve puzzle through the same novelty archive and publication locks, records the reason, and reevaluates the rolling windows on the next generation opportunity. Circuit-open reserve days are not counted as failed AI attempts because no AI attempt occurred. If quality telemetry itself is unavailable, the health endpoint fails visibly; the generation path logs the monitoring loss and retains all candidate-level fail-closed recognition, solve, editorial, novelty, and persistence gates.

These constants are launch safeguards, not permanent statistical truth. Recalibrate them with sufficient human panel and production samples, segment by technique/device when sample sizes permit, and preserve the frozen benchmark as a separate promotion gate.

### Blind human icon calibration

The automated vision benchmark is a screening gate, not proof that players recognize the artwork. Administrators can now run the human naming panel at `/admin/icon-recognition`. It presents each of the 98 publication-eligible assets once at 36px and once at 72px, for 196 blind specimens per reviewer. The browser receives only an opaque fixture ID, exact-size sanitized SVG, and size; intended concepts, aliases, catalog asset IDs, scoring, and aggregate results remain server-side. Twenty additional candidate assets remain quarantined and can be included only in diagnostic benchmark runs with `--include-quarantined`; generation cannot use them until a versioned replacement passes.

Responses are immutable and uniquely locked by contract, catalog version, fixture, and reviewer. “I don't know” is a scored recognition failure, not a skip. Exact reviewed aliases such as `automobile` for `car` are accepted after stripping generic framing such as “an icon of”; fuzzy guesses such as `vehicle` or multi-answer guesses do not receive credit. Immediate correctness is never returned, and aggregate labels/confusions remain unavailable until that reviewer completes the full panel, preventing early answers from coaching later 36px/72px decisions.

Catalog promotion requires at least three independent reviewers for every specimen. Release readiness requires at least 90% top-1 naming at both sizes; the market-leading target requires 97% at both sizes. Both gates also reject any covered individual specimen below two correct answers out of three. This second invariant matters: a 99% catalog average must not permit a completely unrecognizable `car`. The completed report lists weakest concepts, player-size quarantine candidates, and concrete semantic confusions such as `car → bus` so weak assets can be replaced rather than rationalized.

The workflow and gates are implemented, but no human decisions have been fabricated. Human recognition readiness remains unproven until three distinct panelists complete the full current catalog contract.

### Human-governed generated asset registry

The curated Lucide-backed catalog remains the first and preferred visual source. When a genuinely long-tail concept requires generated SVG artwork, the asset may support only the puzzle generation attempt that produced it after passing the live structural and two-model recognition gates. It is not silently promoted into a reusable cache.

Every newly accepted long-tail SVG is submitted to `generated-pictogram-registry-v1` with its exact SHA-256, normalized concept, style version, clarity evidence, 36px and 72px recognition evidence, and append-only audit event. The registry accepts at most one pending candidate per concept so reviewers are not flooded with competing variants. Guesses receive only exact normalized concept or simple singular/plural credit; fuzzy category matches do not turn an ambiguous symbol into an approval.

Administrators review the queue at `/admin/generated-assets`. Each browser payload contains only an opaque fixture ID, exact player-size sanitized SVG, and size. A response is immutable for that reviewer/specimen, “I don't know” is a failure, and no correctness is returned. The concept and aggregate status become visible to that reviewer only after they have judged both sizes of that candidate, preventing the 36px result from coaching the 72px decision or vice versa.

Reusable approval is deliberately strict: three independent reviewers must name the intended object correctly at 36px and all three must do so again at 72px. One completed size with any miss rejects the candidate. An approved lookup still verifies the stored hash, exact sanitization, structural clarity, and current automated recognition at both sizes. A corrupted or regressed asset is atomically quarantined and fresh generation resumes through the full gate; it is never served merely because it passed an older model version.

This registry converts generation into a governed asset-sourcing lane rather than an unlimited source of production icons. The code, storage locks, panel, and runtime quarantine are implemented, but no approvals have been fabricated. Market readiness for long-tail artwork remains unproven until real independent reviewers complete candidates and those assets survive live credentialed recognition plus player telemetry.

### Blind human playtesting of generated puzzles

Automated screenshot judges are necessary for fail-closed publication, but they cannot prove that real players interpret a full rebus the same way. Every successfully persisted AI-generated rebus with a composed visual is therefore copied into `puzzle-playtest-v3` as an immutable shadow-calibration candidate. Reserve puzzles and non-rebus puzzle types are excluded so the report measures the generator rather than curated fallback inventory.

Administrators inspect aggregate evidence and backfill candidates at `/admin/puzzle-playtests`. Registered players contribute blind decisions at `/playtest`; guests, accounts younger than 24 hours, and accounts with fewer than three completed normal puzzles are excluded. The browser receives only an opaque fixture ID and rendered PNG dimensions/data: no answer, puzzle ID, difficulty, technique, profile label, hints, explanation, model confidence, or candidate ID. A reviewer sees exactly one responsive profile for a candidate. The service assigns the currently least-covered profile, which balances compact 320px, mobile 375px, and desktop 768px evidence without letting the same person learn the answer on one size and then score another size.

Each immutable decision records a final answer or a required give-up reason, confidence from one to five, and elapsed time. Fuzzy scoring tolerates ordinary spelling variation but keeps wrong parses available for ambiguity analysis. The POST response returns only progress; the intended answer and aggregate candidate results become visible to that reviewer only after their one final decision. A database unique lock enforces one profile per candidate/reviewer even under retries or concurrent requests. Four frozen known-answer controls are interleaved with each reviewer's first generated assignments. At least three must be correct; generated decisions remain unscored until that fixed qualification result is known, and failed reviewers receive no further assignments. Controls never enter generated-puzzle metrics.

A candidate is complete only after all three responsive profiles have at least five independent reviews from qualified reviewers, requiring at least 15 reviewers per generated puzzle. Readiness calculations use completed candidates only, preventing easy early reviews from biasing rates upward. Difficulty-adjusted solve floors are 65% through difficulty 5, 50% at 6, 35% at 7, and 20% at 8–10. Candidate-floor success requires the one-sided 95% Wilson lower bound—not merely the observed point rate—to clear the applicable floor and additionally permits no more than one multiple-answer report per completed puzzle.

The provisional release gate requires 30 fully covered generated puzzles and 450 decisions from at least 20 qualified reviewers. No reviewer may contribute more than 7.5% of completed evidence, and no more than 20% of evaluated reviewers may fail controls. Every difficulty tier needs at least three completed puzzles, at least six named techniques must be represented, and no technique may exceed 35% of the sample. It also requires at least 90% of candidates meeting their difficulty-adjusted floor, at most 12% multiple-answer reports, 5% visual failures, 8% high-confidence wrong answers, a 12-point responsive solve-rate gap, 80% automated-estimate coverage, 15-point mean absolute error, and 10-point absolute bias. `puzzle-playtest-readiness-v3` applies one-sided 95% Wilson lower bounds to success/coverage thresholds and combines Wilson upper bounds with deterministic reviewer-by-puzzle crossed-cluster bootstrap bounds for harms, responsive parity, calibration error, and bias. A favorable but dependent or uncertain raw percentage cannot prove readiness.

The market-leading target requires 100 complete puzzles and 1,500 decisions from at least 50 qualified reviewers. No reviewer may contribute more than 3.5% of evidence, and no more than 10% of evaluated reviewers may fail controls. Every tier needs 15 puzzles, at least ten techniques must be represented, and no technique may exceed 20% of the sample. The quality limits tighten to 97% candidate-floor success, 5% ambiguity, 2% visual failures, 3% high-confidence wrong answers, a five-point responsive gap, 95% solve-estimate coverage, 10-point mean absolute error, and five-point absolute bias. The report runs 1,000 deterministic pigeonhole-bootstrap replicates by independently resampling reviewer and puzzle clusters. Rare harms use the more conservative of Wilson and cluster upper bounds; profile-pair differences and calibration metrics use cluster upper bounds. Missing cluster evidence fails closed. These gates remain explicitly unproven until real reviewers produce the evidence; a large but homogeneous or reviewer-concentrated perfect sample cannot report readiness. A formal external claim still requires preregistered power and independently reviewed crossed-effects or hierarchical analysis. The full protocol is in [HUMAN_PUZZLE_PLAYTESTING.md](./HUMAN_PUZZLE_PLAYTESTING.md).

Playtest queue failures are logged but do not retroactively break a daily publication that already passed all automated gates and database locks. This lane is initially shadow calibration: once sufficient human evidence establishes stable thresholds, its measured drift should feed evaluator promotion and the longitudinal circuit breaker. No human playtest decisions have been fabricated.

The playtest admin page can also audit historical records before mutating the queue. The dry run scans a bounded newest-first window and reports eligible, already queued, excluded, and truncated counts. Apply must be explicit and is capped at 200 candidates per request. Historical rows qualify only when they are AI-generated rebuses with a valid composed visual, all three responsive blind profiles, all three accepted editorial profiles, `structural-v1` novelty evidence, and an automated solve-rate estimate. Reserve inventory, lab previews, non-rebuses, legacy Unicode boards, and partially gated generations are excluded so old weak pipelines cannot contaminate the current-generator calibration cohort. Candidate uniqueness makes repeated audits and applies idempotent.

The same operation is available as a dry-run-first CLI. The CLI suppresses automatic index initialization during its read-only audit; `--apply` is the only mutation switch:

```bash
pnpm benchmark:puzzles:playtest-backfill -- --limit=100
pnpm benchmark:puzzles:playtest-backfill -- --apply --limit=100
```

Run the complete evaluator benchmark from `apps/web`:

```bash
pnpm benchmark:puzzles -- --env-file=.vercel/.env.development.local
pnpm benchmark:puzzles:catalog-sheet
pnpm benchmark:puzzles:reserve-sheet
pnpm benchmark:puzzles:solve -- --env-file=.vercel/.env.development.local
pnpm benchmark:puzzles:external:import
pnpm benchmark:puzzles:external:review-template
```

The evaluator commands write versioned JSON evidence under `artifacts/puzzle-generator/` and exit non-zero when promotion gates fail. Pass `--baseline=<previous-report.json>` to prevent a candidate evaluator from regressing behind an accepted baseline. Partial `--limit=N` runs are diagnostic and can never promote.

`benchmark:puzzles:catalog-sheet` writes an ignored 36px/72px contact sheet for human compact-size inspection. It is a fast editorial check, not a substitute for the two-model recognition benchmark.

`benchmark:puzzles:reserve-sheet` renders the complete degraded-service inventory at the production compact profile in four ignored review sheets. It makes weak substitutions and wrapping defects visible before a reserve corpus change is accepted; the automated corpus and 30-day scheduling tests remain the enforcement layer.

Live vision preflight fails before scoring when any configured independent judge is unavailable. The failure now identifies the player size, model ID, and a sanitized provider error for every missing judge; benchmark artifacts retain the same diagnostics. This keeps publication fail-closed while distinguishing revoked credentials, unavailable model IDs, provider limits, and unsupported requests from an ordinary recognition miss.

The solve report distinguishes answer presence from actual playability. A profile counts as detected only when both independent judges agree; one-of-two agreement is a failure, not half credit. Promotion currently requires at least 80% answer presence, 75% top-answer detection, 70% dominant-answer detection, 70% compact top-answer detection, mean reciprocal rank of at least 0.75, and no more than 10% ambiguous observations. These are provisional automated screening thresholds; human calibration remains authoritative. Benchmark contract `2026-08-02.7` invalidates both reports produced under the older any-one-judge scoring semantics and pre-quarantine catalog reports.

The editorial report prevents trivial evaluators from winning: known-good acceptance must remain at least 95%, known-failure detection at least 99%, two-judge failure consensus at least 90%, compact failure detection at least 99%, and all critical fixtures must pass. Market-readiness remains false until the corpus contains at least 150 vetted positives, 100 vetted failures, complete technique coverage, and at least 10 failures per failure class. The current 24-positive/12-failure seed is executable infrastructure, not market-leading evidence.

### External robustness benchmark

Public puzzle collections are useful for measuring evaluator generalization, but they are never generation material. Answers, hints, layouts, and images from external corpora must not enter phrase banks, candidate prompts, retrieval, or training. This prevents benchmark contamination and avoids turning imitation into apparent quality.

The approved metadata lane currently pins the [RE-BUS Hugging Face dataset](https://huggingface.co/datasets/TrishanuDas/rebus-dataset) to commit `12233c6790bb2edc929ad7822ae428483b5c842a`. Corpus artifact schema v2 verifies both the raw CSV SHA-256 and a canonical immutable-fixture SHA-256; changing an answer, source, image URL, feature, or row causes import rejection even if an attacker recomputes the artifact's self-declared digest. The 2026-08-01 import produced 1,354 rows: 743 originals and 611 augmented variants. Augmented variants never count as independent benchmark cases. The dataset card declares Apache-2.0, but individual rows cite third-party source sites, so every original still needs a human source-rights and answer review. The code stores only ignored local metadata artifacts and downloads approved images ephemerally for evaluation; it does not vendor or redistribute the images.

The [333-puzzle REBUS repository](https://github.com/cvndsh/rebus) and [432-puzzle Puzzled by Puzzles repository](https://github.com/Kyunnilee/visual_puzzles) remain quarantined because neither repository published a license when reviewed on 2026-08-01. They must not be imported until a compatible license or explicit permission is documented.

Workflow from `apps/web`:

```bash
# Fetch pinned CSV metadata only; no puzzle images are downloaded.
pnpm benchmark:puzzles:external:import

# Create a local template without overwriting an existing review file.
pnpm benchmark:puzzles:external:review-template

# Upload the imported artifact at /admin/benchmark-review. Reviewers can use
# A=approve, R=reject rights, W=wrong answer, and S=skip. Every change is
# attributed, version-checked, and appended to the fixture's audit history.

# Export reviews from the admin page, then rebuild the corpus with that file.
pnpm benchmark:puzzles:external:import -- --review=../../artifacts/puzzle-generator/external/re-bus-hf-v1.reviews.json

# Run two blind vision judges; answer metadata is used only after guesses are returned.
pnpm benchmark:puzzles:external:solve -- --env-file=.vercel/.env.development.local
```

An external run can promote only with at least 100 human-approved originals, both source domains, both annotated difficulty bands, all eight annotated reasoning features, at least five cases per feature, complete two-judge agreement (not merely two returned responses), at least 85% answer detection, 70% top-1 detection, 60% dominant-answer detection, and mean reciprocal rank of at least 0.75. These thresholds reflect the pinned dataset's actual coverage ceiling (the aspect-ratio feature has only seven originals). They are evaluator-calibration gates, not proof that generated Rebuzzle boards are good. Internal multi-profile fixtures and real-player calibration remain separately required.

### Stage 1 — stop unrecognizable publication

- Rasterize SVGs at player size.
- Replace SVG-source recognition with blind pixel recognition.
- Require independent model consensus and fail closed.
- Make low icon-recognition scores a hard Apex rejection.

### Stage 2 — asset-first grounding

- Introduce the vetted local icon catalog and alias ontology.
- Cache approved generated assets by normalized concept and version.
- Prefer catalog retrieval over fresh generation for common nouns.

### Stage 3 — validate the actual game board

- Add a deterministic server renderer or browser screenshot harness for the production component.
- Evaluate all responsive states.
- Move player simulation from Unicode/declared text to screenshot-only perception and solving.

### Stage 4 — benchmark and learn (in progress)

- Curate at least 100 source-rights-reviewed originals from the pinned external metadata import and run the non-training evaluator benchmark.
- Maintain the implemented human icon-naming and generated-puzzle rating workflows.
- Complete at least 30/100 fully covered generated-puzzle playtests for release/market-leading human evidence.
- Calibrate model scores to solve rate, solve time, hint usage, skips, and quality reports.
- Promote evaluator/model changes only when they beat the frozen benchmark without regressions.

## Research basis

- [ISO 9186-1](https://www.iso.org/standard/59226.html) defines comprehension testing for graphical symbols without explanatory text.
- [ISO 9186-2](https://www.iso.org/standard/43484.html) covers perceptual-quality testing so symbol elements are identifiable to the eventual user population.
- [REBUS benchmark](https://arxiv.org/abs/2401.05604) reports that strong multimodal models still perform poorly on difficult rebus solving, supporting human calibration rather than trusting model self-scores.
- [Puzzled by Puzzles](https://aclanthology.org/2025.emnlp-main.1101/) finds persistent VLM difficulty with abstraction, visual metaphor, and lateral reasoning.
- [RE-BUS](https://rebus-dataset.github.io/) provides a larger 1,333-puzzle benchmark and structured visual-reasoning evaluation ideas.
- [CLIP](https://openai.com/index/clip/) established practical zero-shot image/text alignment; [SigLIP 2](https://arxiv.org/abs/2502.14786) improves image-text retrieval and zero-shot classification and is a useful optional local screening model.
- [AI SDK image input](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) supports sending rendered image bytes directly to vision-capable models.
- [Vercel AI Gateway model discovery](https://vercel.com/docs/ai-gateway/models-and-providers) exposes model capabilities, including vision tags, so evaluator models should be validated dynamically.
- [Lucide](https://lucide.dev/) provides a large consistent SVG icon set under the ISC license.
- [Recraft API](https://www.recraft.ai/docs/api-reference/getting-started) supports current production-grade vector generation for long-tail approved assets.
- [NIST binomial proportion control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc332.htm) provide the statistical-process-control basis for monitoring defect proportions rather than raw counts.
- [Google Cloud multi-window burn-rate alerting](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate?hl=en) motivates requiring fast and slow evidence so the breaker reacts to severe regressions without flapping on noise.
- [Wilson interval coverage research](https://pmc.ncbi.nlm.nih.gov/articles/PMC2706447/) supports using score intervals instead of the poorly behaved normal/Wald interval for sparse binomial outcomes.
- [NIST's Wilson interval guidance](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm) documents score-interval construction, while [Brown, Cai, and DasGupta](https://www.stat.purdue.edu/~dasgupta/publications/tr99-19.pdf) recommend Wilson or equal-tailed Jeffreys intervals for small binomial samples.
- [Owen's pigeonhole bootstrap](https://arxiv.org/abs/0712.1111) independently resamples rows and columns to estimate uncertainty in sparse, unbalanced crossed random-effects data; Rebuzzle maps those factors to reviewers and puzzles.
