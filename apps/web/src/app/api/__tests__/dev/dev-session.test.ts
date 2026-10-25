/**
 * Dev Mode actions replace today's puzzle for everyone, so production
 * restricts them to admins.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/admin-auth", () => ({ isAdmin: jest.fn() }));
jest.mock("@/ai/client", () => ({
  getGatewayAuthDiagnostics: jest.fn(() => ({})),
  probeGatewayAuth: jest.fn(),
}));
jest.mock("@/app/actions/regeneratePuzzleActions", () => ({ regenerateTodaysPuzzle: jest.fn() }));
jest.mock("@/db", () => ({
  db: {
    puzzleOps: { findTodaysPuzzle: jest.fn(async () => null) },
    puzzleAttemptOps: {
      hasTodayAttempt: jest.fn(async () => ({ hasAttempt: false })),
      clearAttemptsForDate: jest.fn(async () => 1),
    },
  },
}));

import { regenerateTodaysPuzzle } from "@/app/actions/regeneratePuzzleActions";
import { db } from "@/db";
import { isAdmin } from "@/lib/admin-auth";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { POST } from "../../dev/session/route";

const mockAuth = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;
const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;

function post(action: string) {
  return new Request("http://localhost/api/dev/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

describe("POST /api/dev/session in production", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    env.NODE_ENV = "production";
    mockAuth.mockResolvedValue({ userId: "guest_1", username: "Player1", email: "g@x" });
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
  });

  it("refuses regenerate for a non-admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await POST(post("regenerate"));
    expect(res.status).toBe(403);
    expect(regenerateTodaysPuzzle).not.toHaveBeenCalled();
  });

  it("refuses clearing the daily lock for a non-admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await POST(post("clear-attempts"));
    expect(res.status).toBe(403);
    expect(db.puzzleAttemptOps.clearAttemptsForDate).not.toHaveBeenCalled();
  });

  it("lets an admin clear their lock", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const res = await POST(post("clear-attempts"));
    expect(res.status).toBe(200);
    expect(db.puzzleAttemptOps.clearAttemptsForDate).toHaveBeenCalled();
  });

  it("requires sign-in", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(post("clear-attempts"));
    expect(res.status).toBe(401);
  });
});
