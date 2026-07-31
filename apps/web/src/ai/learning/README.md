# Self-learning system

Closed loop that makes Rebuzzle harder when players crush puzzles too quickly, and fairer when they bounce.

## Loop

```
Final guess → recordFinalAttemptSignal
     ↓
Window performance (7d finals: solve rate, median time, hints)
     ↓
Nightly runLearningCalibration → aiLearningEvents
     ↓
resolveAdaptiveDifficultyForDate → targetDifficulty
     ↓
Apex curriculum (technique bias + banned archive answers)
     ↓
Persist puzzle with answerKey (never hard-delete; archive on regenerate)
```

## Signals

| Signal | Effect |
| --- | --- |
| Median solve &lt; 35s + high solve rate | `difficultyDelta` +1…+2 |
| Solve rate &lt; 28% or abandon &gt; 55% | `difficultyDelta` −1…−2 |
| Fast single-attempt solves | Learning event `fast_solve_signal` |
| ≥8 finals on a puzzle | Live calibration written to `metadata.live*` |

## Uniqueness / archive

- Every persisted AI puzzle stores `metadata.answerKey`
- Regenerate **archives** (soft-retire) instead of deleting
- Uniqueness checks the **full archive**, not just recent actives

## Flags

Learning respects `AI_ENABLE_LEARNING` (default on).
