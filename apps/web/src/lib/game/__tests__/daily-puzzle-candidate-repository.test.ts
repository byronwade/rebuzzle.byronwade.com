const mockCollection = {
  insertOne: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
};

jest.mock("@/db/mongodb", () => ({
  getCollection: jest.fn(() => mockCollection),
}));

import { createMongoDailyPuzzleCandidateRepository } from "../daily-puzzle-candidate-repository";

const candidate = {
  id: "candidate-1",
  generationKey: "2026-10-29",
  policyVersion: "human-reviewed-daily-v1",
  status: "reviewing" as const,
  payload: {
    puzzleDisplay: "T E E F",
    puzzleType: "rebus",
    answer: "two left feet",
    difficulty: 7,
    category: "phrases_and_idioms",
    explanation: "Read each word in reverse, then count the two feet.",
    hints: ["Look at the direction", "Read the clue twice"],
    aiGenerated: true,
  },
  createdAt: new Date("2026-10-28T00:00:00Z"),
  updatedAt: new Date("2026-10-28T00:00:00Z"),
};

describe("daily puzzle candidate repository", () => {
  const repository = createMongoDailyPuzzleCandidateRepository();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
    });
  });

  it("returns the existing candidate when a generation retry hits the unique key", async () => {
    mockCollection.insertOne.mockRejectedValueOnce({ code: 11000 });
    mockCollection.findOne.mockResolvedValueOnce(candidate);

    await expect(repository.insert(candidate)).resolves.toEqual(candidate);
    expect(mockCollection.findOne).toHaveBeenCalledWith({
      generationKey: candidate.generationKey,
    });
  });

  it("claims an admitted candidate for one UTC date with a compare-and-set", async () => {
    const assigned = {
      ...candidate,
      status: "assigned",
      assignedDate: "2026-10-30",
    };
    mockCollection.findOneAndUpdate.mockResolvedValueOnce(assigned);

    await expect(
      repository.claimReadyForDate({
        id: candidate.id,
        dateString: "2026-10-30",
      })
    ).resolves.toEqual(assigned);
    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { id: candidate.id, status: "ready", assignedDate: { $exists: false } },
      {
        $set: {
          status: "assigned",
          assignedDate: "2026-10-30",
          updatedAt: expect.any(Date),
        },
        $inc: { statusVersion: 1 },
      },
      { returnDocument: "after" }
    );
  });

  it("persists per-candidate admission evidence with the ready transition", async () => {
    const humanEvidence = {
      contractVersion: "puzzle-playtest-v3",
      qualifiedDecisions: 20,
      profileCoverage: [
        { profileId: "compact-320", decisions: 5 },
        { profileId: "mobile-375", decisions: 5 },
        { profileId: "mobile-375-medium", decisions: 5 },
        { profileId: "desktop-768", decisions: 5 },
      ],
      correct: 15,
      solveRate: 0.75,
      solveRateLowerBound: 0.52,
      expectedSolveFloor: 0.35,
      ambiguityReports: 0,
      visualFailureReports: 0,
      admittedAt: "2026-10-28T00:00:00.000Z",
    };
    mockCollection.findOneAndUpdate.mockResolvedValueOnce({
      ...candidate,
      status: "ready",
      humanEvidence,
    });

    await expect(
      repository.markReady({
        id: candidate.id,
        expectedStatusVersion: 0,
        updatedAt: new Date("2026-10-28T00:00:00Z"),
        humanEvidence,
      })
    ).resolves.toMatchObject({ status: "ready", humanEvidence });
    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { id: candidate.id, status: "reviewing", statusVersion: 0 },
      {
        $set: { status: "ready", humanEvidence, updatedAt: expect.any(Date) },
        $inc: { statusVersion: 1 },
      },
      { returnDocument: "after" }
    );
  });

  it("recovers the same candidate assignment after a concurrent date claim", async () => {
    const assigned = {
      ...candidate,
      status: "assigned",
      assignedDate: "2026-10-30",
    };
    mockCollection.findOneAndUpdate.mockRejectedValueOnce({ code: 11000 });
    mockCollection.findOne.mockResolvedValueOnce(assigned);

    await expect(
      repository.claimReadyForDate({
        id: "candidate-2",
        dateString: "2026-10-30",
      })
    ).resolves.toEqual(assigned);
    expect(mockCollection.findOne).toHaveBeenCalledWith({
      assignedDate: "2026-10-30",
    });
  });

  it("marks publication only for the candidate already assigned to that date", async () => {
    mockCollection.findOneAndUpdate.mockResolvedValueOnce({
      ...candidate,
      status: "published",
      assignedDate: "2026-10-30",
      publishedPuzzleId: "puzzle-1",
    });

    await expect(
      repository.markPublished({
        id: candidate.id,
        dateString: "2026-10-30",
        puzzleId: "puzzle-1",
        updatedAt: new Date("2026-10-30T00:00:00Z"),
      })
    ).resolves.toMatchObject({
      status: "published",
      publishedPuzzleId: "puzzle-1",
    });
    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { id: candidate.id, status: "assigned", assignedDate: "2026-10-30" },
      {
        $set: {
          status: "published",
          publishedPuzzleId: "puzzle-1",
          updatedAt: expect.any(Date),
        },
        $inc: { statusVersion: 1 },
      },
      { returnDocument: "after" }
    );
  });

  it("releases a skipped assignment so another reviewed candidate can fill the date", async () => {
    mockCollection.findOneAndUpdate.mockResolvedValueOnce({
      ...candidate,
      status: "rejected",
      rejectionReason: "answer already used",
    });

    await repository.skip({
      id: candidate.id,
      reason: "answer already used",
      updatedAt: new Date("2026-10-30T00:00:00Z"),
    });

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { id: candidate.id, status: { $in: ["reviewing", "ready", "assigned"] } },
      {
        $set: {
          status: "rejected",
          rejectionReason: "answer already used",
          updatedAt: expect.any(Date),
        },
        $inc: { statusVersion: 1 },
        $unset: { assignedDate: "" },
      },
      { returnDocument: "after" }
    );
  });
});
