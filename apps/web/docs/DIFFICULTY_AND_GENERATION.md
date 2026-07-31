# Difficulty tiers & smart generation

## Player-facing tiers

| Tier | Score band | What it feels like |
| --- | --- | --- |
| **Hard** | 4–5 | Clever but fair; one clear visual idea |
| **Difficult** | 6 | Second look; parts must lock together |
| **Evil** | 7 | Lateral thinking; false leads allowed |
| **Impossible** | 8–9 | Dense composition; hint ladder keeps it fair |

There is no “easy” tier. Weekly scheduling rotates targets across these bands (including Impossible).

UI surfaces the tier via `DifficultyBadge` on the play stage and a compact chrome pill in the header.

## How generation enforces tiers

The Eve / ToolLoop agent:

1. Calls `get_difficulty_brief` for the day’s target score  
2. Uses `assemble_visual_components` against the tier’s **component budget**  
3. Builds hints with `craft_hint_ladder`  
4. Runs `calibrate_difficulty` and snaps into the target band  
5. `stress_test_solvability` + `score_quality` (includes funScore)

Source of truth for bands: `src/ai/puzzle-agent/difficulty-levels.ts` (mirrored in `GLOBAL_CONTEXT.difficultyCalibration.ranges`).

## Tool catalog

| Tool | Role |
| --- | --- |
| `get_puzzle_type_spec` | Type rules + tier context |
| `get_difficulty_brief` | Band, budget, techniques, avoid-list |
| `list_technique_library` | How to assemble fun visuals |
| `list_recent_answers` | Anti-repeat |
| `propose_concept_seeds` | Tier-matched starting points |
| `assemble_visual_components` | Budget + funScore |
| `craft_hint_ladder` | Progressive hints |
| `validate_puzzle` | Schema + band checks |
| `check_uniqueness` | Fingerprint / similarity |
| `calibrate_difficulty` | Snap into tier |
| `stress_test_solvability` | Fairness |
| `score_quality` | Publish gate |

## Play UX notes

- Focused play chrome (marketing nav hidden while `isPlaying`)
- Puzzle stage panel + docked input
- Guess trail chips instead of chat-style history
- Teal mist atmosphere (not purple / cream-serif defaults)
