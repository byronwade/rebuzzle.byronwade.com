import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { getCollection } from "@/db/mongodb";
import { loadQualityDriftReport } from "../quality-drift-store";

jest.mock("@/db/mongodb");

const mockGetCollection = getCollection as jest.MockedFunction<typeof getCollection>;

describe("quality drift telemetry store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps both windows and excludes circuit-breaker reserve days from attempts", async () => {
    const pipelines: Record<string, unknown[]> = {};
    const fixtures: Record<string, Record<string, number>> = {
      aiFeedback: {
        fastTotal: 40,
        slowTotal: 100,
        fastPrimary: 4,
        slowPrimary: 12,
        fastSecondary: 1,
        slowSecondary: 2,
        fastTertiary: 0,
        slowTertiary: 1,
      },
      puzzleAttempts: {
        fastTotal: 80,
        slowTotal: 300,
        fastPrimary: 60,
        slowPrimary: 210,
        fastSecondary: 20,
        slowSecondary: 90,
      },
      generationAudits: {
        fastTotal: 5,
        slowTotal: 14,
        fastPrimary: 2,
        slowPrimary: 4,
      },
    };

    mockGetCollection.mockImplementation((name) => {
      const collectionName = String(name);
      return {
        aggregate: jest.fn((pipeline: unknown[]) => {
          pipelines[collectionName] = pipeline;
          return {
            toArray: async () => [fixtures[collectionName]],
          };
        }),
      } as never;
    });

    const report = await loadQualityDriftReport({
      now: new Date("2026-08-01T12:00:00.000Z"),
    });

    expect(report.fastWindow).toMatchObject({
      days: 7,
      qualityVotes: 40,
      dislikes: 4,
      unrecognizableReports: 1,
      ambiguityOrUnfairReports: 0,
      finalPlays: 80,
      solves: 60,
      abandons: 20,
      generationAttempts: 5,
      generationFailuresOrFallbacks: 2,
    });
    expect(report.slowWindow).toMatchObject({
      days: 28,
      qualityVotes: 100,
      finalPlays: 300,
      generationAttempts: 14,
      generationFailuresOrFallbacks: 4,
    });
    expect(pipelines.generationAudits?.[0]).toEqual({
      $match: expect.objectContaining({
        attemptedGeneration: { $ne: false },
      }),
    });
    expect(report.shouldUseReserve).toBe(true);
  });

  it("surfaces telemetry outages instead of reporting an empty healthy window", async () => {
    mockGetCollection.mockReturnValue({
      aggregate: jest.fn(() => ({
        toArray: async () => {
          throw new Error("telemetry unavailable");
        },
      })),
    } as never);

    await expect(loadQualityDriftReport()).rejects.toThrow("telemetry unavailable");
  });
});
