jest.mock("@/db", () => ({ db: { userOps: { findById: jest.fn() } } }));
jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));

import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { GET } from "../route";

it("returns the stored member role in the refreshed session", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValue({
    userId: "member-1",
    username: "Member",
    email: "member@guest.rebuzzle.local",
    isGuestToken: false,
  });
  jest.mocked(db.userOps.findById).mockResolvedValue({
    id: "member-1",
    username: "Member",
    email: "member@guest.rebuzzle.local",
    isGuest: false,
  } as never);

  const response = await GET(new Request("https://example.com/api/auth/session"));

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    authenticated: true,
    user: { id: "member-1", isGuest: false },
  });
});
