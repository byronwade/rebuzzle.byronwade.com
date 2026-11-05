# Result Screen Weekly Trail

## Intent

Connect finishing today's puzzle to the next reason to return. The result already celebrates stars, XP, and the daily streak, while the three-day weekly trail is shown only on Journey. Add a compact weekly progress reveal to the result reward panel.

## Player experience

- Show a three-stop trail and the server's current weekly progress in the result reward panel.
- Before the snapshot includes the just-finished puzzle, show a brief update state without stale progress or reward claims.
- If Journey cannot refresh, say the result is saved and Journey will catch up later; do not show stale counts as current.
- Once a complete server snapshot includes the exact finished puzzle ID and date, show the 0–3 progress and the optional server-provided weekly reward. The existing “See your Journey” button remains the tap-through.
- Animate newly confirmed trail markers with a short spring and respect Reduce Motion. VoiceOver gets one concise label for the complete progress and reward state.
- All players with server-backed Journey progress see the weekly trail. Its counts and XP reward always come from the same fresh server snapshot used by Journey.

## Data and trust rules

- Weekly progress and bonus XP remain server-owned; iOS only presents `JourneyProgressSnapshot`.
- A result snapshot is current only after backfill is complete, its `asOfPuzzleDate` is at least the result puzzle date, and `recentEntries` contains that exact puzzle ID/date.
- A cached snapshot without the current result entry is stale for the result reveal, even if it reports the current calendar date.
- An optional/missing weekly reward remains compatible with older servers. Show trail progress without inventing an XP amount.

## Scope

- Add a pure freshness predicate to `JourneyProgressSnapshot` and cover complete, stale, mismatched, and incomplete snapshots.
- Add a compact result trail and update/error states inside `JourneyRewards`.
- Make the fixture return a terminal recent entry only after the result is complete, and cover the delayed refresh path in UI tests.

Do not change the Journey screen's existing weekly challenge, weekly reward calculation, app navigation, paid product, or backend contract.

## Success evidence

- Core tests reject stale progress when the current puzzle entry is absent or mismatched.
- Native UI tests show no 3/3 or earned bonus from the cached 2/3 snapshot while today's result is still syncing, then show the fresh server-confirmed trail and bonus.
- The existing Journey navigation action remains available, and all touched Core and UI tests pass.
