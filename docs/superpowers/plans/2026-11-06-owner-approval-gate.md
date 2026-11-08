# Owner Approval Gate Implementation Plan (Plan 1 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From a configured date onward, a daily puzzle is served only if the owner approved its exact content. A missing puzzle now gets a 503 `daily_puzzle_unavailable` response and an email alert, not a 500 or an unreviewed reserve.

**Architecture:**
- Reuse the existing `dailyPuzzleCandidates` lifecycle (`reviewing → ready → assigned → published`).
  - A `ready` candidate without `ownerApproval` is "awaiting owner approval".
  - Approving one either schedules it (`assigned` plus the existing unique `assignedDate`) or keeps it `ready` as a backup (`ownerApproval.role = "backup"`).
- A SHA-256 content hash over the answer, accepted answers and board is stored with the approval. It is re-checked in three places:
  - in the publisher;
  - in `persistDailyPuzzle`, which is the single choke point;
  - on every cached read of a published row.
- Everything is gated by `OWNER_APPROVAL_REQUIRED_FROM=YYYY-MM-DD`. Date keys before it, or all date keys when it's unset, keep today's behaviour. This lets rows already published before the switch keep serving. This refines the spec's boolean `REQUIRE_OWNER_APPROVAL`.

**Tech Stack:** Next.js App Router (apps/web), TypeScript, MongoDB driver, Jest 30, Biome, Resend email.

**Spec:** `docs/superpowers/specs/2026-11-06-owner-approved-daily-puzzles-design.md`

## Plan series

1. **This plan.** Approval gate, serving order, 503, alert plumbing.
2. Fair answer judging: `acceptedAnswers` in validation, deterministic typos, `validation_unavailable`.
3. Owner review screen and schedule view, Pull today, live reports, admin PATCH re-approval.
4. Supply: 6-hourly generation loop to 20 waiting candidates, one-time reserve/community import, supply-depth alerts, reserve module fixes.
5. Clients: iOS and web "on its way" and "try again" states, plus the report entry.

Plans 2–5 depend only on this plan's types: `ownerApproval`, `acceptedAnswers` and `sendOwnerAlert`. Leave `OWNER_APPROVAL_REQUIRED_FROM` unset in every environment until plans 3 and 4 have shipped and the owner has filled the queue.

## File map

| File | Responsibility |
| --- | --- |
| Create `apps/web/src/lib/game/owner-approval.ts` | Accepted-answer normalization, content hash, approval validity, the required-from date policy |
| Modify `apps/web/src/db/models.ts` | `DailyPuzzleCandidateOwnerApproval` type; `ownerApproval` on candidates; `acceptedAnswers` on the candidate payload and on `Puzzle`; `ownerApproval` in `Puzzle.metadata` |
| Modify `apps/web/src/lib/game/daily-puzzle-candidate-repository.ts` | `approve`, `claimOldestBackupForDate` |
| Modify `apps/web/src/db/indexes.ts` | Backup-claim index; `ownerAlerts` unique key |
| Modify `apps/web/src/lib/game/publish-reviewed-daily-puzzle.ts` | Approval-required publishing: scheduled, then backup, then null |
| Modify `apps/web/src/lib/game/persist-daily-puzzle.ts` | Choke point: refuse unapproved or stale content when required |
| Modify `apps/web/src/lib/cache/daily-puzzle.ts` | `ownerApproved` flag on cached rows |
| Create `apps/web/src/lib/notifications/owner-alerts.ts` | De-duplicated owner email alerts |
| Create `apps/web/src/lib/game/daily-puzzle-unavailable.ts` | `DailyPuzzleUnavailableError` |
| Modify `apps/web/src/app/actions/puzzleGenerationActions.ts` | No reserve or lottery when required; alerts; `unavailable` result |
| Modify `apps/web/src/app/api/puzzle/today/route.ts` | 503 `daily_puzzle_unavailable` response instead of 500 |

Run every command from `apps/web` (`cd /Users/byronwade/ios-work/rebuzzle-approved/apps/web`). Never run scripts against a real database.

---

### Task 1: Approval policy module

**Files:**
- Create: `apps/web/src/lib/game/owner-approval.ts`
- Modify: `apps/web/src/db/models.ts` (near `DailyPuzzleCandidateHumanEvidence`, ~line 1381, and `Puzzle`, ~line 138)
- Test: `apps/web/src/lib/game/__tests__/owner-approval.test.ts`

- [ ] **Step 1: Add the model types**

In `apps/web/src/db/models.ts`, above `export interface DailyPuzzleCandidate`, add:

```ts
/** The owner's sign-off on one exact version of a candidate's player-facing content. */
export interface DailyPuzzleCandidateOwnerApproval {
  approvedBy: string;
  approvedAt: Date;
  /** sha256 of answer + accepted answers + board; any edit invalidates the approval. */
  contentHash: string;
  role: "scheduled" | "backup";
}
```

In `DailyPuzzleCandidate.payload`, after `answer: string;`, add:

```ts
    /** Owner-approved alternate phrasings that also count as correct. */
    acceptedAnswers?: string[];
```

In `DailyPuzzleCandidate`, after `humanEvidence?: DailyPuzzleCandidateHumanEvidence;`, add:

```ts
  ownerApproval?: DailyPuzzleCandidateOwnerApproval;
```

In `interface Puzzle`, after `answer: string;`, add:

```ts
  acceptedAnswers?: string[];
```

Inside `Puzzle.metadata`, next to `reasoningEvidence?`, add:

```ts
    ownerApproval?: import("@/db/models").DailyPuzzleCandidateOwnerApproval;
```

- [ ] **Step 2: Write the failing tests**

Create `apps/web/src/lib/game/__tests__/owner-approval.test.ts`:

```ts
import {
  computeOwnerContentHash,
  hasValidOwnerApproval,
  isOwnerApprovalRequired,
  normalizeAcceptedAnswers,
} from "../owner-approval";

const visual = {
  mode: "composed" as const,
  styleId: "ink-pictogram-v1",
  layout: "row" as const,
  unicodeFallback: "T E E F",
  layers: [{ kind: "text" as const, content: "TEEF", emphasis: "normal" as const }],
};

describe("normalizeAcceptedAnswers", () => {
  it("always includes the canonical answer, trims, lowercases, de-duplicates and sorts", () => {
    expect(normalizeAcceptedAnswers("Two Left Feet", ["  two  left feet", "2 left feet", ""])).toEqual(
      ["2 left feet", "two left feet"]
    );
  });
});

describe("computeOwnerContentHash", () => {
  const base = { answer: "two left feet", acceptedAnswers: ["2 left feet"], visual };

  it("is stable regardless of key order and accepted-answer order", () => {
    const reordered = {
      visual: { layers: visual.layers, unicodeFallback: "T E E F", layout: "row" as const, styleId: "ink-pictogram-v1", mode: "composed" as const },
      acceptedAnswers: ["2 LEFT FEET", "two left feet"],
      answer: "two left feet",
    };
    expect(computeOwnerContentHash(reordered)).toBe(computeOwnerContentHash(base));
  });

  it("changes when the answer, accepted answers or board change", () => {
    const hash = computeOwnerContentHash(base);
    expect(computeOwnerContentHash({ ...base, answer: "two right feet" })).not.toBe(hash);
    expect(computeOwnerContentHash({ ...base, acceptedAnswers: [] })).not.toBe(hash);
    expect(
      computeOwnerContentHash({
        ...base,
        visual: { ...visual, layers: [{ kind: "text", content: "FEET", emphasis: "normal" }] },
      })
    ).not.toBe(hash);
  });
});

describe("hasValidOwnerApproval", () => {
  const payload = { answer: "two left feet", acceptedAnswers: ["2 left feet"], visual };

  it("accepts an approval whose hash matches the current content", () => {
    const approval = {
      approvedBy: "owner",
      approvedAt: new Date(),
      role: "backup" as const,
      contentHash: computeOwnerContentHash(payload),
    };
    expect(hasValidOwnerApproval(payload, approval)).toBe(true);
  });

  it("rejects a missing or stale approval", () => {
    expect(hasValidOwnerApproval(payload, undefined)).toBe(false);
    expect(
      hasValidOwnerApproval(payload, {
        approvedBy: "owner",
        approvedAt: new Date(),
        role: "backup",
        contentHash: "stale",
      })
    ).toBe(false);
  });
});

describe("isOwnerApprovalRequired", () => {
  const original = process.env.OWNER_APPROVAL_REQUIRED_FROM;
  afterEach(() => {
    if (original === undefined) delete process.env.OWNER_APPROVAL_REQUIRED_FROM;
    else process.env.OWNER_APPROVAL_REQUIRED_FROM = original;
  });

  it("is off when the variable is unset or malformed", () => {
    delete process.env.OWNER_APPROVAL_REQUIRED_FROM;
    expect(isOwnerApprovalRequired("2026-12-01")).toBe(false);
    process.env.OWNER_APPROVAL_REQUIRED_FROM = "soon";
    expect(isOwnerApprovalRequired("2026-12-01")).toBe(false);
  });

  it("applies to the configured date key and later only", () => {
    process.env.OWNER_APPROVAL_REQUIRED_FROM = "2026-12-01";
    expect(isOwnerApprovalRequired("2026-11-30")).toBe(false);
    expect(isOwnerApprovalRequired("2026-12-01")).toBe(true);
    expect(isOwnerApprovalRequired("2027-01-05")).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/lib/game/__tests__/owner-approval.test.ts`
Expected: FAIL with "Cannot find module '../owner-approval'".

- [ ] **Step 4: Implement the module**

Create `apps/web/src/lib/game/owner-approval.ts`:

```ts
import { createHash } from "node:crypto";
import type { DailyPuzzleCandidateOwnerApproval, PuzzleVisual } from "@/db/models";

export type OwnerApprovedContent = {
  answer: string;
  acceptedAnswers?: string[];
  visual?: PuzzleVisual;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function normalizePhrase(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Canonical answer plus approved alternates, normalized, de-duplicated and sorted. */
export function normalizeAcceptedAnswers(answer: string, acceptedAnswers: string[] = []): string[] {
  const all = [answer, ...acceptedAnswers].map(normalizePhrase).filter(Boolean);
  return [...new Set(all)].sort();
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
}

/** Hash of everything a player sees or is judged against. */
export function computeOwnerContentHash(content: OwnerApprovedContent): string {
  const canonical = canonicalJson({
    answer: normalizePhrase(content.answer),
    acceptedAnswers: normalizeAcceptedAnswers(content.answer, content.acceptedAnswers),
    visual: content.visual ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function hasValidOwnerApproval(
  content: OwnerApprovedContent,
  approval: DailyPuzzleCandidateOwnerApproval | undefined
): approval is DailyPuzzleCandidateOwnerApproval {
  return Boolean(approval && approval.contentHash === computeOwnerContentHash(content));
}

/** Owner approval applies to date keys on/after OWNER_APPROVAL_REQUIRED_FROM; unset means off. */
export function isOwnerApprovalRequired(dateKey: string): boolean {
  const from = process.env.OWNER_APPROVAL_REQUIRED_FROM?.trim();
  if (!from || !DATE_KEY.test(from) || !DATE_KEY.test(dateKey)) return false;
  return dateKey >= from;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/lib/game/__tests__/owner-approval.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/owner-approval.ts src/lib/game/__tests__/owner-approval.test.ts src/db/models.ts
git commit -m "feat(daily): owner approval content hash and policy" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Repository approve and backup claim

**Files:**
- Modify: `apps/web/src/lib/game/daily-puzzle-candidate-repository.ts`
- Modify: `apps/web/src/db/indexes.ts` (the `dailyPuzzleCandidates` block, ~line 629)
- Test: `apps/web/src/lib/game/__tests__/daily-puzzle-candidate-repository.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe("daily puzzle candidate repository", ...)` block:

```ts
  it("approves a ready candidate onto a date, guarded by status version", async () => {
    const approval = {
      approvedBy: "owner",
      approvedAt: new Date("2026-11-06T00:00:00Z"),
      contentHash: "hash",
      role: "scheduled" as const,
    };
    mockCollection.findOneAndUpdate.mockResolvedValueOnce({ ...candidate, status: "assigned" });

    await repository.approve({
      id: "candidate-1",
      expectedStatusVersion: 2,
      approval,
      scheduledDate: "2026-11-20",
      updatedAt: approval.approvedAt,
    });

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { id: "candidate-1", status: "ready", statusVersion: 2, ownerApproval: { $exists: false } },
      {
        $set: {
          ownerApproval: approval,
          updatedAt: approval.approvedAt,
          status: "assigned",
          assignedDate: "2026-11-20",
        },
        $inc: { statusVersion: 1 },
      },
      { returnDocument: "after" }
    );
  });

  it("keeps a backup approval in the ready pool", async () => {
    const approval = {
      approvedBy: "owner",
      approvedAt: new Date("2026-11-06T00:00:00Z"),
      contentHash: "hash",
      role: "backup" as const,
    };
    mockCollection.findOneAndUpdate.mockResolvedValueOnce({ ...candidate, status: "ready" });

    await repository.approve({
      id: "candidate-1",
      expectedStatusVersion: 2,
      approval,
      updatedAt: approval.approvedAt,
    });

    expect(mockCollection.findOneAndUpdate.mock.calls[0][1]).toEqual({
      $set: { ownerApproval: approval, updatedAt: approval.approvedAt },
      $inc: { statusVersion: 1 },
    });
  });

  it("returns null when a scheduled date is already taken", async () => {
    mockCollection.findOneAndUpdate.mockRejectedValueOnce({ code: 11000 });
    await expect(
      repository.approve({
        id: "candidate-1",
        expectedStatusVersion: 2,
        approval: {
          approvedBy: "owner",
          approvedAt: new Date(),
          contentHash: "hash",
          role: "scheduled",
        },
        scheduledDate: "2026-11-20",
        updatedAt: new Date(),
      })
    ).resolves.toBeNull();
  });

  it("claims the oldest approved backup for a date", async () => {
    mockCollection.findOneAndUpdate.mockResolvedValueOnce({
      ...candidate,
      status: "assigned",
      assignedDate: "2026-11-21",
    });

    await repository.claimOldestBackupForDate({
      dateString: "2026-11-21",
      updatedAt: new Date("2026-11-21T00:00:00Z"),
    });

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { status: "ready", "ownerApproval.role": "backup", assignedDate: { $exists: false } },
      {
        $set: {
          status: "assigned",
          assignedDate: "2026-11-21",
          updatedAt: new Date("2026-11-21T00:00:00Z"),
        },
        $inc: { statusVersion: 1 },
      },
      { sort: { "ownerApproval.approvedAt": 1, id: 1 }, returnDocument: "after" }
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/lib/game/__tests__/daily-puzzle-candidate-repository.test.ts`
Expected: FAIL with "repository.approve is not a function".

- [ ] **Step 3: Add the methods**

In `daily-puzzle-candidate-repository.ts`, add `DailyPuzzleCandidateOwnerApproval` to the `@/db/models` import. Then add to the `DailyPuzzleCandidateRepository` type, after `markPublished`:

```ts
  /** Record the owner's approval; with scheduledDate the candidate is assigned to that date. */
  approve(input: {
    id: string;
    expectedStatusVersion: number;
    approval: DailyPuzzleCandidateOwnerApproval;
    scheduledDate?: string;
    updatedAt: Date;
  }): Promise<DailyPuzzleCandidate | null>;
  /** Assign the longest-waiting approved backup to a date that has no scheduled puzzle. */
  claimOldestBackupForDate(input: {
    dateString: string;
    updatedAt: Date;
  }): Promise<DailyPuzzleCandidate | null>;
```

Add the implementations inside the returned object, after `markPublished`:

```ts
    async approve(input) {
      try {
        return await candidates().findOneAndUpdate(
          {
            id: input.id,
            status: "ready",
            statusVersion: input.expectedStatusVersion,
            ownerApproval: { $exists: false },
          },
          {
            $set: {
              ownerApproval: input.approval,
              updatedAt: input.updatedAt,
              ...(input.scheduledDate
                ? { status: "assigned" as const, assignedDate: input.scheduledDate }
                : {}),
            },
            $inc: { statusVersion: 1 },
          },
          { returnDocument: "after" }
        );
      } catch (error) {
        // assignedDate is unique: another puzzle already holds this date.
        if (duplicateKey(error)) return null;
        throw error;
      }
    },

    async claimOldestBackupForDate(input) {
      try {
        return await candidates().findOneAndUpdate(
          { status: "ready", "ownerApproval.role": "backup", assignedDate: { $exists: false } },
          {
            $set: { status: "assigned", assignedDate: input.dateString, updatedAt: input.updatedAt },
            $inc: { statusVersion: 1 },
          },
          { sort: { "ownerApproval.approvedAt": 1, id: 1 }, returnDocument: "after" }
        );
      } catch (error) {
        if (!duplicateKey(error)) throw error;
        // A concurrent request assigned this date first; serve that assignment.
        return this.findAssignmentForDate(input.dateString);
      }
    },
```

- [ ] **Step 4: Add the backup index**

In `apps/web/src/db/indexes.ts`, add to the `dailyPuzzleCandidates` indexes array, after `daily_candidate_status_created`:

```ts
      {
        spec: { status: 1, "ownerApproval.role": 1, "ownerApproval.approvedAt": 1 },
        options: { name: "daily_candidate_owner_backup_queue" },
      },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/lib/game/__tests__/daily-puzzle-candidate-repository.test.ts`
Expected: PASS (existing tests plus 4 new ones).

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/daily-puzzle-candidate-repository.ts src/lib/game/__tests__/daily-puzzle-candidate-repository.test.ts src/db/indexes.ts
git commit -m "feat(daily): owner approve and backup claim in candidate repository" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Publisher serves only owner-approved candidates when required

**Files:**
- Modify: `apps/web/src/lib/game/publish-reviewed-daily-puzzle.ts`
- Test: `apps/web/src/lib/game/__tests__/publish-reviewed-daily-puzzle.test.ts`

In approval-required mode, `publishForDate(dateString)`:
1. still promotes reviewed candidates to `ready`, which means awaiting owner approval;
2. publishes the candidate assigned to that date only if its approval is valid, and rejects one whose approval is stale;
3. otherwise claims the oldest valid backup and marks the result `servedFromBackup: true`;
4. never auto-claims an unapproved `ready` candidate.

- [ ] **Step 1: Write the failing tests**

Add to the test file's imports:

```ts
import { computeOwnerContentHash } from "../owner-approval";
```

Then append this `describe` block. It reuses the file's existing `payload`, `makeCandidate` and `admission` helpers, and its in-memory repository factory. If the file builds its repository with a different helper name, use that helper and keep these assertions.

```ts
describe("owner approval required", () => {
  const original = process.env.OWNER_APPROVAL_REQUIRED_FROM;
  beforeEach(() => {
    process.env.OWNER_APPROVAL_REQUIRED_FROM = "2026-11-01";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.OWNER_APPROVAL_REQUIRED_FROM;
    else process.env.OWNER_APPROVAL_REQUIRED_FROM = original;
  });

  const evidence: DailyPuzzleCandidateHumanEvidence = {
    contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
    qualifiedDecisions: 20,
    profileCoverage: PROFILE_IDS.map((profileId) => ({ profileId, decisions: 5 })),
    correct: 12,
    solveRate: 0.6,
    solveRateLowerBound: 0.4,
    expectedSolveFloor: 0.3,
    ambiguityReports: 0,
    visualFailureReports: 0,
    admittedAt: "2026-11-01T00:00:00.000Z",
  };
  const validApproval = (role: "scheduled" | "backup") => ({
    approvedBy: "owner",
    approvedAt: new Date("2026-11-02T00:00:00Z"),
    role,
    contentHash: computeOwnerContentHash(payload),
  });

  function repo(overrides: Partial<DailyPuzzleCandidateRepository>): DailyPuzzleCandidateRepository {
    return {
      insert: jest.fn(),
      findById: jest.fn(),
      findByGenerationKey: jest.fn(),
      findAssignmentForDate: jest.fn().mockResolvedValue(null),
      list: jest.fn().mockResolvedValue([]),
      markPlaytestSubmitted: jest.fn(),
      markPlaytestSubmissionFailed: jest.fn(),
      markReady: jest.fn(),
      claimReadyForDate: jest.fn(),
      releaseAssignment: jest.fn(),
      skip: jest.fn(),
      markPublished: jest.fn(),
      approve: jest.fn(),
      claimOldestBackupForDate: jest.fn().mockResolvedValue(null),
      ...overrides,
    };
  }
  const reviewService: DailyCandidatePublisherReviewService = {
    getCandidateAdmission: jest.fn().mockResolvedValue(admission()),
  };
  const okAssets = jest.fn().mockResolvedValue({ ok: true } as PublicationAssetCheck);

  it("publishes the scheduled candidate with its approval passed to persist", async () => {
    const scheduled = {
      ...makeCandidate("assigned", "2026-11-20"),
      humanEvidence: evidence,
      ownerApproval: validApproval("scheduled"),
    };
    const persist = jest.fn().mockResolvedValue({ id: "puzzle-1", alreadyExisted: false });
    const repository = repo({ findAssignmentForDate: jest.fn().mockResolvedValue(scheduled) });

    const result = await publishReviewedDailyPuzzle({
      dateString: "2026-11-20",
      repository,
      reviewService,
      persist,
      verifyAssets: okAssets,
    });

    expect(result).toMatchObject({ id: "puzzle-1", servedFromBackup: false });
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ ownerApproval: scheduled.ownerApproval, dateString: "2026-11-20" })
    );
  });

  it("rejects a scheduled candidate whose approval no longer matches and falls back to a backup", async () => {
    const stale = {
      ...makeCandidate("assigned", "2026-11-20"),
      humanEvidence: evidence,
      ownerApproval: { ...validApproval("scheduled"), contentHash: "stale" },
    };
    const backup = {
      ...makeCandidate("assigned", "2026-11-20"),
      id: "backup-1",
      humanEvidence: evidence,
      ownerApproval: validApproval("backup"),
    };
    const persist = jest.fn().mockResolvedValue({ id: "puzzle-2", alreadyExisted: false });
    const repository = repo({
      findAssignmentForDate: jest.fn().mockResolvedValue(stale),
      claimOldestBackupForDate: jest.fn().mockResolvedValueOnce(backup),
    });

    const result = await publishReviewedDailyPuzzle({
      dateString: "2026-11-20",
      repository,
      reviewService,
      persist,
      verifyAssets: okAssets,
    });

    expect(repository.skip).toHaveBeenCalledWith(
      expect.objectContaining({ id: "candidate-1", reason: expect.stringContaining("approval") })
    );
    expect(result).toMatchObject({ id: "puzzle-2", servedFromBackup: true });
  });

  it("never auto-claims a ready candidate the owner has not approved", async () => {
    const persist = jest.fn();
    const repository = repo({
      list: jest.fn().mockImplementation(async ({ statuses }) =>
        statuses?.includes("ready") ? [{ ...makeCandidate("ready"), humanEvidence: evidence }] : []
      ),
    });

    const result = await publishReviewedDailyPuzzle({
      dateString: "2026-11-20",
      repository,
      reviewService,
      persist,
      verifyAssets: okAssets,
    });

    expect(result).toBeNull();
    expect(repository.claimReadyForDate).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/lib/game/__tests__/publish-reviewed-daily-puzzle.test.ts -t "owner approval required"`
Expected: FAIL. With no `servedFromBackup` field, the first two tests fail. The third fails because `claimReadyForDate` is called.

- [ ] **Step 3: Implement the approval-required path**

In `publish-reviewed-daily-puzzle.ts`:

1. Add the import:

```ts
import { hasValidOwnerApproval, isOwnerApprovalRequired } from "./owner-approval";
```

2. In `publishAssignedCandidate`, add the approval to the `input.persist({...})` argument, next to `humanPlaytestAdmission`:

```ts
        ownerApproval: candidate.ownerApproval,
```

   In the success `return { ...payload, ... }` object, add:

```ts
      servedFromBackup: candidate.ownerApproval?.role === "backup",
```

3. Inside `publishForDate`, move the existing `reviewingCandidates` loop (from `const reviewingCandidates = ...` through the end of its `for` block) into a new inner function, `promoteReviewedCandidates`. Declare it above `return {`:

```ts
  async function promoteReviewedCandidates() {
    const reviewingCandidates = await input.repository.list({ statuses: ["reviewing"], limit: 100 });
    for (const candidate of reviewingCandidates) {
      // existing loop body, unchanged
    }
  }
```

   Replace the moved code in `publishForDate` with `await promoteReviewedCandidates();`.

4. Add the approval-required publisher above `return {`:

```ts
  const MAX_BACKUP_ATTEMPTS = 10;

  async function publishOwnerApprovedForDate(dateString: string) {
    await promoteReviewedCandidates();

    const scheduled = await input.repository.findAssignmentForDate(dateString);
    if (scheduled?.status === "published") {
      throw new Error("Published daily candidate has no matching public puzzle row");
    }
    if (scheduled?.status === "assigned") {
      if (hasValidOwnerApproval(scheduled.payload, scheduled.ownerApproval)) {
        const published = await publishAssignedCandidate(scheduled, dateString);
        if (published === SUPERSEDED) return null;
        if (published) return published;
      } else {
        await input.repository.skip({
          id: scheduled.id,
          reason: "Owner approval missing or no longer matches the puzzle content",
          updatedAt: now(),
        });
      }
    }

    for (let attempt = 0; attempt < MAX_BACKUP_ATTEMPTS; attempt += 1) {
      const backup = await input.repository.claimOldestBackupForDate({ dateString, updatedAt: now() });
      if (!backup) return null;
      if (!hasValidOwnerApproval(backup.payload, backup.ownerApproval)) {
        await input.repository.skip({
          id: backup.id,
          reason: "Owner approval missing or no longer matches the puzzle content",
          updatedAt: now(),
        });
        continue;
      }
      const published = await publishAssignedCandidate(backup, dateString);
      if (published === SUPERSEDED) return null;
      if (published) return published;
    }
    return null;
  }
```

5. Make this the first line of `publishForDate`:

```ts
      if (isOwnerApprovalRequired(dateString)) return publishOwnerApprovedForDate(dateString);
```

- [ ] **Step 4: Run the whole publisher suite**

Run: `npx jest src/lib/game/__tests__/publish-reviewed-daily-puzzle.test.ts`
Expected: PASS, existing tests included. They run with `OWNER_APPROVAL_REQUIRED_FROM` unset, so the legacy path is unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/publish-reviewed-daily-puzzle.ts src/lib/game/__tests__/publish-reviewed-daily-puzzle.test.ts
git commit -m "feat(daily): publish only owner-approved candidates when required" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Choke point in persistDailyPuzzle

**Files:**
- Modify: `apps/web/src/lib/game/persist-daily-puzzle.ts`
- Test: `apps/web/src/lib/game/__tests__/persist-daily-puzzle.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the test file's imports:

```ts
import { computeOwnerContentHash } from "../owner-approval";
```

Append, reusing the file's `input` fixture and mocks:

```ts
describe("owner approval choke point", () => {
  const original = process.env.OWNER_APPROVAL_REQUIRED_FROM;
  beforeEach(() => {
    jest.clearAllMocks();
    (db.puzzleOps.findByDate as jest.Mock).mockResolvedValue(null);
    (isAnswerRegistered as jest.Mock).mockResolvedValue({ taken: false });
    process.env.OWNER_APPROVAL_REQUIRED_FROM = "2026-08-01";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.OWNER_APPROVAL_REQUIRED_FROM;
    else process.env.OWNER_APPROVAL_REQUIRED_FROM = original;
  });

  it("refuses to persist without an owner approval when required", async () => {
    await expect(persistDailyPuzzle({ ...input, aiGenerated: false })).rejects.toThrow(
      "Owner approval is required"
    );
    expect(db.puzzleOps.create).not.toHaveBeenCalled();
  });

  it("refuses an approval whose hash does not match the content", async () => {
    await expect(
      persistDailyPuzzle({
        ...input,
        aiGenerated: false,
        ownerApproval: {
          approvedBy: "owner",
          approvedAt: new Date(),
          role: "scheduled",
          contentHash: "stale",
        },
      })
    ).rejects.toThrow("Owner approval is required");
  });

  it("persists approved content with accepted answers and the approval record", async () => {
    const ownerApproval = {
      approvedBy: "owner",
      approvedAt: new Date("2026-07-20T00:00:00Z"),
      role: "scheduled" as const,
      contentHash: computeOwnerContentHash({
        answer: input.answer,
        acceptedAnswers: ["2 left feet"],
        visual: input.visual,
      }),
    };

    await persistDailyPuzzle({
      ...input,
      aiGenerated: false,
      acceptedAnswers: ["2 left feet"],
      ownerApproval,
    });

    expect(db.puzzleOps.create).toHaveBeenCalledWith(
      expect.objectContaining({
        acceptedAnswers: ["2 left feet"],
        metadata: expect.objectContaining({ ownerApproval }),
      })
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/lib/game/__tests__/persist-daily-puzzle.test.ts -t "owner approval choke point"`
Expected: FAIL. The first two tests resolve instead of rejecting.

- [ ] **Step 3: Implement**

In `persist-daily-puzzle.ts`:

1. Add the imports:

```ts
import type { DailyPuzzleCandidateOwnerApproval } from "@/db/models";
import { hasValidOwnerApproval, isOwnerApprovalRequired } from "./owner-approval";
```

   Merge the type into the existing `@/db/models` import if Biome prefers a single import.

2. Add to `PersistDailyPuzzleInput`:

```ts
  acceptedAnswers?: string[];
  ownerApproval?: DailyPuzzleCandidateOwnerApproval;
```

3. Directly after the `existing` early return in `persistDailyPuzzle`, add:

```ts
  if (
    isOwnerApprovalRequired(input.dateString) &&
    !hasValidOwnerApproval(
      { answer: input.answer, acceptedAnswers: input.acceptedAnswers, visual: input.visual },
      input.ownerApproval
    )
  ) {
    throw new Error(
      `Owner approval is required to publish the daily puzzle for ${input.dateString}`
    );
  }
```

4. In the `db.puzzleOps.create({...})` call, add after `answer: input.answer,`:

```ts
      ...(input.acceptedAnswers?.length ? { acceptedAnswers: input.acceptedAnswers } : {}),
```

   Inside `metadata`, after the `humanPlaytestAdmission` spread:

```ts
        ...(input.ownerApproval ? { ownerApproval: input.ownerApproval } : {}),
```

- [ ] **Step 4: Run the whole persist suite**

Run: `npx jest src/lib/game/__tests__/persist-daily-puzzle.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/persist-daily-puzzle.ts src/lib/game/__tests__/persist-daily-puzzle.test.ts
git commit -m "feat(daily): refuse to persist unapproved daily puzzles when required" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Mark cached rows with their approval state

**Files:**
- Modify: `apps/web/src/lib/cache/daily-puzzle.ts`
- Test: `apps/web/src/lib/cache/__tests__/daily-puzzle-owner-approval.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/cache/__tests__/daily-puzzle-owner-approval.test.ts`:

```ts
jest.mock("next/cache", () => ({
  cacheLife: jest.fn(),
  cacheTag: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("@/db", () => ({ db: { puzzleOps: { findByDate: jest.fn() } } }));
jest.mock("@/lib/logger", () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import type { Puzzle } from "@/db/models";
import { computeOwnerContentHash } from "@/lib/game/owner-approval";
import { formatPuzzleFromDb } from "../daily-puzzle";

const row = {
  id: "puzzle-1",
  puzzle: "T E E F",
  puzzleType: "rebus",
  answer: "two left feet",
  acceptedAnswers: ["2 left feet"],
  difficulty: 7,
  publishedAt: new Date("2026-11-20T00:00:00Z"),
  createdAt: new Date("2026-11-19T00:00:00Z"),
  active: true,
  metadata: {},
} as unknown as Puzzle;

describe("formatPuzzleFromDb ownerApproved", () => {
  it("is true only when the stored approval matches the row content", () => {
    const contentHash = computeOwnerContentHash({
      answer: row.answer,
      acceptedAnswers: row.acceptedAnswers,
      visual: row.visual,
    });
    const approved = {
      ...row,
      metadata: {
        ownerApproval: { approvedBy: "o", approvedAt: new Date(), role: "scheduled", contentHash },
      },
    } as unknown as Puzzle;

    expect(formatPuzzleFromDb(approved, "2026-11-20").ownerApproved).toBe(true);
    expect(formatPuzzleFromDb(row, "2026-11-20").ownerApproved).toBe(false);
    expect(
      formatPuzzleFromDb({ ...approved, answer: "two right feet" } as Puzzle, "2026-11-20")
        .ownerApproved
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/lib/cache/__tests__/daily-puzzle-owner-approval.test.ts`
Expected: FAIL. `ownerApproved` is `undefined`.

- [ ] **Step 3: Implement**

In `apps/web/src/lib/cache/daily-puzzle.ts`, add the import:

```ts
import { hasValidOwnerApproval } from "@/lib/game/owner-approval";
```

Add this field to the `CachedDailyPuzzle` type:

```ts
  /** Stored owner approval still matches this row's answer, accepted answers and board. */
  ownerApproved: boolean;
```

In the object returned by `formatPuzzleFromDb`, add:

```ts
    ownerApproved: hasValidOwnerApproval(
      { answer: puzzle.answer, acceptedAnswers: puzzle.acceptedAnswers, visual: puzzle.visual },
      puzzle.metadata?.ownerApproval
    ),
```

- [ ] **Step 4: Run the test and the typecheck**

Run: `npx jest src/lib/cache/__tests__/daily-puzzle-owner-approval.test.ts && npx tsc --noEmit -p .`
Expected: the test passes and tsc reports 0 errors. If tsc flags other constructors of `CachedDailyPuzzle`, add `ownerApproved: false` there.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cache/daily-puzzle.ts src/lib/cache/__tests__/daily-puzzle-owner-approval.test.ts
git commit -m "feat(daily): flag whether a cached daily row is owner-approved" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: De-duplicated owner alerts

**Files:**
- Create: `apps/web/src/lib/notifications/owner-alerts.ts`
- Modify: `apps/web/src/db/indexes.ts`
- Test: `apps/web/src/lib/notifications/__tests__/owner-alerts.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/notifications/__tests__/owner-alerts.test.ts`:

```ts
const insertOne = jest.fn();
jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn(() => ({ insertOne })) }));
jest.mock("../email-service", () => ({ sendEmail: jest.fn() }));
jest.mock("@/lib/logger", () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { logger } from "@/lib/logger";
import { sendEmail } from "../email-service";
import { sendOwnerAlert } from "../owner-alerts";

describe("sendOwnerAlert", () => {
  const original = process.env.ADMIN_ALERT_EMAIL;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_ALERT_EMAIL = "owner@example.com";
    insertOne.mockResolvedValue({});
    (sendEmail as jest.Mock).mockResolvedValue({ success: true });
  });
  afterAll(() => {
    if (original === undefined) delete process.env.ADMIN_ALERT_EMAIL;
    else process.env.ADMIN_ALERT_EMAIL = original;
  });

  const alert = {
    type: "backup_used" as const,
    level: "urgent" as const,
    dateKey: "2026-11-20",
    message: "No scheduled puzzle for 2026-11-20; served a backup.",
  };

  it("records the alert once and emails the owner", async () => {
    await expect(sendOwnerAlert(alert)).resolves.toBe("sent");
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ key: "backup_used:2026-11-20", level: "urgent" })
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        subject: "[Rebuzzle URGENT] backup_used 2026-11-20",
      })
    );
  });

  it("skips duplicates of the same type and date", async () => {
    insertOne.mockRejectedValueOnce({ code: 11000 });
    await expect(sendOwnerAlert(alert)).resolves.toBe("duplicate");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("never throws, even when email is not configured", async () => {
    delete process.env.ADMIN_ALERT_EMAIL;
    await expect(sendOwnerAlert(alert)).resolves.toBe("not_configured");
    expect(logger.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/lib/notifications/__tests__/owner-alerts.test.ts`
Expected: FAIL with "Cannot find module '../owner-alerts'".

- [ ] **Step 3: Implement**

Create `apps/web/src/lib/notifications/owner-alerts.ts`:

```ts
import { getCollection } from "@/db/mongodb";
import { logger } from "@/lib/logger";
import { sendEmail } from "./email-service";

export type OwnerAlertType =
  | "backup_used"
  | "daily_puzzle_unavailable"
  | "unapproved_live_row"
  | "scheduled_approval_stale";

export type OwnerAlert = {
  type: OwnerAlertType;
  level: "info" | "warning" | "urgent";
  dateKey: string;
  message: string;
};

type OwnerAlertRecord = OwnerAlert & { key: string; createdAt: Date };

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Email the owner at most once per alert type and date key. Never throws. */
export async function sendOwnerAlert(
  alert: OwnerAlert
): Promise<"sent" | "duplicate" | "not_configured" | "failed"> {
  const key = `${alert.type}:${alert.dateKey}`;
  try {
    await getCollection<OwnerAlertRecord>("ownerAlerts").insertOne({
      ...alert,
      key,
      createdAt: new Date(),
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return "duplicate";
    }
    logger.error("Owner alert could not be recorded", { key, error: String(error) });
  }

  const to = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (!to) {
    logger.error("ADMIN_ALERT_EMAIL is not set; owner alert not emailed", { key, ...alert });
    return "not_configured";
  }

  try {
    const result = await sendEmail({
      to,
      subject: `[Rebuzzle ${alert.level.toUpperCase()}] ${alert.type} ${alert.dateKey}`,
      html: `<p>${escapeHtml(alert.message)}</p>`,
      text: alert.message,
    });
    if (!result.success) {
      logger.error("Owner alert email failed", { key, error: result.error });
      return "failed";
    }
    return "sent";
  } catch (error) {
    logger.error("Owner alert email threw", { key, error: String(error) });
    return "failed";
  }
}
```

- [ ] **Step 4: Add the unique index**

In `apps/web/src/db/indexes.ts`, add an entry to `INDEX_DEFINITIONS`, after the `dailyPuzzleCandidates` block:

```ts
  {
    collection: "ownerAlerts",
    indexes: [
      { spec: { key: 1 }, options: { unique: true, name: "owner_alert_key_unique" } },
      { spec: { createdAt: -1 }, options: { name: "owner_alert_created" } },
    ],
  },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/lib/notifications/__tests__/owner-alerts.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications/owner-alerts.ts src/lib/notifications/__tests__/owner-alerts.test.ts src/db/indexes.ts
git commit -m "feat(alerts): de-duplicated owner email alerts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: No reserve or lottery when approval is required

**Files:**
- Create: `apps/web/src/lib/game/daily-puzzle-unavailable.ts`
- Modify: `apps/web/src/app/actions/puzzleGenerationActions.ts`: `getOrGenerateDailyPuzzle` (~line 208) and `getTodaysPuzzle` (~line 702)
- Test: `apps/web/src/app/actions/__tests__/puzzleGenerationActions.test.ts`

- [ ] **Step 1: Create the error type**

Create `apps/web/src/lib/game/daily-puzzle-unavailable.ts`:

```ts
/** No owner-approved puzzle can be served for this date key. Routes map this to HTTP 503. */
export class DailyPuzzleUnavailableError extends Error {
  constructor(
    readonly dateKey: string,
    readonly reason: string
  ) {
    super(`No owner-approved daily puzzle for ${dateKey}: ${reason}`);
    this.name = "DailyPuzzleUnavailableError";
  }
}
```

- [ ] **Step 2: Write the failing tests**

Open `apps/web/src/app/actions/__tests__/puzzleGenerationActions.test.ts`. It already mocks `getCachedDailyPuzzleFromDb` (`mockGetCachedDailyPuzzleFromDb`) and the publish/reserve modules. Add mocks for the alert module:

```ts
const mockSendOwnerAlert = jest.fn().mockResolvedValue("sent");
jest.mock("@/lib/notifications/owner-alerts", () => ({
  sendOwnerAlert: (...args: unknown[]) => mockSendOwnerAlert(...args),
}));
```

Then append the block below. Replace `mockPublishReviewedDailyPuzzle` and `mockSelectMongoReservePuzzle` with the names the file already uses for those mocked functions. If either function isn't mocked yet, add `jest.mock` entries in the same style the file uses for its other modules.

```ts
describe("getTodaysPuzzle with owner approval required", () => {
  const original = process.env.OWNER_APPROVAL_REQUIRED_FROM;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OWNER_APPROVAL_REQUIRED_FROM = "2026-11-01";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.OWNER_APPROVAL_REQUIRED_FROM;
    else process.env.OWNER_APPROVAL_REQUIRED_FROM = original;
  });

  it("returns unavailable and alerts instead of using the reserve", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce(null);
    mockPublishReviewedDailyPuzzle.mockResolvedValueOnce(null);

    const result = await getTodaysPuzzle(undefined, "2026-11-20", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: false, unavailable: true });
    expect(mockSelectMongoReservePuzzle).not.toHaveBeenCalled();
    expect(mockSendOwnerAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "daily_puzzle_unavailable", dateKey: "2026-11-20" })
    );
  });

  it("alerts when a backup was served", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce(null);
    mockPublishReviewedDailyPuzzle.mockResolvedValueOnce({ id: "p1", servedFromBackup: true });

    const result = await getTodaysPuzzle(undefined, "2026-11-20", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: true });
    expect(mockSendOwnerAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "backup_used", level: "urgent" })
    );
  });

  it("refuses to serve a cached row that is not owner-approved", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce({ id: "p0", ownerApproved: false });

    const result = await getTodaysPuzzle(undefined, "2026-11-20", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: false, unavailable: true });
    expect(mockSendOwnerAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "unapproved_live_row" })
    );
  });

  it("keeps legacy behaviour for date keys before the switch", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce({ id: "old", ownerApproved: false });

    const result = await getTodaysPuzzle(undefined, "2026-10-31", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: true, puzzle: { id: "old" } });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/app/actions/__tests__/puzzleGenerationActions.test.ts -t "owner approval required"`
Expected: FAIL. The reserve is used, `unavailable` is undefined and no alerts are sent.

- [ ] **Step 4: Implement**

In `puzzleGenerationActions.ts`:

1. Add the imports:

```ts
import { DailyPuzzleUnavailableError } from "@/lib/game/daily-puzzle-unavailable";
import { isOwnerApprovalRequired } from "@/lib/game/owner-approval";
import { sendOwnerAlert } from "@/lib/notifications/owner-alerts";
```

2. In `getOrGenerateDailyPuzzle`, directly after `const queueForPlaytest = ...`, add:

```ts
  const ownerApprovalRequired = isOwnerApprovalRequired(dateString);
```

3. In STEP 1, replace `return cached;` with:

```ts
      if (ownerApprovalRequired && !cached.ownerApproved) {
        await sendOwnerAlert({
          type: "unapproved_live_row",
          level: "urgent",
          dateKey: dateString,
          message: `Puzzle ${cached.id} is stored for ${dateString} without a matching owner approval. Pull it and assign an approved puzzle.`,
        });
        throw new DailyPuzzleUnavailableError(dateString, "Stored puzzle is not owner-approved");
      }
      return cached;
```

   In the race-check branch, apply the same check before `return formatPuzzleFromDb(raceCheck, dateString);`:

```ts
      const formatted = formatPuzzleFromDb(raceCheck, dateString);
      if (ownerApprovalRequired && !formatted.ownerApproved) {
        throw new DailyPuzzleUnavailableError(dateString, "Stored puzzle is not owner-approved");
      }
      return formatted;
```

4. Replace the interactive play-path block, from `if (!allowAiGenerate) {` through its closing `}`:

```ts
  if (!allowAiGenerate) {
    if (ownerApprovalRequired) {
      const approved = await publishReviewedDailyPuzzle({
        dateString,
        repository: createMongoDailyPuzzleCandidateRepository(),
        reviewService: puzzlePlaytestService,
        persist: persistDailyPuzzle,
      });
      if (!approved) {
        throw new DailyPuzzleUnavailableError(dateString, "No scheduled or backup approval");
      }
      if ("servedFromBackup" in approved && approved.servedFromBackup) {
        await sendOwnerAlert({
          type: "backup_used",
          level: "urgent",
          dateKey: dateString,
          message: `No scheduled puzzle for ${dateString}; served approved backup ${approved.id}.`,
        });
      }
      return approved;
    }

    // Legacy path (before OWNER_APPROVAL_REQUIRED_FROM): unchanged.
    // Callers request their *local* date, which can be a day ahead of or behind UTC.
    if (isLocalPuzzleDateLiveSomewhere(dateString)) {
      // ...keep the existing try/catch around publishReviewedDailyPuzzle exactly as it is...
    }
    return persistReservePuzzle(dateString, "Play-path reserve (AI deferred to cron)");
  }
```

   Keep the existing legacy `try/catch` body verbatim where the comment says so.

5. In `getTodaysPuzzle`'s `catch (error)` block, directly after `const todayString = dateString || getTodayDateString();`, add:

```ts
    if (isOwnerApprovalRequired(todayString)) {
      await sendOwnerAlert({
        type: "daily_puzzle_unavailable",
        level: "urgent",
        dateKey: todayString,
        message: `Players are seeing "today's puzzle is on its way" for ${todayString}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      return {
        success: false,
        unavailable: true,
        error: "Today's puzzle is on its way",
        generatedAt: new Date().toISOString(),
      };
    }
```

   This is the only place `daily_puzzle_unavailable` is raised. Every failure in required mode lands here, including a thrown `DailyPuzzleUnavailableError` and the cron/AI paths, whose reserve fallbacks now throw at the persist choke point.

- [ ] **Step 5: Run the action tests**

Run: `npx jest src/app/actions/__tests__/puzzleGenerationActions.test.ts`
Expected: PASS for all tests, legacy ones included.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/daily-puzzle-unavailable.ts src/app/actions/puzzleGenerationActions.ts src/app/actions/__tests__/puzzleGenerationActions.test.ts
git commit -m "feat(daily): serve only owner-approved puzzles and alert when required" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Return 503 from /api/puzzle/today instead of 500

**Files:**
- Modify: `apps/web/src/app/api/puzzle/today/route.ts`
- Test: `apps/web/src/app/api/puzzle/today/__tests__/route.test.ts` (extend it if it exists; otherwise create it with the mocks below)

- [ ] **Step 1: Write the failing tests**

If the file doesn't exist yet, create it with these mocks. Otherwise append the `describe` block and reuse the file's mocks.

```ts
const mockGetTodaysPuzzle = jest.fn();
jest.mock("../../../../actions/puzzleGenerationActions", () => ({
  getTodaysPuzzle: (...args: unknown[]) => mockGetTodaysPuzzle(...args),
}));
jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn().mockResolvedValue(null) }));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn().mockResolvedValue("UTC") }));
jest.mock("@/lib/journey-timezone", () => ({
  resolveStableJourneyTimeZone: jest.fn().mockResolvedValue("UTC"),
}));

import { GET } from "../route";

describe("GET /api/puzzle/today when no puzzle is available", () => {
  it("returns 503 daily_puzzle_unavailable with Retry-After", async () => {
    mockGetTodaysPuzzle.mockResolvedValueOnce({ success: false, unavailable: true });

    const response = await GET(new Request("https://rebuzzle.test/api/puzzle/today"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("300");
    expect(body).toMatchObject({
      success: false,
      code: "daily_puzzle_unavailable",
      retryAfterSeconds: 300,
    });
  });

  it("never returns 500 for an unexpected failure", async () => {
    mockGetTodaysPuzzle.mockRejectedValueOnce(new Error("boom"));

    const response = await GET(new Request("https://rebuzzle.test/api/puzzle/today"));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "daily_puzzle_unavailable" });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/app/api/puzzle/today`
Expected: FAIL with "expected 503, received 500".

- [ ] **Step 3: Implement**

In `route.ts`, add above `export async function GET`:

```ts
const RETRY_AFTER_SECONDS = 300;

function unavailable(extra: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      code: "daily_puzzle_unavailable",
      error: "Today's puzzle is on its way",
      retryAfterSeconds: RETRY_AFTER_SECONDS,
      ...extra,
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "private, no-store",
        "Retry-After": String(RETRY_AFTER_SECONDS),
      },
    }
  );
}
```

Replace the final non-success `return NextResponse.json({ success: false, error: "Failed to load puzzle", ... }, { status: 500, ... })` with:

```ts
    return unavailable({
      serverTime: now.toISOString(),
      puzzleDate: localDateKey,
      timeZone,
      nextPuzzleTime,
    });
```

Replace the `catch` block's `return NextResponse.json({...}, { status: 500, ... })` with:

```ts
    return unavailable({
      serverTime: now.toISOString(),
      nextPuzzleTime: getNextLocalMidnight(now).toISOString(),
    });
```

The `buildCacheControl` import stays, because the success branch still uses it.

- [ ] **Step 4: Run the tests**

Run: `npx jest src/app/api/puzzle/today`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/puzzle/today
git commit -m "feat(api): return 503 daily_puzzle_unavailable instead of 500" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Full verification

- [ ] **Step 1: Run the whole suite, typecheck and lint**

```bash
npx jest
npx tsc --noEmit -p .
npx biome check src/lib/game src/lib/cache src/lib/notifications src/app/actions src/app/api/puzzle src/db
```

Expected: Jest all green, tsc 0 errors, Biome 0 errors. If an existing test builds a `CachedDailyPuzzle` or a `DailyPuzzleCandidateRepository` literal, fix it:
- add `ownerApproved: false` to the cached-puzzle literal;
- add `approve: jest.fn(), claimOldestBackupForDate: jest.fn()` to the repository literal.

Don't change any assertions.

- [ ] **Step 2: Confirm the default is off**

Run: `grep -rn "OWNER_APPROVAL_REQUIRED_FROM" ../../ --include=*.json --include=*.ts --include=.env* -l | grep -v node_modules`
Expected: the variable appears only in source and tests, not in any committed env or config file.

- [ ] **Step 3: Commit any test-literal fixes**

```bash
git add -A src
git commit -m "test: update fixtures for owner approval fields" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Skip this commit if nothing changed.

## Spec coverage (this plan)

| Spec section | Task |
| --- | --- |
| Approval record and content hash | 1 |
| One choke point at serve time | 3, 4, 5, 7 |
| Serving order: scheduled, then backup, then 503 | 2, 3, 7, 8 |
| UGC lottery and reserve removed from the serving path | 7 (required mode bypasses `persistReservePuzzle`; the persist choke point blocks any remaining path) |
| Alerts: backup used, unavailable | 6, 7 |
| Rollout flag | 1 (`OWNER_APPROVAL_REQUIRED_FROM`), 9 |

Deferred to later plans:
- review screen, schedule, pull, reports and admin PATCH (Plan 3);
- answer judging (Plan 2);
- supply loop, import, depth alerts and reserve fixes (Plan 4);
- clients (Plan 5).
