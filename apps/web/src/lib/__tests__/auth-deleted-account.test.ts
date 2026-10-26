jest.mock("@/db", () => ({ db: { userOps: { findById: jest.fn() } } }));
jest.mock("@/lib/jwt", () => ({
  verifyToken: jest.fn().mockResolvedValue({ userId: "deleted", iat: 100 }),
}));
jest.mock("@/lib/auth/session-revocation", () => ({
  isSessionRevoked: jest.fn().mockResolvedValue(false),
  issuedBeforePasswordChange: jest.requireActual("@/lib/auth/session-revocation")
    .issuedBeforePasswordChange,
}));

import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

it("rejects deleted accounts even when the revocation cache is stale", async () => {
  jest.mocked(db.userOps.findById).mockResolvedValue(null);
  expect(
    await getAuthenticatedUser(
      new Request("https://example.com", { headers: { Authorization: "Bearer old-token" } })
    )
  ).toBeNull();
});
