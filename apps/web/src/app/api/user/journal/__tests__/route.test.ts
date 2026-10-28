jest.mock("@/db/operations", () => ({
  dailyProgressBackfillOps: { findState: jest.fn() },
  dailyProgressOps: { listForUserPage: jest.fn(), countValidForUser: jest.fn() },
  journalNoteOps: { listForUserPage: jest.fn() },
  puzzleAttemptOps: { countMaterializableFinalOfficialDailyAttempts: jest.fn() },
  puzzleOps: { findByIds: jest.fn() },
}));
jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: jest.fn(() => async () => ({ success: true, limit: 30, remaining: 29, reset: 0 })),
  getUserKey: (key: string) => `rate-limit:user:${key}`,
}));
jest.mock("@/lib/storekit/plus-entitlement", () => ({
  hasPlusEntitlement: jest.fn(async (request: Request) =>
    request.headers.get("X-Rebuzzle-StoreKit-Transaction") === "valid-test-proof"
  ),
}));

import * as dbOps from "@/db/operations";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { hasPlusEntitlement } from "@/lib/storekit/plus-entitlement";

type JournalRoute = { GET?: (request: Request) => Promise<Response> };

function getJournalGET(route: JournalRoute): NonNullable<JournalRoute["GET"]> {
  expect(route.GET).toEqual(expect.any(Function));
  return route.GET!;
}

async function loadJournalRoute(): Promise<JournalRoute> {
  try {
    return require("../route") as JournalRoute;
  } catch {
    return {};
  }
}

const state = {
  _id: "self",
  userId: "self",
  status: "complete" as const,
  cutoffAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-28T12:00:00.000Z"),
};
const progressRow = (puzzleDate: string, puzzleId = `puzzle-${puzzleDate}`) => ({
  userId: "self",
  puzzleDate,
  puzzleId,
  outcome: "solved",
  attempts: 2,
  hintCount: null,
  completedAt: new Date("2026-10-28T12:00:00.000Z"),
  timeZone: null,
});
const puzzle = (id: string) => ({
  id,
  puzzle: "MIND over MATTER",
  answer: "mind over matter",
  explanation: "The position says over.",
  puzzleType: "rebus",
  hints: ["Look at the layout."],
  visual: { mode: "composed", layout: "row", layers: [] },
});
const request = (url = "https://rebuzzle.test/api/user/journal?limit=100") =>
  new Request(url, {
    headers: { "X-Rebuzzle-StoreKit-Transaction": "valid-test-proof" },
  });

const progress = dbOps.dailyProgressOps as unknown as {
  listForUserPage: jest.Mock;
  countValidForUser: jest.Mock;
};
const backfills = dbOps.dailyProgressBackfillOps as unknown as { findState: jest.Mock };
const attempts = dbOps.puzzleAttemptOps as unknown as {
  countMaterializableFinalOfficialDailyAttempts: jest.Mock;
};
const puzzles = dbOps.puzzleOps as unknown as { findByIds: jest.Mock };
const notes = dbOps.journalNoteOps as unknown as { listForUserPage: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "self", isGuestToken: false } as never);
  jest.mocked(hasPlusEntitlement).mockResolvedValue(true);
  jest.mocked(rateLimit).mockReturnValue(
    (async () => ({ success: true, limit: 30, remaining: 29, reset: 0 })) as never
  );
  backfills.findState.mockResolvedValue(state);
  attempts.countMaterializableFinalOfficialDailyAttempts.mockResolvedValue(1);
  progress.countValidForUser.mockResolvedValue(1);
  progress.listForUserPage.mockResolvedValue([progressRow("2026-10-25")]);
  puzzles.findByIds.mockResolvedValue([puzzle("puzzle-2026-10-25")]);
  notes.listForUserPage.mockResolvedValue([
    {
      userId: "self",
      puzzleId: "puzzle-2026-10-25",
      note: "The spacing unlocked it.",
      revision: 2,
      updatedAt: new Date("2026-10-28T12:00:00.000Z"),
    },
  ]);
});

it("joins this account's completion and note to the published puzzle", async () => {
  const GET = getJournalGET(await loadJournalRoute());
  const response = await GET(request("https://rebuzzle.test/api/user/journal?limit=100&userId=victim"));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(progress.listForUserPage).toHaveBeenCalledWith("self", { limit: 101 });
  expect(progress.countValidForUser).toHaveBeenCalledWith("self");
  expect(backfills.findState).toHaveBeenCalledWith("self");
  expect(attempts.countMaterializableFinalOfficialDailyAttempts).toHaveBeenCalledWith("self");
  expect(puzzles.findByIds).toHaveBeenCalledWith(["puzzle-2026-10-25"]);
  expect(notes.listForUserPage).toHaveBeenCalledWith("self", ["puzzle-2026-10-25"]);
  expect(body).toMatchObject({
    success: true,
    historyStatus: "complete",
    nextCursor: null,
    entries: [
      {
        puzzleId: "puzzle-2026-10-25",
        puzzleDate: "2026-10-25",
        clue: "MIND over MATTER",
        answer: "mind over matter",
        explanation: "The position says over.",
        won: true,
        attempts: 2,
        hintsUsed: null,
        note: "The spacing unlocked it.",
        noteRevision: 2,
      },
    ],
  });
});

it("requires authentication before querying the journal", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);
  const response = await getJournalGET(await loadJournalRoute())(request());

  expect(response.status).toBe(401);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(progress.listForUserPage).not.toHaveBeenCalled();
});

it("keeps guest journals on-device", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce({ userId: "guest", isGuestToken: true } as never);
  const response = await getJournalGET(await loadJournalRoute())(request());

  expect(response.status).toBe(403);
  expect(progress.listForUserPage).not.toHaveBeenCalled();
});

it("requires current Plus proof before reading account data", async () => {
  jest.mocked(hasPlusEntitlement).mockResolvedValueOnce(false);
  const response = await getJournalGET(await loadJournalRoute())(request());

  expect(response.status).toBe(403);
  expect(progress.listForUserPage).not.toHaveBeenCalled();
});

it("rejects a malformed page cursor before querying history", async () => {
  const response = await getJournalGET(await loadJournalRoute())(
    request("https://rebuzzle.test/api/user/journal?before=2026-02-30")
  );

  expect(response.status).toBe(400);
  expect(progress.listForUserPage).not.toHaveBeenCalled();
});

it("clamps page size and returns the last included date as the next cursor", async () => {
  const history = Array.from({ length: 101 }, (_, index) => {
    const puzzleDate = new Date(Date.UTC(2026, 0, 101 - index)).toISOString().slice(0, 10);
    return progressRow(puzzleDate, `puzzle-${index}`);
  });
  progress.listForUserPage.mockResolvedValue(history);
  puzzles.findByIds.mockResolvedValue(history.map((row) => puzzle(row.puzzleId)));
  const response = await getJournalGET(await loadJournalRoute())(
    request("https://rebuzzle.test/api/user/journal?limit=900&before=2026-10-26")
  );
  const body = await response.json();

  expect(progress.listForUserPage).toHaveBeenCalledWith("self", {
    beforePuzzleDate: "2026-10-26",
    limit: 101,
  });
  expect(body.entries).toHaveLength(100);
  expect(body.nextCursor).toBe(history[99]?.puzzleDate);
});

it.each([
  ["scanning", "in_progress"],
  ["missing legacy rows", "in_progress"],
  ["failed", "failed"],
] as const)("reports %s history honestly", async (caseName, expected) => {
  if (caseName === "scanning") backfills.findState.mockResolvedValue({ ...state, status: "scanning" });
  if (caseName === "missing legacy rows") progress.countValidForUser.mockResolvedValue(0);
  if (caseName === "failed") backfills.findState.mockResolvedValue({ ...state, status: "failed" });

  const response = await getJournalGET(await loadJournalRoute())(request());

  expect((await response.json()).historyStatus).toBe(expected);
});

it("returns 429 before reading user history when rate-limited", async () => {
  jest.mocked(rateLimit).mockReturnValueOnce(
    (async () => ({ success: false, limit: 30, remaining: 0, reset: 1 })) as never
  );
  const response = await getJournalGET(await loadJournalRoute())(request());

  expect(response.status).toBe(429);
  expect(progress.listForUserPage).not.toHaveBeenCalled();
});
