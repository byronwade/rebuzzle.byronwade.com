jest.mock("@/db", () => ({ db: { userOps: { findById: jest.fn() } } }));
jest.mock("@/lib/jwt", () => ({ verifyToken: jest.fn() }));
jest.mock("@/lib/auth/session-revocation", () => ({
  issuedBeforePasswordChange: jest.fn().mockReturnValue(false),
}));

import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { verifyToken } from "@/lib/jwt";

const request = () =>
  new Request("https://example.com/api/user/progress", {
    headers: { Authorization: "Bearer guest-token" },
  });

const convertedUser = {
  id: "user-1",
  username: "byron",
  email: "byron@example.com",
  isGuest: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(db.userOps.findById).mockResolvedValue(convertedUser as never);
  jest.mocked(verifyToken).mockResolvedValue({
    userId: "user-1",
    username: "guest-user",
    email: "guest-user@guest.rebuzzle.local",
    isGuest: true,
    iat: 100,
  });
});

it("rejects a guest bearer token after its account is upgraded", async () => {
  await expect(getAuthenticatedUser(request())).resolves.toBeNull();
});

it("allows a converted guest token only for explicit credential-checked recovery", async () => {
  const result = await getAuthenticatedUser(request(), { allowConvertedGuestToken: true });

  expect(result).toMatchObject({ userId: "user-1", isGuestToken: true });
});

it("rejects legacy guest tokens without an explicit guest claim after conversion", async () => {
  jest.mocked(verifyToken).mockResolvedValue({
    userId: "user-1",
    username: "guest-user",
    email: "guest-user@guest.rebuzzle.local",
    iat: 100,
  });

  await expect(getAuthenticatedUser(request())).resolves.toBeNull();
});

it("keeps a member token valid when the member uses the reserved guest-like email suffix", async () => {
  jest.mocked(verifyToken).mockResolvedValue({
    userId: "user-1",
    username: "byron",
    email: "byron@guest.rebuzzle.local",
    isGuest: false,
    iat: 100,
  });
  jest.mocked(db.userOps.findById).mockResolvedValue({
    ...convertedUser,
    email: "byron@guest.rebuzzle.local",
  } as never);

  const result = await getAuthenticatedUser(request());

  expect(result).toMatchObject({ userId: "user-1", isGuestToken: false });
});
