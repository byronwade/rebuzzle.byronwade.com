# Extended Daily Journey Projection

## Intent

An extended daily solve remains a completed daily in Journey even when the player solves after the three scored guesses. A reveal or an expired extended run also becomes a failed daily. Journey must report the number of actual guesses; the synthetic finalization record is not itself a guess.

## Contract

- Standard daily records retain their existing rules: solves use attempts 1–3 and a loss records exactly three attempts.
- Extended solves are projected from a terminal, correct extended guess. Attempts 1–3 must be marked scored; attempts after three must be marked unscored. The stored count is the actual guess number, and `playMode: "extended"` identifies the relaxed persisted range.
- Extended losses are projected only from a terminal `attemptType: "finalization"` record marked unscored, with a recognized `revealed` or `expired` reason. The progress count is `finalization.attemptNumber - 1` because the finalization row is not a guess.
- Extended progress participates in Journey reads, counts, duplicate-key validation, and stored-row repair. Standard history remains readable without a mode field.
- The progress projection does not alter points or streak awarding; those remain governed by the authoritative game route and finalizer.

## Acceptance evidence

- A correct fourth extended guess persists a solved Journey row with four attempts and extended mode.
- Standard solves above three and extended solves with an inconsistent score marker are rejected.
- Revealed and expired finalization rows persist failed Journey rows with the actual prior guess count.
- Malformed finalization records are rejected.
- Journey page and count filters include valid extended rows while retaining standard validation.
- Existing standard daily progress tests pass.
