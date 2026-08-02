const getAuthenticatedUser = jest.fn();
const findUserById = jest.fn();
const findStatsByUserId = jest.fn();
const getNext = jest.fn();
const submitReview = jest.fn();

jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser }));
jest.mock("@/db", () => ({
  db: {
    userOps: { findById: findUserById },
    userStatsOps: { findByUserId: findStatsByUserId },
  },
}));
jest.mock("@/ai/puzzle-agent/review/puzzle-playtest-server", () => ({
  puzzlePlaytestService: { getNext, submitReview },
}));

import { PuzzlePlaytestConflictError } from "@/ai/puzzle-agent/review/puzzle-playtest-service";
import { GET, POST } from "../route";

describe("registered-player blind puzzle playtest route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findStatsByUserId.mockResolvedValue({ totalGames: 3 });
  });

  it("rejects anonymous and guest reviewers", async () => {
    getAuthenticatedUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ userId: "guest-1" });
    findUserById.mockResolvedValue({
      id: "guest-1",
      email: "guest-1@guest.rebuzzle.local",
      isGuest: true,
      createdAt: new Date(0),
    });

    const anonymous = await GET(new Request("https://rebuzzle.test/api/puzzle-playtests"));
    const guest = await GET(new Request("https://rebuzzle.test/api/puzzle-playtests"));

    expect([anonymous.status, guest.status]).toEqual([401, 401]);
    expect(getNext).not.toHaveBeenCalled();
  });

  it("returns only the blind specimen to a registered player", async () => {
    getAuthenticatedUser.mockResolvedValue({ userId: "player-1" });
    findUserById.mockResolvedValue({
      id: "player-1",
      email: "player@example.com",
      createdAt: new Date(0),
    });
    getNext.mockResolvedValue({
      specimen: {
        fixtureId: "opaque",
        imageDataUrl: "data:image/png;base64,AQID",
        width: 320,
        height: 120,
      },
      progress: { completed: 0, available: 1, remaining: 1, complete: false },
    });

    const response = await GET(new Request("https://rebuzzle.test/api/puzzle-playtests"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getNext).toHaveBeenCalledWith("player-1");
    expect(Object.keys(body.specimen).sort()).toEqual([
      "fixtureId",
      "height",
      "imageDataUrl",
      "width",
    ]);
    expect(JSON.stringify(body)).not.toContain("answer");
    expect(JSON.stringify(body)).not.toContain("candidateId");
    expect(JSON.stringify(body)).not.toContain("profileId");
  });

  it("rejects fresh or inexperienced accounts as panel evidence", async () => {
    getAuthenticatedUser.mockResolvedValue({ userId: "player-1" });
    findUserById.mockResolvedValue({
      id: "player-1",
      email: "player@example.com",
      createdAt: new Date(),
    });
    findStatsByUserId.mockResolvedValue({ totalGames: 2 });

    const response = await GET(new Request("https://rebuzzle.test/api/puzzle-playtests"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("24-hour-old account");
    expect(getNext).not.toHaveBeenCalled();
  });

  it("attributes an immutable answer without returning correctness", async () => {
    getAuthenticatedUser.mockResolvedValue({ userId: "player-1" });
    findUserById.mockResolvedValue({
      id: "player-1",
      email: "player@example.com",
      createdAt: new Date(0),
    });
    submitReview.mockResolvedValue({ completed: 1, available: 1, remaining: 0, complete: true });

    const response = await POST(
      new Request("https://rebuzzle.test/api/puzzle-playtests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fixtureId: "opaque",
          guess: "sunflower",
          confidence: 4,
          elapsedMs: 12_000,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(submitReview).toHaveBeenCalledWith({
      reviewerId: "player-1",
      fixtureId: "opaque",
      guess: "sunflower",
      gaveUp: false,
      failureReason: undefined,
      confidence: 4,
      elapsedMs: 12_000,
    });
    expect(JSON.stringify(body)).not.toContain("correct");
    expect(JSON.stringify(body)).not.toContain("answer");
  });

  it("preserves the one-review-per-candidate conflict", async () => {
    getAuthenticatedUser.mockResolvedValue({ userId: "player-1" });
    findUserById.mockResolvedValue({
      id: "player-1",
      email: "player@example.com",
      createdAt: new Date(0),
    });
    submitReview.mockRejectedValue(new PuzzlePlaytestConflictError());

    const response = await POST(
      new Request("https://rebuzzle.test/api/puzzle-playtests", {
        method: "POST",
        body: JSON.stringify({ fixtureId: "opaque", guess: "sunflower" }),
      })
    );

    expect(response.status).toBe(409);
  });
});
