# Human-reviewed daily puzzle pool

## Goal

Make the daily puzzle a reviewed product decision. AI may propose complete puzzles, but a generated board cannot enter the public daily archive until qualified human reviewers have solved the exact board across the existing responsive render profiles.

The daily game remains available when the review pool is empty: publish an eligible, already-reviewed community puzzle when one is available, otherwise use the curated reserve. A missed pool target must never bypass the human gate.

## Player and editorial behavior

- Public daily requests publish only an admitted candidate, an eligible community puzzle, or a curated reserve.
- AI generation runs ahead of release and creates an unassigned candidate. The candidate is not a published puzzle, archive entry, or daily-date assignment.
- The existing blind playtest shows only the rendered board and opaque fixture ID. It continues to qualify reviewers with control puzzles and collect one decision per reviewer per responsive profile.
- A generated candidate is eligible only after the current contract marks it complete, its qualified decisions pass the existing difficulty-adjusted one-sided Wilson solve floor, it has at most one multiple-answer report, and it has no reported visual failure (unrecognizable artwork, unreadable layout, or missing cue).
- If no candidate passes, the date uses the existing community/curated reserve flow. Already published dates remain immutable.
- A candidate's full puzzle payload and visual are stored separately from the public `puzzles` collection until release. Review evidence is bound to the candidate ID and visual snapshot.

## Scope and constraints

- Reuse the current `puzzle-playtest-v3` controls, reviewer qualification, profile coverage, renderer, and solve-floor calculation.
- Do not interpret reviewer elapsed time as active thinking time or promise that puzzles take hours.
- Do not expose answers, hints, candidate IDs, or reviewer outcomes to playtest participants.
- Add bounded, idempotent pre-generation and promotion; never generate AI content on a player's latency-critical request.
- Keep first-party player analytics, retention, and revenue claims outside this change. This is a content-admission change, not evidence of improved enjoyment or retention.
- Create indexes through the existing database index setup. No index migration should be silently assumed to have run in production.

## Acceptance criteria

1. A newly generated AI puzzle is saved only in the private candidate pool and is submitted to the existing blind playtest service.
2. An incomplete candidate, candidate that fails the solve floor, candidate with multiple-answer reports above the limit, or candidate with visual failures cannot be published through the daily path.
3. An admitted candidate can be atomically claimed for one UTC puzzle date and published with the normal archive answer/date uniqueness guarantees.
4. Retries for the same date return its already-published puzzle or resume the same candidate claim; another date cannot consume that claim.
5. If playtest storage is unavailable, a candidate cannot be published; the public daily path falls back to the existing reserve flow.
6. AI candidate generation is idempotent for a target generation date and has a bounded daily attempt; public requests do not trigger it.
7. The playtest route continues to return only rendered specimens and progress, with no answer or candidate identity.

## Risks

- The qualified panel may not complete a candidate before the next release. This increases use of existing reserves; it must not lower the admission criteria.
- New candidate-pool records require a normal index setup in each environment. Until the index exists, uniqueness remains application-checked and concurrency must be handled with duplicate-key recovery.
- A generated candidate can be editorially stale when eventually released. Candidate selection should prefer the oldest ready candidate with a valid current policy version and allow editors to reject stale content.
