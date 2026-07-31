---
name: generate-daily-puzzle
description: End-to-end workflow for assembling a daily Rebuzzle puzzle with tools.
---

# Generate daily puzzle

1. Call `get_puzzle_type_spec` with the requested type (default `rebus`).
2. Call `list_recent_answers` (lookback 60 days).
3. Invent a fresh answer concept that is not in the recent list.
4. Assemble visual/components that encode the answer without spelling it out.
5. Draft explanation + 3–5 progressive hints.
6. Run `validate_puzzle` → `check_uniqueness` → `calibrate_difficulty` → `score_quality`.
7. If uniqueness fails or quality < threshold, redesign and re-check.
8. Emit the final structured puzzle result.
