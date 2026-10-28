import type { Filter } from "mongodb";
import type { DailyPuzzleCandidate, DailyPuzzleCandidateStatus } from "@/db/models";
import { getCollection } from "@/db/mongodb";

function candidates() {
  return getCollection<DailyPuzzleCandidate>("dailyPuzzleCandidates");
}

export type DailyPuzzleCandidateRepository = {
  insert(candidate: DailyPuzzleCandidate): Promise<DailyPuzzleCandidate>;
  findById(id: string): Promise<DailyPuzzleCandidate | null>;
  findByGenerationKey(generationKey: string): Promise<DailyPuzzleCandidate | null>;
  findAssignmentForDate(dateString: string): Promise<DailyPuzzleCandidate | null>;
  list(input?: {
    statuses?: DailyPuzzleCandidateStatus[];
    withoutPlaytestSubmission?: boolean;
    limit?: number;
  }): Promise<DailyPuzzleCandidate[]>;
  markPlaytestSubmitted(input: { id: string; submittedAt: Date }): Promise<DailyPuzzleCandidate | null>;
  markPlaytestSubmissionFailed(input: {
    id: string;
    message: string;
    updatedAt: Date;
  }): Promise<DailyPuzzleCandidate | null>;
  markReady(input: { id: string; expectedStatusVersion: number; updatedAt: Date }): Promise<DailyPuzzleCandidate | null>;
  claimReadyForDate(input: { id: string; dateString: string }): Promise<DailyPuzzleCandidate | null>;
  skip(input: { id: string; reason: string; updatedAt: Date }): Promise<DailyPuzzleCandidate | null>;
  markPublished(input: {
    id: string;
    dateString: string;
    puzzleId: string;
    updatedAt: Date;
  }): Promise<DailyPuzzleCandidate | null>;
};

const duplicateKey = (error: unknown) =>
  Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);

export function createMongoDailyPuzzleCandidateRepository(): DailyPuzzleCandidateRepository {
  return {
    async insert(candidate) {
      try {
        await candidates().insertOne(candidate);
        return candidate;
      } catch (error) {
        if (!duplicateKey(error)) throw error;
        const existing =
          (await candidates().findOne({ generationKey: candidate.generationKey })) ??
          (await candidates().findOne({ id: candidate.id }));
        if (existing) return existing;
        throw new Error("Daily candidate insert collided without a matching generation record", {
          cause: error,
        });
      }
    },

    async findById(id) {
      return candidates().findOne({ id });
    },

    async findByGenerationKey(generationKey) {
      return candidates().findOne({ generationKey });
    },

    async findAssignmentForDate(dateString) {
      return candidates().findOne({ assignedDate: dateString });
    },

    async list(input = {}) {
      const filter: Filter<DailyPuzzleCandidate> = {
        ...(input.statuses?.length ? { status: { $in: input.statuses } } : {}),
        ...(input.withoutPlaytestSubmission ? { playtestSubmittedAt: { $exists: false } } : {}),
      };
      return candidates()
        .find(filter)
        .sort({ createdAt: 1, id: 1 })
        .limit(Math.max(1, Math.min(500, input.limit ?? 100)))
        .toArray();
    },

    async markPlaytestSubmitted(input) {
      return candidates().findOneAndUpdate(
        { id: input.id, status: "reviewing" },
        {
          $set: { playtestSubmittedAt: input.submittedAt, updatedAt: input.submittedAt },
          $unset: { playtestSubmissionError: "" },
        },
        { returnDocument: "after" }
      );
    },

    async markPlaytestSubmissionFailed(input) {
      return candidates().findOneAndUpdate(
        { id: input.id, status: "reviewing" },
        {
          $set: {
            playtestSubmissionError: input.message.trim().slice(0, 500),
            updatedAt: input.updatedAt,
          },
        },
        { returnDocument: "after" }
      );
    },

    async markReady(input) {
      return candidates().findOneAndUpdate(
        {
          id: input.id,
          status: "reviewing",
          statusVersion: input.expectedStatusVersion,
        },
        {
          $set: { status: "ready", updatedAt: input.updatedAt },
          $inc: { statusVersion: 1 },
        },
        { returnDocument: "after" }
      );
    },

    async claimReadyForDate(input) {
      try {
        const claimed = await candidates().findOneAndUpdate(
          { id: input.id, status: "ready", assignedDate: { $exists: false } },
          {
            $set: { status: "assigned", assignedDate: input.dateString, updatedAt: new Date() },
            $inc: { statusVersion: 1 },
          },
          { returnDocument: "after" }
        );
        if (claimed) return claimed;
      } catch (error) {
        if (!duplicateKey(error)) throw error;
      }
      return this.findAssignmentForDate(input.dateString);
    },

    async skip(input) {
      return candidates().findOneAndUpdate(
        { id: input.id, status: { $in: ["reviewing", "ready", "assigned"] } },
        {
          $set: {
            status: "rejected",
            rejectionReason: input.reason.trim().slice(0, 500),
            updatedAt: input.updatedAt,
          },
          $inc: { statusVersion: 1 },
          $unset: { assignedDate: "" },
        },
        { returnDocument: "after" }
      );
    },

    async markPublished(input) {
      return candidates().findOneAndUpdate(
        { id: input.id, status: "assigned", assignedDate: input.dateString },
        {
          $set: {
            status: "published",
            publishedPuzzleId: input.puzzleId,
            updatedAt: input.updatedAt,
          },
          $inc: { statusVersion: 1 },
        },
        { returnDocument: "after" }
      );
    },
  };
}
