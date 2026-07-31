---
name: generate-daily-puzzle
description: End-to-end workflow for assembling a daily Rebuzzle puzzle with generative Ink Pictogram visuals, difficulty tiers, and component tools.
---

# Generate daily puzzle

1. `get_puzzle_type_spec` + `get_difficulty_brief` for the target score.
2. `list_recent_answers` (lookback 60 days) — ban those answers.
3. `propose_concept_seeds` → choose one seed, invent a **new** answer.
4. Pick a technique from the brief; optionally `list_technique_library`.
5. **Compose a generative visual** (preferred path):
   - Plan layers: pictogram concepts + text emphasis + operators (+ rare image).
   - Call `compose_puzzle_visual` with those layers until within budget and funScore ≥ 65.
   - Optionally preview a tile with `generate_pictogram`.
   - Set `rebusPuzzle` = returned `unicodeFallback`; keep the full `visual` for persist/UI.
6. Write explanation; `craft_hint_ladder` for 3–5 hints.
7. Pipeline: `validate_puzzle` → `check_uniqueness` → `calibrate_difficulty` → `stress_test_solvability` → `score_quality`.
8. If off-band, too similar, or quality < threshold — redesign layers (not just the number).
9. Emit final structured puzzle with `difficultyLevel` ∈ Hard | Difficult | Evil | Impossible and optional `visual`.

## Visual guidance

- Custom Ink Pictograms > stock emoji
- Text layers when size/case/strike/stack is the joke
- Image tiles only when a scene is essential
- Never put the answer in any layer

## After publish

Yesterday's puzzle feeds skill `generate-puzzle-blog` (consistent archive post,
spoilers behind reveal). Keep explanation + hints accurate — the blog skill
reuses them when writing to MongoDB.
