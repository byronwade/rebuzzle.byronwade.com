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
