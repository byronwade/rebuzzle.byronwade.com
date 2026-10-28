# Playtest campaign progress

## Goal

Make it easy to recruit and track qualified human puzzle reviewers so daily difficulty can be tuned from real solving outcomes, not AI estimates alone.

## Behavior

- Show progress toward 30 fully covered generated puzzles and 20 qualified reviewers.
- Show qualified generated decisions, using `reviewerQuality.qualifiedGeneratedDecisions`, not the broader raw review count.
- Derive the decision target from the report's reviewers-per-profile and required profile count. The current four-profile contract needs `30 × 5 × 4 = 600` qualified decisions; do not preserve the stale 450 figure from the previous three-profile contract.
- Keep campaign coverage separate from the statistical/readiness gates. Reaching the counts is not a quality approval.
- Link to the existing registered-reviewer panel. Do not add a backend route, invite flow, or write to live review data.

## Design plan

- Color: reuse the existing Rebuzzle semantic tokens for page, surface, ink, muted text, and brand progress; introduce no new palette.
- Type: use the current interface type scale, with the three counts set in tabular numerals and short sentence-case labels.
- Layout: place one left-aligned campaign section inside the existing human-evidence area. On wide screens, show three equal progress lanes; on mobile, stack them. Keep the reviewer-panel action beside the section title.
- Principles: make the path to useful human evidence visible; show qualified sample counts; state plainly that coverage is not readiness; keep the analytical result gates below as the source of approval.

```text
Human calibration sample                         [Open tester panel]
Coverage targets help gather evidence; readiness is decided below.

Completed puzzles      Qualified decisions      Qualified reviewers
12 / 30                240 / 600                8 / 20
━━━━━━━━━━              ━━━━━━━━━                ━━━━━━━━━━━

Sample coverage only. Meeting these counts does not prove quality.
```

The panel belongs to Rebuzzle's editor operations, so the design remains compact and data-led rather than borrowing the celebratory player-game style.

## Implementation and verification

1. Add a client-safe campaign-target helper and tests for three- and four-profile contracts.
2. Render accurate progress in the admin dashboard and distinguish qualified decisions from total reviews.
3. Run the focused helper tests, web typecheck, and formatting/lint checks; inspect mobile and desktop layout.
