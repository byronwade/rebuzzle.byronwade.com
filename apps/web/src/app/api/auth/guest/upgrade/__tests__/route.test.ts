jest.mock("@/db", () => ({
  db: {
    userOps: {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      isUsernameTaken: jest.fn(),
      convertGuestToUser: jest.fn(),
    },
  },
}));
jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/auth", () => ({ verifyUserCredentials: jest.fn() }));
jest.mock("@/lib/jwt", () => ({ signToken: jest.fn() }));
jest.mock("@/lib/password", () => ({ hashPassword: jest.fn() }));
jest.mock("@/lib/middleware/rate-limit", () => ({ rateLimiters: { auth: jest.fn() } }));

import { db } from "@/db";
import { verifyUserCredentials } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { signToken } from "@/lib/jwt";
import { rateLimiters } from "@/lib/middleware/rate-limit";
import { hashPassword } from "@/lib/password";

const guest = {
  id: "guest_123",
  username: "Player1234",
  email: "guest_token@guest.rebuzzle.local",
  isGuest: true,
  journeyTimeZone: "America/Los_Angeles",
};

async function upgrade(
  body: unknown = {
    username: "Curious Player",
    email: "curious@example.com",
    password: "sixteen?",
  }
) {
  const { POST } = await import("../route");
  return POST(
    new Request("https://example.com/api/auth/guest/upgrade", {
      method: "POST",
      headers: { Authorization: "Bearer guest-token" },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(rateLimiters.auth).mockResolvedValue({ success: true } as never);
  jest.mocked(getAuthenticatedUser).mockResolvedValue({
    userId: guest.id,
    email: guest.email,
    username: guest.username,
    isGuestToken: true,
  } as never);
  jest.mocked(db.userOps.findById).mockResolvedValue(guest as never);
  jest.mocked(db.userOps.findByEmail).mockResolvedValue(null);
  jest.mocked(db.userOps.isUsernameTaken).mockResolvedValue(false);
  jest.mocked(db.userOps.convertGuestToUser).mockResolvedValue({
    ...guest,
    username: "Curious Player",
    email: "curious@example.com",
    isGuest: false,
  } as never);
  jest.mocked(verifyUserCredentials).mockResolvedValue({ valid: false, user: null } as never);
  jest.mocked(hashPassword).mockResolvedValue("password-hash");
  jest.mocked(signToken).mockResolvedValue("member-token");
});

it("requires an authenticated guest identity", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValue(null);

  expect((await upgrade()).status).toBe(401);
  expect(db.userOps.convertGuestToUser).not.toHaveBeenCalled();
});

it("converts the authenticated guest in place and returns a native bearer token", async () => {
  const response = await upgrade();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.user.id).toBe(guest.id);
  expect(body.token).toBe("member-token");
  expect(body.user.isGuest).toBe(false);
  expect(db.userOps.convertGuestToUser).toHaveBeenCalledWith(guest.id, {
    username: "Curious Player",
    email: "curious@example.com",
    passwordHash: "password-hash",
  });
  expect(signToken).toHaveBeenCalledWith({
    userId: guest.id,
    username: "Curious Player",
    email: "curious@example.com",
    isGuest: false,
  });
  expect(getAuthenticatedUser).toHaveBeenCalledWith(expect.any(Request), {
    allowConvertedGuestToken: true,
  });
});

it("rejects a non-guest member token", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValue({
    userId: "member_123",
    email: "member@example.com",
    username: "Member",
    isGuestToken: false,
  } as never);
  jest.mocked(db.userOps.findById).mockResolvedValue({
    ...guest,
    id: "member_123",
    email: "member@example.com",
    isGuest: false,
  } as never);

  expect((await upgrade()).status).toBe(403);
  expect(db.userOps.convertGuestToUser).not.toHaveBeenCalled();
});

it("rejects an email already owned by another account", async () => {
  jest
    .mocked(db.userOps.findByEmail)
    .mockResolvedValue({ id: "someone-else", isGuest: false } as never);

  expect((await upgrade()).status).toBe(409);
  expect(hashPassword).not.toHaveBeenCalled();
  expect(db.userOps.convertGuestToUser).not.toHaveBeenCalled();
});

it("turns a concurrent unique email or username conflict into a signup conflict", async () => {
  jest
    .mocked(db.userOps.convertGuestToUser)
    .mockRejectedValue(Object.assign(new Error("duplicate key"), { code: 11000 }));

  expect((await upgrade()).status).toBe(409);
  expect(signToken).not.toHaveBeenCalled();
});

it("rejects invalid signup fields before hashing a password", async () => {
  expect((await upgrade({ username: "x", email: "bad", password: "tiny" })).status).toBe(400);
  expect(hashPassword).not.toHaveBeenCalled();
  expect(db.userOps.convertGuestToUser).not.toHaveBeenCalled();
});

it("rejects the internal guest email domain for a real account", async () => {
  expect(
    (
      await upgrade({
        username: "Curious Player",
        email: "player@guest.rebuzzle.local",
        password: "sixteen?",
      })
    ).status
  ).toBe(400);
  expect(hashPassword).not.toHaveBeenCalled();
});

it("allows a lost-response retry only with credentials for the same upgraded identity", async () => {
  const upgraded = {
    ...guest,
    username: "Curious Player",
    email: "curious@example.com",
    isGuest: false,
  };
  jest.mocked(db.userOps.findById).mockResolvedValue(upgraded as never);
  jest.mocked(db.userOps.findByEmail).mockResolvedValue(upgraded as never);
  jest.mocked(verifyUserCredentials).mockResolvedValue({ valid: true, user: upgraded } as never);

  const response = await upgrade();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.user.id).toBe(guest.id);
  expect(body.token).toBe("member-token");
  expect(verifyUserCredentials).toHaveBeenCalledWith("curious@example.com", "sixteen?");
  expect(db.userOps.convertGuestToUser).not.toHaveBeenCalled();
});

it("accepts a concurrent conversion only after verifying the same resulting account", async () => {
  const upgraded = {
    ...guest,
    username: "Curious Player",
    email: "curious@example.com",
    isGuest: false,
  };
  jest
    .mocked(db.userOps.findById)
    .mockResolvedValueOnce(guest as never)
    .mockResolvedValueOnce(upgraded as never);
  jest.mocked(db.userOps.convertGuestToUser).mockResolvedValue(null);
  jest.mocked(verifyUserCredentials).mockResolvedValue({ valid: true, user: upgraded } as never);

  const response = await upgrade();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.user.id).toBe(guest.id);
  expect(verifyUserCredentials).toHaveBeenCalledWith("curious@example.com", "sixteen?");
});

it("does not let a stale guest token retry against a different account", async () => {
  const upgraded = {
    ...guest,
    username: "Other Player",
    email: "other@example.com",
    isGuest: false,
  };
  jest.mocked(db.userOps.findById).mockResolvedValue(upgraded as never);

  expect((await upgrade()).status).toBe(409);
  expect(verifyUserCredentials).not.toHaveBeenCalled();
});
