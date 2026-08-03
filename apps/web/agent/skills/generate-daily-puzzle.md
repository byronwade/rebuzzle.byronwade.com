---
name: generate-daily-puzzle
description: End-to-end workflow for assembling a daily Rebuzzle puzzle with generative Ink Pictogram visuals, difficulty tiers, and component tools.
---

# Generate daily puzzle

1. `get_puzzle_type_spec` + `get_difficulty_brief` + `get_generation_brief` for the target score (brief includes recent reject-mode avoid/prefer).
2. `list_recent_answers` (lookback 60 days) — ban those answers (exact reuse fails publish).
3. `list_pictogram_catalog` for exact reviewed concept IDs.
4. If the host reserved an **answer-first cue plan**: `inspect_answer_seed_cues` / `preflight_compose_cue_plan` first (no invent). Otherwise `propose_concept_seeds` → invent a **new** answer (phrase-bank classics are tropes to avoid, not templates).
5. Pick a technique from the brief; optionally `list_technique_library`.
6. **Compose a generative visual** (required path):
   - Plan layers: pictogram concepts + text emphasis + operators (+ rare image).
   - Pictogram concepts must be **exact catalog IDs** (or approved-cache) — never invent nouns.
   - Prefer fresh answers — avoid before / sunflower / piece of cake cousins unless the twist is new.
   - Call `compose_puzzle_visual` with those layers until within budget and funScore ≥ 68.
   - Set `rebusPuzzle` = returned `unicodeFallback`; keep the full `visual` for persist/UI.
   - Unicode-only / unreadable blob SVGs are rejected — ensure ≥1 clear pictogram SVG or styled text layers.
7. Write an explanation that maps each visual part → answer token; `craft_hint_ladder` for 3–5 hints.
8. Pipeline: `validate_puzzle` → `check_uniqueness` → `calibrate_difficulty` → `stress_test_solvability` → `score_quality`.
9. `critique_candidate` + `simulate_player_solve` + `score_rubric` — revise if not ship-worthy.
10. If off-band, duplicate answer, weak visual, or quality < threshold — redesign layers (not just the number).
11. Emit final structured puzzle with `difficultyLevel` ∈ Hard | Difficult | Evil | Impossible, required `techniqueId`, and required `visual`.

Daily cron uses the **Apex tournament** (multiple candidates + rubric). Be excellent — only the winner publishes.

## Visual guidance

- Custom Ink Pictograms > stock emoji
- Text layers when size/case/strike/stack is the joke
- Image tiles only when a scene is essential
- Never put the answer in any layer

## Hint guidance

- Vague category → mechanism → relationship → word count → final first-letter nudge
- Never reveal multi-letter prefixes or letter scaffolds before the last hint

## After publish

Yesterday's puzzle feeds skill `generate-puzzle-blog` (consistent archive post,
spoilers behind reveal). Keep explanation + hints accurate — the blog skill
reuses them when writing to MongoDB.
