# Eve Smart Pipeline + Durable Workflow

Durable invent → compose → judge pipeline for daily rebus generation.

## Flow

1. **Brief** — curriculum, diversity, learning delta, phrase bank  
2. **Wrong-guess mining** — live incorrect attempts from `puzzleAttempts`  
3. **Invent plans** — forced DAG per slot (technique family, Datamuse, SVGL brands)  
4. **Generate slot** — Eve ToolLoopAgent with locked technique + required tools nudge  
5. **Judge** — critique (no provisional ship) + player sim + multi-agent solvers  
6. **Polish + revalidate** — redraw weak icons, re-run hard publish gates  
7. **Tournament** — hard rubric floor (no under-threshold soft publish)

## Entry points

| Path | When |
|------|------|
| `generateEvePuzzleWorkflow` (`src/workflows/…`) | Durable Workflow DevKit (`start()` + `"use step"`) |
| `runSmartEvePipeline` | Sync in-process (tests / `EVE_WORKFLOW_SYNC=1`) |
| `generateMasterPuzzle` | Prefers workflow → Apex → classic Eve |

## Flags

- `EVE_WORKFLOW=0` — disable smart/durable path  
- `EVE_WORKFLOW_SYNC=1` — always run sync pipeline (no `start()`)  
- Default difficulty / Apex flags unchanged (`EVE_DEFAULT_DIFFICULTY`, `EVE_APEX_*`)

## API

`POST /api/ai/eve-workflow` — start (and await) a generation run.
