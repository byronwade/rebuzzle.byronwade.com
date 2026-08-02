# Blind human icon recognition

Rebuzzle keeps rendering quality and human comprehension as separate gates.
[ISO 9186-2](https://www.iso.org/standard/43484.html) tests whether a symbol's
elements are perceptually identifiable. [ISO
9186-1](https://www.iso.org/standard/59226.html) tests whether the symbol
communicates its intended message without explanatory text. A clean SVG or a
model confidence score is therefore not enough to qualify a puzzle asset.

The admin panel at `/admin/icon-recognition` presents one unlabeled pictogram at
the exact 36px or 72px player size. It never returns the intended concept,
aliases, correctness, or aggregate results until that reviewer finishes the
selected cohort. Answers use the catalog's exact synonym ontology; fuzzy or
generic matches receive no credit.

## Cohorts

### Publication catalog

- 98 publication-eligible assets at two player sizes (196 specimens)
- at least three independent reviewers per specimen
- at least 90% top-1 naming at both sizes for release evidence
- at least 97% top-1 naming at both sizes for the market-leading evidence gate
- no individual specimen below the two-of-three hard floor

### Replacement candidates

- 17 quarantined Material Symbol candidates at two sizes
- seven known publication controls at two sizes, mixed into the blind order
- 48 total specimens per reviewer
- a reviewer is counted only after completing the cohort and naming at least
  85% of hidden controls correctly
- at least five qualified reviewers per specimen
- the control cohort must reach at least 95% at both sizes
- a candidate needs at least 90% aggregate naming and at least 80% at each size
  before it appears as promotion-eligible
- the cohort reaches the market-leading evidence gate only at 97% or better at
  both sizes with no candidate below the size-specific floor

Candidate eligibility is evidence, not automatic publication. Removing a
catalog quarantine still requires the live independent-model benchmark, a
review of confusion labels, and a versioned catalog change. Controls and
candidate fixtures use a separate contract/catalog version so production
reviews cannot be reused as candidate evidence.

The use of familiar, unambiguous symbols and awareness of cultural differences
also follows the [W3C cognitive accessibility icon
guidance](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p07-icons-used/).

## Verification

```powershell
pnpm.cmd exec jest `
  src/ai/puzzle-agent/review/__tests__/icon-recognition-service.test.ts `
  src/app/api/admin/ai/icon-recognition/__tests__/route.test.ts `
  --runInBand
```

Human evidence is stored as immutable decisions in `iconRecognitionReviews`.
The unique `(contractVersion, catalogVersion, fixtureId, reviewerId)` index
prevents a reviewer from answering a specimen twice.
