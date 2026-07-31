# Apex Generation Engine

Rebuzzle’s next-gen daily puzzle generator. Designed as a **tournament**, not a single LLM roll.

## Pipeline

1. **Curriculum brief** — diversity memory (techniques/categories/answers), learning digest from recent attempts, curated phrase-bank seeds
2. **Multi-candidate Eve slots** — each slot gets a distinct technique focus + phrase slice
3. **Adversarial critique** — ship / revise / reject with predicted aha
4. **Player simulation** — wrong parses + hint fairness + estimated solve rate
5. **Rubric** — aha, fairness, novelty, visual craft, shareability, technique fit, hint craft
6. **Winner selection** — only publishable, unique, solvable, in-band candidates compete

Falls back to classic Eve ToolLoopAgent if the tournament yields nothing.

## Controls

| Env | Default | Meaning |
| --- | --- | --- |
| `EVE_APEX_ENGINE` | on | Set `0` / `false` to force classic Eve |
| `EVE_APEX_CANDIDATES` | `3` | Tournament slots (2–5) |
| `EVE_APEX_MIN_RUBRIC` | `78` | Minimum rubric overall to win |
| `EVE_APEX_CRITIQUE` | on | Set `0` to skip critique LLM calls |
| `EVE_APEX_PLAYER_SIM` | on | Set `0` to skip player-sim LLM calls |

## Visual Lab

Mode **Apex tournament** runs the full engine as a preview (not published).

## Key modules

- `curriculum.ts` — daily brief
- `phrase-bank.ts` — curated answer inspirations
- `diversity-memory.ts` — rotation / bans
- `learning-context.ts` — attempt telemetry → guidance
- `critique.ts` / `player-sim.ts` — LLM judges
- `rubric.ts` / `tournament.ts` — selection
- `engine.ts` — orchestration
