# Studio Complete Puzzle Drafts

## Intent

Rebuzzle Studio's AI currently creates one image tile at a time. Add a second way to use Studio AI: generate a small set of complete, editable rebus puzzle drafts from a topic and optional fixed answer. This brings the stronger puzzle-logic generation already used by Rebuzzle's generation system into the creator workflow.

The creator remains in control. AI proposes; the creator selects and edits; the existing draft, grading, Eve review, and publication flow remains the authority for saving and publishing.

## Goals

- Generate two meaningfully different full-puzzle candidates per request, sequentially, with a bounded generation attempt per candidate.
- Accept a short topic or creative brief, an optional answer that must remain fixed, and a difficulty target.
- Return each candidate's board, answer, explanation, progressive hints, technique, and difficulty as structured editable content.
- Run candidates through the shared rendered-board recognition and player-simulation qualification before presenting their evidence.
- Let the creator preview candidates and explicitly load one into the current Studio board and details editor.
- Reuse the existing three-per-account Studio AI quota across image tiles and full-puzzle draft generation. A successful candidate set costs one credit; failed generation requests return their reserved credit.
- Preserve the existing Eve review and publication checks. Any edit invalidates their current result. Draft generation never saves, submits, publishes, or schedules a daily puzzle.

## Non-goals

- Replacing or changing the scheduled Apex daily-puzzle pipeline.
- Auto-publishing or directly approving a generated puzzle.
- Fine-tuning a model, expanding the artwork catalog, changing puzzle rendering, or redesigning the rest of Studio.
- Describing structural or model scores as measured enjoyment.

## Creator experience

Inside Studio's existing AI tab, add a clear choice between **Image tile** and **Full puzzle** so the current image-generation flow stays available. Keep the control and results inside the existing workbench; do not add another page header or a decorative card grid. Full puzzle asks for:

- A required topic/brief (2–180 characters).
- An optional fixed answer (2–80 characters).
- A target difficulty from 1–10.

The action is labeled **Generate 2 puzzle ideas** and explains that it uses one shared Studio AI credit. Candidates appear as compact cards with the rendered board, answer, explanation, difficulty, and a brief qualification state: **Passed initial playability checks**, **Needs a closer look**, or **Review pending**. Show a small number of concrete check issues when available. These are evidence from automated checks, not a publication approval.

Show the two candidates in a compact vertical choice list, with the board preview leading each item and the answer, explanation, difficulty, and check state following it. The creator chooses **Use this draft** to load all puzzle fields into the existing board and details editor. The app moves to the board step and brings the board into view. The creator may continue editing and saving with the existing draft controls. Nothing is persisted merely by generating or selecting a candidate.

If only one candidate succeeds, show it and explain that the second idea could not be generated. If no candidate succeeds, show a useful recoverable error and return the reserved credit. If visual qualification is unavailable, return the candidate as **Review pending**; do not claim it passed.

## Generation and quality flow

Add a dedicated authenticated Studio puzzle-generation endpoint. It must use the existing Studio entitlement check and shared AI quota, validate and bound all user inputs, and apply a per-IP request rate limit. Reserve one quota credit before billable generation and restore it for unsuccessful requests.

Use `runPuzzleAgentGeneration` directly for two sequential candidate slots. Pass the topic as the brief/theme, the optional answer as the locked answer seed, the target difficulty, a one-attempt limit, candidate slot/count for diversity, and deferred rendered evaluation. Do not call the full daily `runApexGeneration` orchestration: that pipeline includes daily research, memory, training, and tournament persistence that Studio drafts do not need.

Convert successful results to the existing `ApexCandidate` shape without writing candidate-training records. Run `qualifyRenderedCandidate` against each actual visual. Return a small public draft DTO only: puzzle fields and a status plus bounded user-facing check issues. Never return internal prompts, provider errors, private research, learning data, or hidden daily-pipeline details.

Qualification states are:

- `passed`: rendered recognition and playability qualification completed with no blockers.
- `needs_review`: qualification completed but found blockers or the base candidate was not eligible.
- `pending`: generation succeeded but rendered qualification could not complete.

These states inform the creator; none substitutes for the existing Eve review.

## Safety and boundaries

- Authentication and `requireStudioUser` are required before quota access or generation.
- Validate types and lengths server-side; accept only difficulty 1–10; cap the request body and returned candidates/issues.
- Generate sequentially to bound provider concurrency and spend.
- Keep the answer lock when supplied; never silently replace it.
- Do not include answers or explanations in public game APIs or daily puzzle records. These drafts remain private to the authenticated creator.
- Selecting or editing a generated candidate clears current grade/Eve approval through Studio's existing content fingerprint behavior.
- Do not weaken existing save, publication, or daily scheduling checks.

## Visual direction

Follow the workbench grammar from `design.thorbis.com`: quiet chrome, one dominant piece of work, no invented shell, no decorative gradients, and no rainbow status colors. Keep Rebuzzle's existing theme tokens and puzzle art as the visual identity; use the design reference for hierarchy and interaction. Topic and answer fields should read as recessed wells, the generation and selection actions should read as pressable commits, and qualification should be stated in words with restrained status color. Preserve mobile reach and visible keyboard focus.

## Product decisions left to the builder

- Exact visual arrangement of the mode selector and candidate cards within the current responsive Studio layout.
- Whether the endpoint returns one candidate plus an error if the second slot fails, while preserving a useful partial result.
- The concise wording of non-blocking qualification details and errors.
