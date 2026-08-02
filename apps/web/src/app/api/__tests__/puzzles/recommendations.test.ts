/**
 * Recommendations API Endpoint Tests
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NextRequest } from "next/server";

// Mock the recommendations service
jest.mock("@/ai/services/recommendations", () => ({
  getPersonalizedPuzzles: jest.fn(),
  recommendNextPuzzle: jest.fn(),
}));
jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: jest.fn(),
}));

import { getPersonalizedPuzzles } from "@/ai/services/recommendations";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { GET } from "../../puzzles/recommendations/route";

const mockGetPersonalizedPuzzles = getPersonalizedPuzzles as jest.MockedFunction<
  typeof getPersonalizedPuzzles
>;
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<
  typeof getAuthenticatedUser
>;

describe("GET /api/puzzles/recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({ userId: "user-1" } as never);
  });

  it("should return personalized puzzles for valid user", async () => {
    const mockPuzzles = [
      {
        id: "puzzle-1",
        puzzle: "Test puzzle",
        answer: "Answer",
        difficulty: "medium",
        publishedAt: new Date(),
        createdAt: new Date(),
        active: true,
      },
    ];

    mockGetPersonalizedPuzzles.mockResolvedValue(mockPuzzles as any);

    const request = new NextRequest("http://localhost:3000/api/puzzles/recommendations?limit=5");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.recommendations[0]).toMatchObject({ id: "puzzle-1", puzzle: "Test puzzle" });
    expect(data.recommendations[0].answer).toBeUndefined();
    expect(mockGetPersonalizedPuzzles).toHaveBeenCalledWith("user-1", 5);
  });

  it("should return 401 if the request is unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const request = new NextRequest("http://localhost:3000/api/puzzles/recommendations");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should handle errors gracefully", async () => {
    mockGetPersonalizedPuzzles.mockRejectedValue(new Error("Database error"));

    const request = new NextRequest(
      "http://localhost:3000/api/puzzles/recommendations?userId=user-1"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });
});
