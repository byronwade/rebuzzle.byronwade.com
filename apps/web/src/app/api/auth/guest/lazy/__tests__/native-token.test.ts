jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/db/operations", () => ({
  userOps: { findById: jest.fn(), update: jest.fn() },
  userStatsOps: {},
}));
jest.mock("@/lib/auth/session-revocation", () => ({
  isSessionRevoked: jest.fn().mockResolvedValue(false),
}));
jest.mock("@/lib/jwt", () => ({
  signToken: jest.fn().mockResolvedValue("fresh-jwt"),
  verifyToken: jest.fn().mockResolvedValue({ userId: "guest" }),
}));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimiters: { guest: jest.fn().mockResolvedValue({ success: true }) },
}));
jest.mock("@/lib/services/guest-identification", () => ({
  extractClientIp: () => "ip",
  extractDeviceId: () => "device",
  hashIpAddress: () => "hash",
  identifyGuest: jest.fn(),
}));

import { cookies } from "next/headers";
import { userOps } from "@/db/operations";
import { signToken, verifyToken } from "@/lib/jwt";
import { identifyGuest } from "@/lib/services/guest-identification";
import { POST } from "../route";

const user = {
  id: "guest",
  username: "Guest",
  email: "g@guest.rebuzzle.local",
  isGuest: true,
  guestToken: "guest-secret",
};
beforeEach(() => {
  jest.mocked(userOps.findById).mockResolvedValue(user as never);
  jest
    .mocked(identifyGuest)
    .mockResolvedValue({ found: true, user, identifiedBy: "device" } as never);
});
it("returns a bearer token when issuing a guest session", async () => {
  jest.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
  expect(await (await POST(new Request("https://example.com"))).json()).toMatchObject({
    token: "fresh-jwt",
    success: true,
  });
  expect(signToken).toHaveBeenCalledWith({
    userId: user.id,
    username: user.username,
    email: user.email,
    isGuest: true,
  });
});
it("preserves the bearer token for an existing authenticated guest", async () => {
  jest.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
  expect(
    await (
      await POST(
        new Request("https://example.com", { headers: { Authorization: "Bearer existing-jwt" } })
      )
    ).json()
  ).toMatchObject({ token: "existing-jwt", alreadyAuthenticated: true });
});

it("does not reuse a converted guest token or silently create a replacement guest", async () => {
  jest.mocked(identifyGuest).mockClear();
  jest.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
  jest.mocked(verifyToken).mockResolvedValue({
    userId: "guest",
    username: "Guest",
    email: "g@guest.rebuzzle.local",
    isGuest: true,
  });
  jest.mocked(userOps.findById).mockResolvedValue({
    ...user,
    email: "member@example.com",
    isGuest: false,
  } as never);

  const response = await POST(
    new Request("https://example.com", {
      headers: { Authorization: "Bearer old-guest-jwt" },
    })
  );

  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({
    success: false,
    error: "This guest account was upgraded. Sign in to continue.",
  });
  expect(identifyGuest).not.toHaveBeenCalled();
});

it("rejects a legacy guest token after conversion when the synthetic email stayed unchanged", async () => {
  jest.mocked(identifyGuest).mockClear();
  jest.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
  jest.mocked(verifyToken).mockResolvedValue({
    userId: "guest",
    username: "Guest",
    email: user.email,
  });
  jest.mocked(userOps.findById).mockResolvedValue({ ...user, isGuest: false } as never);

  const response = await POST(
    new Request("https://example.com", {
      headers: { Authorization: "Bearer old-guest-jwt" },
    })
  );

  expect(response.status).toBe(409);
  expect(identifyGuest).not.toHaveBeenCalled();
});

it("uses an explicit member claim instead of inferring guest status from the email suffix", async () => {
  jest.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
  jest.mocked(verifyToken).mockResolvedValue({
    userId: "guest",
    username: "Member",
    email: user.email,
    isGuest: false,
  });
  jest.mocked(userOps.findById).mockResolvedValue({ ...user, isGuest: false } as never);

  const response = await POST(
    new Request("https://example.com", {
      headers: { Authorization: "Bearer member-jwt" },
    })
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ user: { isGuest: false } });
});
