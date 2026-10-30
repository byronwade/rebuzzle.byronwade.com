# A daily puzzle worth returning to

The user wants the single daily puzzle to be difficult enough to think about across a few hours. Build on the existing shared backend so native and web receive the same challenge. Keep today's published puzzle stable, including existing attempts and completion state.

Difficulty should come from layered inference and a satisfying reinterpretation of the visible clues. Direct picture-name concatenation, simple arithmetic and transparent literal spellings are insufficient for the main daily challenge. Answers should remain recognizable words or phrases, with all necessary evidence present in the puzzle. Reject obscurity, arbitrary associations, unsupported cultural trivia and ambiguous answers as substitutes for difficulty.

Progressive hints remain optional and available; do not force waiting, gate hints behind purchases, or add extra scored puzzles. Players may leave and return with their draft/attempts intact. No claim that every player will take hours: this is an editorial target requiring real playtest evidence, not something a numeric score or model prompt can guarantee.

Implementation should change the future daily selection and generation eligibility at their shared source. Inspect existing admission/playtest gates first and reuse them rather than introducing a parallel selector. Preserve availability through a validated difficult reserve when AI or candidate evaluation is unavailable. Tests must cover rejection of an easy concatenation even with a high declared score, acceptance of reasoning-based candidates, repeat avoidance, and preservation of existing daily assignments.
