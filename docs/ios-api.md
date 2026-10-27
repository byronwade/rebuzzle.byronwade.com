# Native iOS API contract

All routes use JSON over HTTPS on the configured Rebuzzle origin. Send `Authorization: Bearer <token>` for authenticated requests. Store the token in Keychain. Never ship puzzle solutions or score locally. Send `X-Device-Id` containing a persistent random device identifier for guest continuity. Send `Cookie: rebuzzle-tz=America%2FNew_York` (the device's IANA zone, percent encoded) on daily, restore, and guess requests. Timezone resolution prefers this cookie, then `x-rebuzzle-time-zone`, then deployment IP timezone, then UTC. For accounts, the first resolved IANA zone is saved and becomes the daily reset zone across devices.

## Authentication

- `POST /api/auth/login`: `{email,password}` → `{success:true,token,user:{id,username,email}}`.
- `POST /api/auth/signup`: existing signup contract, `{username,email,password}`; returns token and user on success.
- `POST /api/auth/guest/upgrade`: requires the current guest Bearer token and `{username,email,password}`; converts that exact guest identity in place and returns `{success:true,token,user:{id,username,email,guest:false}}`. The user ID (and its saved Journey zone and progress) stays the same. A retry after a lost response succeeds only when the supplied credentials verify against that same upgraded identity. Store the returned token in Keychain only after the server confirms success.
- `POST /api/auth/guest/lazy`: `X-Device-Id`, optional existing Bearer token → `{success:true,token,user:{id,username,email,isGuest},isNewGuest?,identifiedBy?,alreadyAuthenticated?}`. Existing authenticated sessions preserve their token; new/identified guest sessions receive a fresh JWT. Guest identity uses the device ID or guest cookie, not the posted `localStorageGuestId`.
- `GET /api/auth/session`: `{authenticated:true,user:{id,username,email,createdAt,lastLogin}}` or `{authenticated:false,user:null}`. Dates are ISO strings. `isGuest` is absent here; guest emails end in `@guest.rebuzzle.local`.
- `POST /api/auth/logout` clears browser cookies; native must also delete its Keychain token.

## Daily puzzle and rendering

`GET /api/puzzle/today` → `{success:true,puzzle,cached?,generatedAt?,serverTime,puzzleDate,timeZone,nextPuzzleTime}`. Times are ISO strings and puzzleDate is `YYYY-MM-DD`. Puzzle includes `id,puzzle,rebusPuzzle?,puzzleType,difficulty,hints,date,category?,topic?,relevanceScore?,aiGenerated,visual?`. Difficulty may be numeric or a legacy string. No answer or explanation is returned.

Public visual shape:

```ts
{
  styleId: "ink-pictogram-v1",
  mode: "composed" | "unicode" | "hybrid",
  layout: "row" | "stack" | "grid" | "overlay" | "free",
  unicodeFallback: string,
  layers: Array<
    | {kind:"pictogram",svg?:string,emojiFallback:string,x?:number,y?:number}
    | {kind:"text",content:string,emphasis?:"normal"|"large"|"small"|"strike"|"stacked"|"tiny",x?:number,y?:number}
    | {kind:"operator",symbol:string,x?:number,y?:number}
    | {kind:"image",src?:string,alt:string,x?:number,y?:number}
  >
}
```

`x`/`y` are artboard-center percentages (0–100), used for free placement. There are no width/height/rotation properties. Render SVG without scripting or network access. Use emoji/unicode fallbacks if unavailable. Public payloads omit caption, concept, role, image prompt, asset provenance, and recognition metadata; clients must not require them.

## Restore and submit

Native clients must send `X-Rebuzzle-Daily-Only: true` on both restore and guess requests. If the requested puzzle is no longer today's puzzle in the request timezone (including a midnight rollover), both endpoints return HTTP 409 with `{success:false,reloadDaily:true,error:"The daily puzzle has changed. Reload today's puzzle to continue."}` before accessing archive attempts or grading. Fetch `/api/puzzle/today` again and restore its ID. A future puzzle is also rejected with this signal. Clients without this opt-in header retain existing archive/community behavior.

`GET /api/puzzle/session?puzzleId=<id>` requires authentication and an existing account. Returns:

```ts
{success:true,puzzleId:string,puzzleDate:string,
 attempts:Array<{guess:string,correct:boolean,attemptNumber:number,
   similarity?:number,reaction?:{tier:string,line:string},
   wordResults?:Array<{word:string,correct:boolean,similarity:number}>}>,
 hintsUsed:number,attemptsLeft:number,maxAttempts:number,
 gameOver:boolean,wasSuccessful:boolean,answer?:string,explanation?:string}
```

Guesses are ordered oldest first. Restore returns only persisted attempts owned by the current user and matching both the requested puzzle and its current daily/archive lock. Daily locks use the publication date; archive/community replays use `archive:<puzzleId>` exactly as submission does. Past daily results do not consume a new archive replay. Future/unpublished puzzles are rejected except approved community puzzles. `answer`/`explanation` exist only after a matching server terminal row or exhausted server attempt count. Responses, including errors, use `private, no-store`.

Hint count is persisted when a guess is sent; hints opened without a subsequent guess cannot be recovered from the server. Legacy attempts without a `puzzleDate` are deliberately excluded because their play scope is unverifiable. Current attempts include actual guess text. Native should refresh after a network-ambiguous submission and upon 409 before allowing another guess.

`POST /api/puzzles/guess` body `{puzzleId,guess,timeSpentSeconds?,hintsUsed?,consecutiveCold?}` returns `{success:true,correct,similarity,reaction,method,attemptNumber,attemptsLeft,maxAttempts,gameOver,locked,wordResults,isArchive,pointsMultiplier}`. Terminal responses additionally contain `answer,explanation,pointsEarned,wasSuccessful,streak,maxStreak,streakFreezes,streakFrozen,guessDistribution?,recentPlayDates?` and engagement fields. 409 means completed/locked; 429 may mean rate limit or concurrent duplicate submission (honor Retry-After). Do not call the deprecated `/api/puzzles/attempt` endpoint (410).

## Statistics

`GET /api/user/stats` infers the user from authentication. Optional `userId` must match. `timeframe=today|week|month|allTime`, `includeRank=true` optional. Response `{success:true,user,stats,rank}`; rank is null unless requested. Core stats keys are `points,totalGames,wins,level,streak,maxStreak,perfectSolves,clutchSolves,speedSolves,totalTimePlayed,streakFreezes,streakShields`; optional `guessDistribution:number[]`, `recentPlayDates:string[]`, and `lastPlayDate` ISO string. There are no gamesPlayed/gamesWon/totalPoints aliases.

### Journey progress

`GET /api/user/progress` requires authentication and always scopes data to the identity in the Bearer token. A `userId` query parameter is ignored. The endpoint uses the account's saved daily-reset timezone for `asOfPuzzleDate` and Monday–Sunday week bounds. It returns only completion metadata used for Journey: puzzle date and ID, solved/failed outcome, attempt count, optional client-reported hint count, completion timestamp, and recorded timezone. Answers, guesses, explanations, and journal notes are not included.

```ts
{
  asOfPuzzleDate: string, // YYYY-MM-DD in the saved account timezone
  currentWeekStart: string, // Monday, YYYY-MM-DD
  currentWeekEnd: string, // Sunday, YYYY-MM-DD
  summary: null | {
    totalXP: number, level: number, xpIntoLevel: number,
    finishes: number, solves: number, firstGuessSolves: number,
    unassistedSolves: number, completedThisWeek: number,
    badges: Array<"first-finish" | "first-guess-solve" | "three-unassisted-solves" | "seven-finishes">
  },
  recentEntries: Array<{
    puzzleDate: string, puzzleId: string, outcome: "solved" | "failed",
    attempts: number, hintCount: number | null,
    completedAt: string, timeZone: string | null
  }>,
  backfill: { status: "not_started" | "in_progress" | "complete" | "failed" }
}
```

Until the account's historical backfill is complete, `summary` is `null` and `recentEntries` is empty; clients may show that identity's last-synced snapshot. A complete response includes every entry for the current week and up to 35 older completions. XP is derived server-side: 25 for a finish, 75 more for a solve, 25 for a first-guess solve, and 25 for a solve without hints; each level is 300 XP. Hint counts are best-effort client-reported values and may be null for older attempts. The endpoint uses `private, no-store` caching.

If a final attempt cannot be projected, the server stores a reconciliation marker and keeps Journey totals unavailable until the account is repaired. The progress read retries recent attempts; a daily cron job replays older marked history and resumes from saved cursors after interruption.

## Account deletion

`DELETE /api/user/account` requires authentication, `X-Rebuzzle-Confirm: delete-account`, and `{password:<current password>}` for registered accounts. Guests need no password. The UI should clearly confirm permanent deletion. Caller-provided user IDs are ignored. Success is `{success:true}`; clear all local account/guess caches and Keychain credentials only after success. 400 means missing confirmation header, 401 invalid/stale session, 403 password failure, 500 deletion failed and can be retried.

Deletion uses a MongoDB transaction (replica set/Atlas required) to remove the account and associated statistics, attempts, achievements, notification subscriptions, sessions, analytics, feedback, AI decisions and submissions. Learning events whose feedback IDs embed the deleted user ID are removed with an escaped, suffix-anchored match inside the same transaction. Published community boards remain available with author attribution removed. Authenticated middleware checks account existence on every request so deleted-account Bearer tokens cannot keep using cached identity. Database failures fail closed in that middleware. No real accounts were deleted during development; tests use isolated database doubles.

## Verification

New coverage exercises solution privacy, user/puzzle/lock isolation, future puzzle denial, archive replay separation, guest Bearer persistence, deletion authentication/password/confirmation, deleted-account revocation, and public visual metadata removal. Run `pnpm --filter @rebuzzle/web test -- --runInBand` and `pnpm --filter @rebuzzle/web typecheck` from the repository root. Backend changes must be deployed before the new native restore/deletion routes are available on production.

### Restorable guess feedback

Each new guess stores optional `similarity`, `reaction`, and `wordResults` on the same atomic attempt record as correctness. Both the guess response and `session.attempts[]` expose these fields. `similarity` is a 0–100 validator score, not a probability. `reaction` is `{tier:"correct"|"close"|"warm"|"cold"|"out",line:string}` and the line comes from static server copy, never from the answer. `wordResults` is `Array<{word:string,correct:boolean,similarity:number}>`; words are uppercase tokens from the submitted guess only, with positional exact-match and spelling feedback. No unused solution words are included.

`consecutiveCold` in a guess request is the number of immediately preceding `cold` reactions; the server clamps it to 0–10 and uses it only to vary reaction copy. Clients should display the returned reaction, not re-grade guesses. Legacy attempts can omit feedback; keep them neutral. Restoration omits malformed scores, non-submitted tokens, and unknown reaction copy rather than leaking arbitrary legacy metadata. Answers and explanations remain terminal-only.
