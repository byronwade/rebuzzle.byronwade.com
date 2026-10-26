jest.mock("@/db", () => ({
  db: { userOps: { findById: jest.fn() } },
  getCollection: jest.fn(),
  getConnection: jest.fn(),
}));
jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/auth", () => ({ verifyUserCredentials: jest.fn() }));

import { db, getCollection, getConnection } from "@/db";
import { verifyUserCredentials } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

const deletes: Array<{ collection: string; filter: unknown }> = [];
async function remove(
  body: unknown = { password: "password", userId: "victim" },
  confirmed = true
) {
  const path = "../route";
  const route = await import(path);
  return route.DELETE(
    new Request("https://example.com/api/user/account", {
      method: "DELETE",
      headers: confirmed ? { "X-Rebuzzle-Confirm": "delete-account" } : {},
      body: JSON.stringify(body),
    })
  );
}
beforeEach(() => {
  deletes.length = 0;
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "self", issuedAt: 100 } as never);
  jest
    .mocked(db.userOps.findById)
    .mockResolvedValue({ id: "self", email: "self@example.com" } as never);
  jest
    .mocked(verifyUserCredentials)
    .mockResolvedValue({ valid: true, user: { id: "self" } } as never);
  jest.mocked(getConnection).mockResolvedValue({
    startSession: () => ({
      withTransaction: async (fn: () => Promise<void>) => fn(),
      endSession: async () => {},
    }),
  } as never);
  jest.mocked(getCollection).mockImplementation(((collection: string) => ({
    updateMany: async (filter: unknown, update: unknown) => {
      deletes.push({ collection, filter });
      expect(update).toEqual({
        $unset: {
          "metadata.createdByUserId": "",
          "metadata.attribution": "",
          "metadata.ugcSubmissionId": "",
        },
      });
    },
    deleteMany: async (filter: unknown) => {
      deletes.push({ collection, filter });
    },
    deleteOne: async (filter: unknown) => {
      deletes.push({ collection, filter });
    },
  })) as never);
});
it("deletes only the authenticated account and its owned records", async () => {
  expect((await remove()).status).toBe(200);
  expect(deletes).toContainEqual({ collection: "users", filter: { id: "self" } });
  expect(JSON.stringify(deletes)).not.toContain("victim");
  expect(deletes).toContainEqual({ collection: "puzzleAttempts", filter: { userId: "self" } });
});
it("requires authentication", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValue(null);
  expect((await remove()).status).toBe(401);
  expect(deletes).toEqual([]);
});
it("requires explicit header to prevent cross-origin cookie deletion", async () => {
  expect((await remove({}, false)).status).toBe(400);
  expect(deletes).toEqual([]);
});
it("requires current password for a registered account", async () => {
  jest.mocked(verifyUserCredentials).mockResolvedValue({ valid: false, user: null } as never);
  expect((await remove()).status).toBe(403);
  expect(deletes).toEqual([]);
});
it("rejects stale credentials even inside revocation cache TTL", async () => {
  jest
    .mocked(db.userOps.findById)
    .mockResolvedValue({ id: "self", passwordChangedAt: new Date(101000) } as never);
  expect((await remove()).status).toBe(401);
  expect(deletes).toEqual([]);
});

it("removes email-only subscriptions and published author attribution", async () => {
  await remove();
  expect(deletes).toContainEqual({
    collection: "emailSubscriptions",
    filter: { email: "self@example.com" },
  });
  expect(deletes).toContainEqual({
    collection: "puzzles",
    filter: { "metadata.createdByUserId": "self" },
  });
});

it("deletes identifying learning events with literal user-ID matching inside the transaction", async () => {
  const userId = "u.ser+[x]";
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId, issuedAt: 100 } as never);
  jest.mocked(db.userOps.findById).mockResolvedValue({ id: userId, isGuest: true } as never);
  const events = [
    { feedbackIds: ["attempt:p:u.ser+[x]"] },
    { feedbackIds: ["attempt:p:uXserrrx"] },
    { feedbackIds: ["attempt:p:other"] },
  ];
  let remaining = events;
  const original = jest.mocked(getCollection).getMockImplementation()!;
  jest.mocked(getCollection).mockImplementation(((name: string) =>
    name === "aiLearningEvents"
      ? {
          deleteMany: async (filter: { feedbackIds: RegExp }, options: { session: unknown }) => {
            expect(options.session).toBeDefined();
            remaining = remaining.filter(
              (event) => !event.feedbackIds.some((id) => filter.feedbackIds.test(id))
            );
          },
        }
      : original(name)) as never);
  expect((await remove()).status).toBe(200);
  expect(remaining).toEqual(events.slice(1));
});
