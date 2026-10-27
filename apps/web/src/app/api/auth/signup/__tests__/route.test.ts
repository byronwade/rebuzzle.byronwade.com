jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({ get: () => undefined }),
}));
jest.mock("@/db", () => ({
  db: {
    userOps: { findByEmail: jest.fn(), isUsernameTaken: jest.fn() },
    userStatsOps: { findByUserId: jest.fn(), create: jest.fn() },
  },
}));
jest.mock("@/db/analytics-ops", () => ({ analyticsEventOps: { create: jest.fn() } }));
jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));
jest.mock("@/lib/auth", () => ({ createOrUpdateUser: jest.fn() }));
jest.mock("@/lib/cookies", () => ({ setAuthCookie: jest.fn() }));
jest.mock("@/lib/jwt", () => ({ signToken: jest.fn() }));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimiters: { auth: jest.fn().mockResolvedValue({ success: true }) },
}));
jest.mock("@/lib/notifications/email-service", () => ({ sendSignupWelcomeEmail: jest.fn() }));
jest.mock("@/lib/password", () => ({ hashPassword: jest.fn() }));

import { db } from "@/db";
import { hashPassword } from "@/lib/password";
import { POST } from "../route";

it("rejects the reserved synthetic guest email domain before account creation", async () => {
  const response = await POST(
    new Request("https://example.com/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "Hayley",
        email: "Taken@Guest.Rebuzzle.Local",
        password: "secure-password",
      }),
    })
  );

  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    error: "Choose an email address outside the guest domain",
  });
  expect(db.userOps.findByEmail).not.toHaveBeenCalled();
  expect(hashPassword).not.toHaveBeenCalled();
});
