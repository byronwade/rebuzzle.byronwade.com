---
name: generate-daily-puzzle
description: End-to-end workflow for assembling a daily Rebuzzle puzzle with difficulty tiers and component tools.
---

# Generate daily puzzle

1. `get_puzzle_type_spec` + `get_difficulty_brief` for the target score.
2. `list_recent_answers` (lookback 60 days) — ban those answers.
3. `propose_concept_seeds` → choose one seed, invent a **new** answer.
4. Pick a technique from the brief; optionally `list_technique_library`.
5. Compose the visual; run `assemble_visual_components` until within budget and funScore ≥ 65.
6. Write explanation; `craft_hint_ladder` for 3–5 hints.
7. Pipeline: `validate_puzzle` → `check_uniqueness` → `calibrate_difficulty` → `stress_test_solvability` → `score_quality`.
8. If off-band, too similar, or quality < threshold — redesign components (not just the number).
9. Emit final structured puzzle with `difficultyLevel` ∈ Hard | Difficult | Evil | Impossible.
