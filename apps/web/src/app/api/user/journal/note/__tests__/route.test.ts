jest.mock("@/db/operations", () => ({
  dailyProgressOps: { findForUserPuzzle: jest.fn() },
  journalNoteOps: { compareAndSet: jest.fn(), findForUser: jest.fn() },
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

type JournalNoteRoute = { PUT?: (request: Request) => Promise<Response> };

function getJournalPUT(route: JournalNoteRoute): NonNullable<JournalNoteRoute["PUT"]> {
  expect(route.PUT).toEqual(expect.any(Function));
  return route.PUT!;
}

async function loadJournalNoteRoute(): Promise<JournalNoteRoute> {
  try {
    return require("../route") as JournalNoteRoute;
  } catch {
    return {};
  }
}

const progress = dbOps.dailyProgressOps as unknown as { findForUserPuzzle: jest.Mock };
const notes = dbOps.journalNoteOps as unknown as {
  compareAndSet: jest.Mock;
  findForUser: jest.Mock;
};

const noteRequest = (body: unknown, url = "https://rebuzzle.test/api/user/journal/note") =>
  new Request(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Rebuzzle-StoreKit-Transaction": "valid-test-proof",
    },
    body: JSON.stringify(body),
  });

const validBody = (overrides: Record<string, unknown> = {}) => ({
  puzzleId: "puzzle-2026-10-25",
  note: "The repeated shape was the turn.",
  expectedRevision: 0,
  ...overrides,
});

const savedNote = (note: string, revision: number) => ({
  userId: "self",
  puzzleId: "puzzle-2026-10-25",
  note,
  revision,
  updatedAt: new Date("2026-10-28T12:00:00.000Z"),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "self", isGuestToken: false } as never);
  jest.mocked(hasPlusEntitlement).mockResolvedValue(true);
  jest.mocked(rateLimit).mockReturnValue(
    (async () => ({ success: true, limit: 30, remaining: 29, reset: 0 })) as never
  );
  progress.findForUserPuzzle.mockResolvedValue({ userId: "self", puzzleId: "puzzle-2026-10-25" });
  notes.compareAndSet.mockResolvedValue(savedNote("The repeated shape was the turn.", 1));
  notes.findForUser.mockResolvedValue(null);
});

it("writes only the authenticated account's completed puzzle note", async () => {
  const PUT = getJournalPUT(await loadJournalNoteRoute());
  const response = await PUT(
    noteRequest(validBody(), "https://rebuzzle.test/api/user/journal/note?userId=victim")
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(progress.findForUserPuzzle).toHaveBeenCalledWith("self", "puzzle-2026-10-25");
  expect(notes.compareAndSet).toHaveBeenCalledWith({
    userId: "self",
    puzzleId: "puzzle-2026-10-25",
    note: "The repeated shape was the turn.",
    expectedRevision: 0,
    updatedAt: expect.any(Date),
  });
  expect(body).toMatchObject({
    success: true,
    note: "The repeated shape was the turn.",
    revision: 1,
    updatedAt: "2026-10-28T12:00:00.000Z",
  });
});

it("requires an authenticated registered account and Plus proof before database reads", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);
  expect((await getJournalPUT(await loadJournalNoteRoute())(noteRequest(validBody()))).status).toBe(401);
  expect(progress.findForUserPuzzle).not.toHaveBeenCalled();

  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce({ userId: "guest", isGuestToken: true } as never);
  expect((await getJournalPUT(await loadJournalNoteRoute())(noteRequest(validBody()))).status).toBe(403);
  expect(progress.findForUserPuzzle).not.toHaveBeenCalled();

  jest.mocked(hasPlusEntitlement).mockResolvedValueOnce(false);
  expect((await getJournalPUT(await loadJournalNoteRoute())(noteRequest(validBody()))).status).toBe(403);
  expect(progress.findForUserPuzzle).not.toHaveBeenCalled();
});

it("rejects a note for a puzzle the account has not completed", async () => {
  progress.findForUserPuzzle.mockResolvedValueOnce(null);
  const response = await getJournalPUT(await loadJournalNoteRoute())(noteRequest(validBody()));

  expect(response.status).toBe(403);
  expect(notes.compareAndSet).not.toHaveBeenCalled();
});

it.each([
  ["an unknown field", validBody({ answer: "spoiler", userId: "victim" })],
  ["an invalid puzzle ID", validBody({ puzzleId: "../victim" })],
  ["a negative revision", validBody({ expectedRevision: -1 })],
  ["a fractional revision", validBody({ expectedRevision: 0.5 })],
  ["an oversized note", validBody({ note: "x".repeat(10_001) })],
] as const)("rejects %s without saving", async (_caseName, body) => {
  const response = await getJournalPUT(await loadJournalNoteRoute())(noteRequest(body));

  expect(response.status).toBe(400);
  expect(notes.compareAndSet).not.toHaveBeenCalled();
});

it("accepts the exact 10,000-scalar and 40 KB UTF-8 note boundary", async () => {
  const note = "🧠".repeat(10_000);
  const response = await getJournalPUT(await loadJournalNoteRoute())(
    noteRequest(validBody({ note }))
  );

  expect(response.status).toBe(200);
  expect(notes.compareAndSet).toHaveBeenCalledWith(
    expect.objectContaining({ note, expectedRevision: 0 })
  );
});

it("counts composed visible characters as one note character", async () => {
  const note = "e\u0301".repeat(10_000);
  const response = await getJournalPUT(await loadJournalNoteRoute())(
    noteRequest(validBody({ note }))
  );

  expect(response.status).toBe(200);
  expect(notes.compareAndSet).toHaveBeenCalledWith(expect.objectContaining({ note }));
});

it("enforces the UTF-8 byte cap even when the note is under the grapheme limit", async () => {
  const note = "👋🏽".repeat(5_001);
  const response = await getJournalPUT(await loadJournalNoteRoute())(
    noteRequest(validBody({ note }))
  );

  expect(response.status).toBe(400);
  expect(notes.compareAndSet).not.toHaveBeenCalled();
});

it("rejects a request body larger than 64 KB", async () => {
  const response = await getJournalPUT(await loadJournalNoteRoute())(
    new Request("https://rebuzzle.test/api/user/journal/note", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Rebuzzle-StoreKit-Transaction": "valid-test-proof" },
      body: `{"puzzleId":"puzzle-2026-10-25","note":"${"x".repeat(66_000)}","expectedRevision":0}`,
    })
  );

  expect(response.status).toBe(413);
  expect(notes.compareAndSet).not.toHaveBeenCalled();
});

it("cancels a chunked oversized body instead of draining the full stream", async () => {
  let pullCount = 0;
  let cancelled = false;
  const chunk = new TextEncoder().encode("x".repeat(40_000));
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        pullCount += 1;
        controller.enqueue(chunk);
        if (pullCount === 3) controller.close();
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 }
  );
  const request = new Request("https://rebuzzle.test/api/user/journal/note", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Rebuzzle-StoreKit-Transaction": "valid-test-proof",
    },
    body: stream,
    duplex: "half",
  } as RequestInit);

  const response = await getJournalPUT(await loadJournalNoteRoute())(request);

  expect(response.status).toBe(413);
  expect(cancelled).toBe(true);
  expect(pullCount).toBeLessThan(3);
});

it("rejects an oversized declared body before reading its stream", async () => {
  let pullCount = 0;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        pullCount += 1;
        controller.enqueue(new TextEncoder().encode(JSON.stringify(validBody())));
        controller.close();
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 }
  );
  const request = new Request("https://rebuzzle.test/api/user/journal/note", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": "70000",
      "X-Rebuzzle-StoreKit-Transaction": "valid-test-proof",
    },
    body: stream,
    duplex: "half",
  } as RequestInit);

  const response = await getJournalPUT(await loadJournalNoteRoute())(request);

  expect(response.status).toBe(413);
  expect(pullCount).toBe(0);
  expect(cancelled).toBe(true);
});

it("returns the canonical current note on a stale compare-and-set", async () => {
  notes.compareAndSet.mockResolvedValueOnce(null);
  notes.findForUser.mockResolvedValueOnce(savedNote("The other device's thought.", 3));
  const response = await getJournalPUT(await loadJournalNoteRoute())(
    noteRequest(validBody({ expectedRevision: 2 }))
  );
  const body = await response.json();

  expect(response.status).toBe(409);
  expect(body).toMatchObject({ currentNote: "The other device's thought.", currentRevision: 3 });
});

it("stores an empty note as a revisioned deletion tombstone", async () => {
  notes.compareAndSet.mockResolvedValueOnce(savedNote("", 4));
  const response = await getJournalPUT(await loadJournalNoteRoute())(
    noteRequest(validBody({ note: "", expectedRevision: 3 }))
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(notes.compareAndSet).toHaveBeenCalledWith(
    expect.objectContaining({ note: "", expectedRevision: 3 })
  );
  expect(body).toMatchObject({ note: "", revision: 4 });
});
