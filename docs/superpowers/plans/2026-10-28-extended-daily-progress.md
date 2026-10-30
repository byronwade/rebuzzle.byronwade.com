# Extended Daily Journey Projection Plan

**Goal:** Make score-locked extended solves and terminal reveals/expiries visible in Journey with accurate guess counts, without changing scoring.

**Spec:** `docs/superpowers/specs/2026-10-28-extended-daily-progress-design.md`

1. Add failing tests for an unscored fourth-guess solve, invalid score markers, finalization loss counts, stored extended winners, and Journey query filters.
2. Run the focused Jest tests and confirm the expected failures.
3. Add optional extended mode to `DailyProgress`; project only valid extended terminal guesses/finalizations and validate extended stored rows.
4. Extend Journey Mongo filters to include extended rows while preserving standard bounds.
5. Run focused tests, related extended-solve tests, typecheck, and `git diff --check`; inspect the final diff without touching unrelated workspace changes.

**Constraints:** Preserve the three-guess scoring cutoff, standard behavior, idempotent unique-row projection, and the existing mixed dirty worktree. Do not commit, publish, or upload.
