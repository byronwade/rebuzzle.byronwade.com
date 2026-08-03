const getAuthenticatedUser = jest.fn();
const find = jest.fn();
const sort = jest.fn(() => ({ limit }));
const limit = jest.fn(() => ({ toArray }));
const toArray = jest.fn();
const updateOne = jest.fn();

jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUser(...args),
}));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimiters: { api: jest.fn(async () => ({ success: true })) },
}));
jest.mock("@/lib/api-validation", () => ({
  sanitizeId: (value: string) => value,
}));
jest.mock("@/db/mongodb", () => ({
  getCollection: () => ({
    find: (...args: unknown[]) => {
      find(...args);
      return { sort };
    },
    updateOne: (...args: unknown[]) => updateOne(...args),
  }),
}));

import { GET, PATCH } from "../route";

describe("in-app notifications API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sort.mockImplementation(() => ({ limit }));
    limit.mockImplementation(() => ({ toArray }));
  });

  it("rejects anonymous reads", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const response = await GET(new Request("https://rebuzzle.test/api/notifications/in-app"));
    expect(response.status).toBe(401);
  });

  it("returns unread inbox for the authenticated user", async () => {
    getAuthenticatedUser.mockResolvedValue({ userId: "u1" });
    toArray.mockResolvedValue([
      {
        id: "n1",
        type: "puzzle_ready",
        title: "Today's puzzle",
        message: "Ready",
        link: "/",
        createdAt: new Date("2026-08-03T16:00:00.000Z"),
      },
    ]);

    const response = await GET(new Request("https://rebuzzle.test/api/notifications/in-app"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.unreadCount).toBe(1);
    expect(body.notifications[0].id).toBe("n1");
    expect(find).toHaveBeenCalledWith({ userId: "u1", read: false });
  });

  it("marks a notification read only for the owner", async () => {
    getAuthenticatedUser.mockResolvedValue({ userId: "u1" });
    updateOne.mockResolvedValue({ matchedCount: 1 });

    const response = await PATCH(
      new Request("https://rebuzzle.test/api/notifications/in-app", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: "n1" }),
      })
    );
    expect(response.status).toBe(200);
    expect(updateOne).toHaveBeenCalledWith(
      { id: "n1", userId: "u1" },
      expect.objectContaining({ $set: expect.objectContaining({ read: true }) })
    );
  });
});
