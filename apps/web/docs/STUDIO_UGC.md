# Rebuzzle Studio (user-generated puzzles)

Players compose rebus boards in Studio (`/studio`) with a three-step flow: **Board → Answer → Publish**. Starter templates (Sunflower, Doorbell, Big deal) make the first board one tap away.

Publish runs an **extensive Eve review** that streams status, thinking notes, and answers for every check. Safety runs before any model spend. Approved boards:

1. Become playable anytime at `/community/puzzles/[slug]`
2. Appear on the creator’s public profile `/u/[username]`
3. Show up in the `/community` index
4. Enter a date-seeded **lottery** that can fill reserve/filler daily slots
5. Credit the author on the daily board and notify them in-app when featured

Guests must create a free account before publishing.

## Eve review checklist

Phases (see `eve-review-manifest.ts`):

| Phase | Looking for |
|---|---|
| Intake | Author-only surface, payload bounds |
| Safety | Family-friendly language, no PII, no injection, no external lures |
| Structure | Answer hidden, catalog pictograms only, 1–6 parts, technique fit |
| Quality floors | Hint ladder, explanation maps, archive uniqueness, score floors, semantic alignment |
| Eve critique | Adversarial ship/revise/reject, icon recognizability ≥ 62, trope freshness |
| Player simulation | Optional vision fairness (`STUDIO_EVE_PLAYER_SIM=1` + board vision flags) |
| Verdict | Ship only when every blocking check passes |

Streaming events from `POST /api/studio/review` (NDJSON): `manifest` → `phase` → `thinking` → `check` → `answer` → `done`.

Publish (`submit: true` on `/api/studio/submissions`) **re-runs** the full review server-side so clients cannot spoof a ship verdict.

### Environment / spend safety

- Auth: `requireStudioUser` (no guests)
- Rate limits: review ≤ 6/min, saves ≤ 20/min
- Critique: `EVE_APEX_ENGINE` + `EVE_APEX_CRITIQUE` (default on); skipped when deterministic floors fail
- Player-sim vision: opt-in via `STUDIO_EVE_PLAYER_SIM=1` and `EVE_APEX_PLAYER_SIM` / `REBUZZLE_BOARD_VISION_GATE`
- Critique infra fallback warns instead of hard-blocking (deterministic gates still apply)
- Review results are author-scoped only

## Data

- `userPuzzleSubmissions` — drafts, grades, `eveReview` snapshot, lottery status
- `puzzles` — community / daily rows with `metadata.source: "user"`, `attribution`, `communityPlayable`
- `inAppNotifications` type `ugc_featured`

## Key routes

| Surface | Path |
|---|---|
| Editor | `/studio` |
| Community index | `/community` |
| Creator SEO profile | `/u/[username]` |
| Community play | `/community/puzzles/[slug]` |
| Catalog API | `GET /api/studio/catalog` |
| Eve review stream | `POST /api/studio/review` |
| Draft / submit | `GET|POST /api/studio/submissions` |
| Creator JSON | `GET /api/creators/[username]` |

## Lottery

`trySelectUgcLotteryFiller` runs inside `persistReservePuzzle` before curated reserve. ~35% of filler days (deterministic from the date key) attempt to promote an approved Studio puzzle, then notify the creator.
