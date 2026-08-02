# Representative blind puzzle playtesting

Rebuzzle treats automated judges as screening tools and human outcomes as the
calibration authority for recognizability, fairness, and difficulty. The
`puzzle-playtest-v2` contract is designed to reject three misleading forms of
evidence: too few judgments per puzzle, too few independent people, and a large
sample made from only one difficulty or technique.

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

Administrative reports and historical backfill remain restricted to
`/admin/puzzle-playtests`.

## Candidate completion

Each generated board is tested at compact 320px, mobile 375px, and desktop
768px. Five distinct reviewers are required on each profile, so a completed
candidate has at least 15 independent decisions. One person can never review
two profiles of the same puzzle.

## Representative evidence gates

| Evidence | Release | Market-leading |
| --- | ---: | ---: |
| Completed generated puzzles | 30 | 100 |
| Completed decisions | 450 | 1,500 |
| Distinct qualified reviewers | 20 | 50 |
| Largest one-reviewer share | 7.5% | 3.5% |
| Puzzles in each difficulty tier | 3 | 15 |
| Distinct named techniques | 6 | 10 |
| Largest one-technique share | 35% | 20% |

These coverage gates are additive to solve-rate, ambiguity, visual-failure,
high-confidence-wrong-answer, responsive parity, and automated-calibration
limits. Missing strata fail closed. Unknown technique IDs do not count toward
technique breadth.

## Evidence boundary

The workflow makes legitimate collection possible; it does not manufacture a
panel. No release or market-leading claim is valid until the current contract's
real reviewer, coverage, and outcome gates all pass. Account screening reduces
casual duplication but is not proof of demographic representativeness. A
formal external study should additionally document recruitment, language,
device, locale, age range, and accessibility needs before making broad
population claims.

## Verification

```powershell
pnpm.cmd exec jest `
  src/ai/puzzle-agent/review/__tests__/puzzle-playtest-service.test.ts `
  src/app/api/puzzle-playtests/__tests__/route.test.ts `
  src/app/api/admin/ai/puzzle-playtests/__tests__/route.test.ts `
  --runInBand
```
