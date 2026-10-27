# Plus Journal Study Mode

## Intent

Make the Plus Journal useful as a place to revisit how a daily puzzle works, not only a list of revealed answers. A player can reopen a completed or revealed puzzle clue-first, uncover its saved hints one at a time, then reveal the answer and explanation.

This strengthens the daily game's learning and reflection loop while giving Plus a concrete use after the day's play. It does not add another scored daily puzzle, new paid product, extra attempts, points, XP, streak credit, or a claim of improved retention or revenue.

## Player experience

- The Journal list identifies entries by date, puzzle type, and original result without displaying the answer in the list.
- Opening an entry shows its exact saved puzzle board, date, and a clear `Study mode · unscored` label.
- The answer and explanation remain hidden until the player asks to reveal them. The player may reveal the answer immediately or uncover stored hints one at a time first.
- Each hint control reveals only the next non-empty hint. Once all stored hints are shown, the answer reveal remains available.
- After the answer is revealed, show the original answer, explanation, and the existing editable personal note.
- If an older journal entry predates stored hint text, explain that hints are unavailable for that entry and keep answer reveal usable.
- Leaving and reopening an entry starts the study view with answer and hints hidden again. The player's note remains saved.
- Study mode is local and read-only except for the existing journal note field. It makes no gameplay, analytics, StoreKit, or network request.

## Persistence and privacy

Add an optional `hints: [String]` snapshot to `JournalEntry`. New entries copy the original puzzle's hints when the daily result is recorded. Existing version-one journal JSON without this key decodes with an empty list; no local journal data is discarded and the journal format version stays unchanged.

Do not create a second journal entry when studying, alter the original result, or store the transient revealed-hint count. The journal remains account-scoped local data. The existing export may include saved hints because the player explicitly requested an export; it must not include transient study state.

## Experience and access boundaries

- Today's single shared daily puzzle, its hints, its result, and its streak remain free.
- The historical Journal and Study Mode remain behind the existing verified Plus entitlement.
- Study Mode does not submit answers or create a score. It cannot be mistaken for today's active puzzle.
- The original board and answer mapping remain unchanged; no renderer or server format changes are part of this feature.

## Acceptance evidence

- A completed journal entry preserves the exact original ordered hint strings.
- Existing journal JSON with no `hints` key decodes successfully to an empty hint list.
- Journal rows do not expose answers before a player opens an entry.
- A study entry initially exposes neither answer nor explanation to visual or accessibility queries.
- Revealing hints shows them sequentially and leaves answer/explanation hidden until explicitly requested.
- Reveal answer displays the original answer and explanation; missing historical hints still permit this path.
- Study controls have accessible labels and at least 44-point hit targets at standard and accessibility text sizes.
- Study never changes guesses, today's result, points, XP, streak, or daily-growth events.
- Existing Plus purchase/restore and Journal note editing remain intact.

## Limits

This is a replay of the player's own saved result, not a general archive of unplayed daily puzzles. It depends on the local Journal and is not synced across devices. It establishes no player-outcome, conversion, or revenue lift without real TestFlight or production evidence.
