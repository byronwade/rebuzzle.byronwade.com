# Rebuzzle quality standard and comparison protocol

The goal is exceptional original puzzles: a fair path, a surprising realization, a precise explanation, progressive hints, readable artwork, and a reason to share the result. Harder and more expensive do not automatically mean better. No global ranking or model self-rating can establish that Rebuzzle is the best puzzle system in the world.

## Improvements in this iteration

Seed reservation now solves a matching problem across the whole tournament. A flexible answer can be reassigned to another compatible slot when a later slot has only one viable answer. This avoids falsely reporting inventory exhaustion. Answer normalization, archive exclusions, technique compatibility, overused-answer bans, and cue-plan requirements still apply. Fresh compatible seeds are considered nearest to the requested difficulty hint first; that is a planning preference, not a measured difficulty claim or a globally optimal cost assignment. A property test compares all 512 three-answer/three-technique compatibility graphs with an independent exhaustive oracle.

The offline generator comparison tool makes the evidence for a proposed improvement explicit. It does not alter model routing, manufacture human labels, or replace existing publication gates. The adapter/ranker pipeline remains described in [model training](PUZZLE_MODEL_TRAINING.md).

## Freeze the experiment before running it

Record baseline/challenger code and model revisions, a hidden brief list, the archive snapshot, judge identities/configuration, evaluation contract, candidate limits, and model-call limits. Freeze pricing for cost accounting. Keep development, validation and final test briefs separate. Do not tune prompts on the test results or remove inconvenient failed runs.

A brief fixes answer seed, target tier, allowed mechanisms and visual constraints. Both variants receive the same brief and archive snapshot. Count all model calls, retries, drafting, image generation, rejected candidates and evaluations in cost and latency. Use independently validated gate outcomes from the production evaluator, not a generator's assertion that its puzzle is valid.

Maintain the existing rendered solve, editorial, recognition, novelty, difficulty and hint checks. Do not give the blind solver an answer-bearing filename, explanation or hint. Reject ambiguous/unreadable boards rather than rewarding a low solve rate.

## Observation contract

Create a JSONL file containing one row for each variant on every brief, including failed runs. `ComparisonObservationSchema` in `src/ai/puzzle-agent/benchmark/generation-comparison.ts` is the executable contract. Required fields:

- Identity: `schemaVersion: 1`, `briefId`, SHA-256 `briefSha256`, `archiveSha256`, `systemSha256` (code/model/configuration digest, fixed within a variant), `evaluatorVersion`, mechanism `family`, `tier`, `technique`, and `variant` (`baseline` or `challenger`). Use a stable mechanism family across related variants rather than making up a new family for every image.
- Budget/accounting: `candidateLimit`, `callLimit`, `candidatesUsed`, `callsUsed`, `costUsd`, `durationMs`. Report the complete cost of a brief, not only the accepted candidate.
- Outcome: `accepted`, `outputSha256` (canonical complete puzzle payload; null is permitted for failures), and `gates` with booleans for `uniqueness`, `recognition`, `blindSolve`, `editorial`, `difficulty`, `hints`.

The tool rejects duplicate or unpaired observations, mismatched brief/archive/evaluator/budget contracts, changing system revisions, repeated brief digests, exceeded budgets, repeated accepted outputs within a variant, and accepted outputs with failed gates. It cannot prove that externally supplied accounting or gate evidence is honest; retain the underlying generation traces and rendered evaluation artifacts for review. No canary result is automatically converted to a comparison observation: the current canary lacks complete per-brief cost accounting, and missing cost must not be fabricated as zero.

## Human comparison

For briefs where both outputs pass the gates, show both playable puzzles under randomized opaque labels with matched presentation. Include board, answer/explanation reveal and hint progression in the test. Conceal model identity, cost, selection outcome, and model ratings. Collect at least two distinct reviewers per brief from a reviewer pool of at least five. Record preferences only after the reviewer has inspected both full experiences. Preserve label mapping privately and convert it to baseline/challenger only after the ballot is submitted.

Each review JSONL row has `briefId`, `reviewerId`, `blinded: true`, `winner` (`baseline`, `challenger`, `tie`), and exact `baselineOutputSha256`/`challengerOutputSha256` values. Old reviews cannot silently apply to edited outputs. Every paired accepted brief needs complete reviews; selected favorable reviews are insufficient.

The report takes a strict majority per brief, then per mechanism family. Ties remain visible. It computes a 95% Wilson interval on decisive family outcomes, so many near-identical variants or multiple ballots do not masquerade as independent wins. This estimates preferences under this experiment; it does not establish population-wide superiority, and reused reviewers may introduce correlated preferences. Include real player cohorts before a broad launch.

## Run the comparison

From `apps/web`:

```sh
pnpm benchmark:puzzles:compare \
  --observations=/absolute/private/experiment/runs.jsonl \
  --reviews=/absolute/private/experiment/human-reviews.jsonl \
  --output=/absolute/private/experiment/comparison.json \
  --require-qualified
```

The output is created exclusively. Qualification requires all of the following pilot floors:

- 100 paired briefs, with at least 20 in each of the four tiers and six techniques represented.
- Complete reviews for both-accepted briefs, at least five reviewers, and at least 30 decisive independent family outcomes.
- Human preference interval lower bound above 50%.
- No observed acceptance-yield reduction; no increase in total cost per accepted puzzle; p95 duration no more than 20% worse.

These thresholds are an initial release-review policy, not a mathematical definition of world-class quality. Efficiency guardrails compare observed values and do not establish statistical noninferiority. Report ties, errors and sample sizes alongside any win-rate headline. A passing report means `candidate-for-release-review`; `deploymentAllowed` remains false. A prospective player test, accessibility review, and review of retained artifacts still matter.

## Current evidence

The allocator and report logic have automated tests, including misleading small samples, duplicate reviewers, stale review hashes, correlated puzzle families, failed-run costs, mismatched budgets, and rejected quality gates. Those tests use synthetic inputs to verify the software. They are not evidence that either generator produces better puzzles.

No credentialed generation comparison has been run in this workspace. The database/AI credentials, reviewed first-party examples and training GPU are still unavailable. Consequently there is no measured generator win rate, trained adapter, production rollout, or substantiated global-best claim from this work.
