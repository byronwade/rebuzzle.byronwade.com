# Apex Generation Engine

Rebuzzle’s next-gen daily puzzle generator. Designed as a **tournament**, not a single LLM roll.

## Pipeline

1. **Curriculum brief** — diversity memory (techniques/categories/answers), learning digest from recent attempts, curated phrase-bank seeds
2. **Multi-candidate Eve slots** — each slot gets a distinct technique focus + phrase slice
3. **Lazy adversarial critique** — critique only the strongest eligible finalist first
4. **Bounded repair** — one model-backed `revise` critique may trigger one fresh board, only when the runtime reserve allows it; fallback critiques never spend a repair
5. **Rendered player evidence** — board recognition, wrong parses, hint fairness, and estimated solve rate
6. **Rubric** — aha, fairness, novelty, visual craft, shareability, technique fit, hint craft
7. **Winner selection** — only publishable, unique, solvable, in-band candidates compete

Falls back to classic Eve ToolLoopAgent if the tournament yields nothing.

## Controls

| Env | Default | Meaning |
| --- | --- | --- |
| `EVE_APEX_ENGINE` | on | Set `0` / `false` to force classic Eve |
| `EVE_APEX_CANDIDATES` | `2` | Tournament slots (2–5) |
| `EVE_APEX_MIN_RUBRIC` | `78` | Minimum rubric overall to win |
| `EVE_APEX_CRITIQUE` | on | Set `0` to skip critique LLM calls |
| `EVE_APEX_PLAYER_SIM` | on | Set `0` to skip player-sim LLM calls |
| `STUDIO_EVE_PLAYER_SIM` | off | Set `1` to allow Studio deep review (vision player-sim) when Apex player-sim + board vision are on |
| `REBUZZLE_BOARD_VISION_GATE` | on | Set `0` to disable board vision gates (also blocks Studio deep review) |
| `REBUZZLE_APEX_REVISION_RESERVE_MS` | `155000` | Minimum remaining runtime reserved for one critique-guided repair plus final evidence |

The repair lane is deliberately bounded: it bans the original answer, uses one
model chain and one generation attempt, re-critiques the repaired board, and
still must pass the same rendered recognition and blind-solve gates. A critique
provider failure is marked as a fallback and is rejected without attempting a
repair, so an unavailable judge cannot silently multiply spend or lower the
publication bar.

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
