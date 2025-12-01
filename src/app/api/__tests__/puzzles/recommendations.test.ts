/**
 * Recommendations API Endpoint Tests
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NextRequest } from "next/server";
import { GET } from "../../puzzles/recommendations/route";

// Mock the recommendations service
jest.mock("@/ai/services/recommendations");

import { getPersonalizedPuzzles } from "@/ai/services/recommendations";

const mockGetPersonalizedPuzzles =
  getPersonalizedPuzzles as jest.MockedFunction<typeof getPersonalizedPuzzles>;

describe("GET /api/puzzles/recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    const request = new NextRequest(
      "http://localhost:3000/api/puzzles/recommendations?userId=user-1&limit=5"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.recommendations).toEqual(mockPuzzles);
    expect(mockGetPersonalizedPuzzles).toHaveBeenCalledWith("user-1", 10); // Default limit is 10
  });

  it("should return 400 if userId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/puzzles/recommendations"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.error).toContain("userId");
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
