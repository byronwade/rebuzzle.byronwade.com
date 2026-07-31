# Rebuzzle AI System

Daily puzzles are built by an **Eve-aligned ToolLoopAgent** on the **Vercel AI Gateway**. The agent uses typed tools to assemble puzzle **components** (concept → visual → hints → fairness), not a single opaque prompt.

## Architecture

```
getTodaysPuzzle
  → generateMasterPuzzle
    → ToolLoopAgent + gateway model
        tools (component pipeline):
          get_puzzle_type_spec
          get_difficulty_brief
          list_technique_library
          list_recent_answers
          propose_concept_seeds
          assemble_visual_components
          craft_hint_ladder
          validate_puzzle
          check_uniqueness
          calibrate_difficulty
          stress_test_solvability
          score_quality
```

Authoritative Eve files live under `apps/web/agent/` (instructions, skills, `defineTool` wrappers). In-process generation uses the same implementations in `src/ai/puzzle-agent/`.

`withEve(nextConfig)` mounts durable Eve HTTP at `/eve/v1/*`.

## Difficulty tiers (canonical)

Non-overlapping bands on a 1–10 scale:

| Tier | Band | Intent |
| --- | --- | --- |
| Hard | 4–5 | Clever but fair |
| Difficult | 6 | Second-look composition |
| Evil | 7 | Lateral / false leads |
| Impossible | 8–9 | Dense, fair with hints |

Weekly targets rotate across tiers (including Impossible). The agent must keep calibrated difficulty **inside** the requested band (`get_difficulty_brief` + `calibrate_difficulty`).

Shared definitions: `puzzle-agent/difficulty-levels.ts`, `lib/difficulty.ts`, `config/global.ts`.

## Technique library

`technique-library.ts` lists rebus/visual techniques (compound, positional, phonetic, idiom-as-picture, etc.). `assemble_visual_components` scores fun + component budget against the tier.

## Auth / keys

| Variable | Purpose |
| --- | --- |
| `AI_GATEWAY_API_KEY` | Local gateway auth |
| `EVE_PUZZLE_MODEL` | Override agent model (default `google/gemini-2.5-flash`) |
| `DEFAULT_PUZZLE_TYPE` | Default type (`rebus`) |

On Vercel, OIDC is used automatically. Provider keys live in the AI Gateway dashboard.

## Node

Eve requires **Node.js 24+** (`engines` in `apps/web/package.json`).

## Related docs

- `agent/instructions.md` — always-on agent prompt  
- `agent/skills/generate-daily-puzzle.md` — procedure skill  
- `docs/PUZZLE_TYPE_USAGE.md` — config-driven types  
- `docs/API_DOCUMENTATION.md` — generation/cron endpoints  
- `config/README.md` — puzzle type registry  
