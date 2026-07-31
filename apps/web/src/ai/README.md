# Rebuzzle AI System

Puzzle generation runs through an **Eve-aligned tool agent** on the **Vercel AI Gateway**.

## Architecture

```
getTodaysPuzzle
  → generateMasterPuzzle
    → ToolLoopAgent (AI SDK 7) + gateway model
        tools: get_puzzle_type_spec, list_recent_answers,
               validate_puzzle, check_uniqueness,
               calibrate_difficulty, score_quality
```

The same tools and instructions live under `apps/web/agent/` for the Eve runtime (`withEve` in `next.config.mjs` mounts `/eve/v1/*`).

## Auth / keys

- Prefer `AI_GATEWAY_API_KEY` locally
- On Vercel, OIDC is used automatically
- Provider keys are configured in the AI Gateway dashboard (no direct Google/Groq/xAI SDKs)

## Env

| Variable | Purpose |
| --- | --- |
| `AI_GATEWAY_API_KEY` | Gateway auth for local/dev |
| `EVE_PUZZLE_MODEL` | Override agent model (default `google/gemini-2.5-flash`) |
| `DEFAULT_PUZZLE_TYPE` | Default type for daily generation (`rebus`) |

## Node

Eve requires **Node.js 24+**.
