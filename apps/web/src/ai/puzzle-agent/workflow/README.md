# Eve Smart Pipeline + Durable Workflow

Durable invent → compose → judge pipeline for daily rebus generation.

## Flow

1. **Brief** — curriculum, diversity, learning delta, phrase bank  
2. **Wrong-guess mining** — live incorrect attempts from `puzzleAttempts`  
3. **Cultural pulse** — people-scored signals (last30days CLI optional + HN/Reddit/Polymarket builtin)  
4. **Invent plans** — forced DAG per slot (technique family, Datamuse, SVGL brands, cultural seeds)  
5. **Generate slot** — Eve ToolLoopAgent with locked technique + required tools nudge  
6. **Judge** — critique (no provisional ship) + player sim + multi-agent solvers  
7. **Polish + revalidate** — redraw weak icons, re-run hard publish gates  
8. **Tournament** — hard rubric floor (no under-threshold soft publish)

## Entry points

| Path | When |
|------|------|
| `generateEvePuzzleWorkflow` (`src/workflows/…`) | Durable Workflow DevKit (`start()` + `"use step"`) |
| `runSmartEvePipeline` | Sync in-process (tests / `EVE_WORKFLOW_SYNC=1`) |
| `generateMasterPuzzle` | Prefers workflow → Apex → classic Eve |

## Flags

- `EVE_WORKFLOW=0` — disable smart/durable path  
- `EVE_WORKFLOW_SYNC=1` — always run sync pipeline (no `start()`)  
- `EVE_CULTURAL_PULSE=0` — disable people-signal research  
- `EVE_LAST30DAYS=0` — skip optional last30days CLI (builtin HN/Reddit/Polymarket still runs)  
- `EVE_LAST30DAYS_SKILL_DIR` / `EVE_LAST30DAYS_SCRIPT` — path to last30days skill/script  
- Default difficulty / Apex flags unchanged (`EVE_DEFAULT_DIFFICULTY`, `EVE_APEX_*`)

### Optional last30days skill

```bash
npx skills add mvanhorn/last30days-skill
# then point Eve at it:
export EVE_LAST30DAYS_SKILL_DIR="$PWD/.agents/skills/last30days"
```

Reddit/HN/GitHub/Polymarket work with zero keys via the CLI when installed. Without it, Eve still gets a builtin cultural pulse.

## API

`POST /api/ai/eve-workflow` — start (and await) a generation run.
