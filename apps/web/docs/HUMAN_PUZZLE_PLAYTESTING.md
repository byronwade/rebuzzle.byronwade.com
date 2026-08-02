# Representative blind puzzle playtesting

Rebuzzle treats automated judges as screening tools and human outcomes as the
calibration authority for recognizability, fairness, and difficulty. The
`puzzle-playtest-v3` contract is designed to reject four misleading forms of
evidence: too few judgments per puzzle, too few independent people, and a large
sample made from only one difficulty or technique, plus judgments from reviewers
who have not demonstrated attention and basic task understanding.

Version 3 intentionally starts a fresh evidence cohort. Version 2 candidates
and reviews remain preserved in MongoDB for audit history, but they cannot count
toward Version 3 completion or readiness because their reviewers did not pass
the control qualification contract.

This follows the general human-evaluation direction in
[GENIE](https://aclanthology.org/2022.emnlp-main.787/), which emphasizes
reproducible interfaces and annotator quality, and the evaluation-sheet
recommendations in [Howcroft et al.
2020](https://aclanthology.org/2020.inlg-1.23/), which call for explicit,
standardized evaluation definitions. Recent work on efficient human evaluation
also finds that diversity-aware selection is more informative than an
unstructured random subset ([Zouhar et al.
2025](https://aclanthology.org/2025.tacl-1.80/)). These references motivate the
contract; Rebuzzle's numeric thresholds remain product-specific and must be
recalibrated from real outcomes.

[Roit et al. 2020](https://aclanthology.org/2020.acl-main.626/) further shows
that worker selection, training, and consolidation can materially improve a
replicated crowdsourcing protocol. Rebuzzle uses objective control items as a
selection gate, while preserving disaggregated decisions. [Homan et al.
2026](https://aclanthology.org/2026.findings-eacl.223/) cautions that even 5–10
ratings per item may be insufficient for reliable significance testing. The 15
qualified decisions here are therefore a product release heuristic, not a claim
of statistical significance; a formal comparative study must perform its own
power and reliability analysis.

## Blind reviewer experience

- Registered players review at `/playtest`.
- Guest accounts are excluded.
- An account must be at least 24 hours old and have three completed normal
  puzzles before it can contribute evidence.
- The payload contains only an opaque fixture ID and rendered PNG.
- No answer, hint, difficulty, technique, evaluator score, candidate ID, or
  responsive-profile label is sent to the browser.
- A player submits one immutable answer for one responsive profile of a puzzle.
- The response never returns correctness or aggregate results.
- Give-up responses require a concrete failure category.
- Six frozen, easy compound rebuses form the control pool. Four are mixed into
  each reviewer's early assignments without labeling individual specimens.
- A reviewer must solve at least three of four controls. Generated decisions are
  held out until that fixed qualification result is known. Failed reviewers
  receive no further assignments.

Administrative reports and historical backfill remain restricted to
`/admin/puzzle-playtests`.

## Candidate completion

Each generated board is tested at compact 320px, mobile 375px, and desktop
768px. Five distinct **qualified** reviewers are required on each profile, so a
completed candidate has at least 15 qualified independent decisions. One person
can never review two profiles of the same puzzle. Control candidates never
complete and never contribute to generated candidate, profile, difficulty,
technique, solve-rate, failure-rate, calibration, or readiness metrics.

## Representative evidence gates

| Evidence | Release | Market-leading |
| --- | ---: | ---: |
| Completed generated puzzles | 30 | 100 |
| Completed decisions | 450 | 1,500 |
| Distinct qualified reviewers | 20 | 50 |
| Largest one-reviewer share | 7.5% | 3.5% |
| Maximum failed-control reviewer rate | 20% | 10% |
| Puzzles in each difficulty tier | 3 | 15 |
| Distinct named techniques | 6 | 10 |
| Largest one-technique share | 35% | 20% |

These coverage gates are additive to solve-rate, ambiguity, visual-failure,
high-confidence-wrong-answer, responsive parity, and automated-calibration
limits. Missing strata fail closed. Unknown technique IDs do not count toward
technique breadth.

The admin report separately exposes pending, qualified, and excluded reviewer
counts, control decisions, and generated decisions held out from scoring. A high
control-failure rate fails readiness rather than silently shrinking the panel,
because it can signal poor instructions, bad controls, or low-quality traffic.

## Evidence boundary

The workflow makes legitimate collection possible; it does not manufacture a
panel. No release or market-leading claim is valid until the current contract's
real reviewer, coverage, and outcome gates all pass. Account screening reduces
casual duplication but is not proof of demographic representativeness. A
formal external study should additionally document recruitment, language,
device, locale, age range, and accessibility needs before making broad
population claims.

The controls are frozen from the repository's critical, easiest compound-rebus
benchmark slice. They are objective attention checks, not evidence that the
generator is recognizable. Before a formal external study, independent humans
must audit the control set for language, cultural, and accessibility bias.

## Verification

```powershell
pnpm.cmd exec jest `
  src/ai/puzzle-agent/review/__tests__/puzzle-playtest-service.test.ts `
  src/app/api/puzzle-playtests/__tests__/route.test.ts `
  src/app/api/admin/ai/puzzle-playtests/__tests__/route.test.ts `
  --runInBand
```
