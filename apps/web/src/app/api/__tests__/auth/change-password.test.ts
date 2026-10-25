/**
 * Change password must act only on the signed-in account.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const findOne = jest.fn<(query: unknown) => Promise<unknown>>();

jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/db/mongodb", () => ({ getCollection: () => ({ findOne }) }));
jest.mock("@/db", () => ({ db: { userOps: { update: jest.fn() } } }));
jest.mock("@/lib/password", () => ({
  hashPassword: jest.fn(async () => "new-hash"),
  verifyPassword: jest.fn(async () => true),
}));
jest.mock("@/lib/notifications/email-service", () => ({
  sendPasswordChangeEmail: jest.fn(async () => ({ success: true })),
}));

import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { POST } from "../../auth/change-password/route";

const mockAuth = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;

function request(body: unknown) {
  return new Request("http://localhost/api/auth/change-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/change-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects signed-out requests", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      request({ userId: "victim", currentPassword: "guess1", newPassword: "newpass1" })
    );
    expect(res.status).toBe(401);
    expect(findOne).not.toHaveBeenCalled();
  });

  it("ignores a userId in the body and changes the signed-in account", async () => {
    mockAuth.mockResolvedValue({ userId: "me", username: "me", email: "me@x.com" });
    findOne.mockResolvedValue({ id: "me", email: "me@x.com", username: "me", passwordHash: "h" });
    const res = await POST(
      request({ userId: "victim", currentPassword: "oldpass1", newPassword: "newpass1" })
    );
    expect(res.status).toBe(200);
    expect(findOne).toHaveBeenCalledWith({ id: "me" });
    expect(db.userOps.update).toHaveBeenCalledWith("me", { passwordHash: "new-hash" });
  });
});
