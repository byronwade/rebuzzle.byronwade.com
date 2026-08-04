# Rebuzzle Studio (user-generated puzzles)

Players compose rebus boards in a Framer-style editor (`/studio`). Eve grades submissions with the same visual authenticity / leak / technique floors used on invent (without Apex invent spend or blind recognition). Approved boards:

1. Become playable anytime at `/community/puzzles/[slug]`
2. Appear on the creator’s public profile `/u/[username]`
3. Enter a date-seeded **lottery** that can fill reserve/filler daily slots
4. Credit the author on the daily board and notify them in-app when featured

## Data

- `userPuzzleSubmissions` — drafts, grades, lottery status
- `puzzles` — community / daily rows with `metadata.source: "user"`, `attribution`, `communityPlayable`
- `inAppNotifications` type `ugc_featured`

## Key routes

| Surface | Path |
|---|---|
| Editor | `/studio` |
| Creator SEO profile | `/u/[username]` |
| Community play | `/community/puzzles/[slug]` |
| Catalog API | `GET /api/studio/catalog` |
| Draft / submit | `GET|POST /api/studio/submissions` |
| Creator JSON | `GET /api/creators/[username]` |

## Lottery

`trySelectUgcLotteryFiller` runs inside `persistReservePuzzle` before curated reserve. ~35% of filler days (deterministic from the date key) attempt to promote an approved Studio puzzle, then notify the creator.
