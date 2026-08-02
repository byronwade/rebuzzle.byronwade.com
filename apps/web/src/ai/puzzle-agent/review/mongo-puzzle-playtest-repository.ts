import type { Filter } from "mongodb";
import type { PuzzlePlaytestCandidate, PuzzlePlaytestReview } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import type { PuzzlePlaytestRepository } from "./puzzle-playtest-service";

function candidates() {
  return getCollection<PuzzlePlaytestCandidate>("puzzlePlaytestCandidates");
}

function reviews() {
  return getCollection<PuzzlePlaytestReview>("puzzlePlaytestReviews");
}

export function createMongoPuzzlePlaytestRepository(): PuzzlePlaytestRepository {
  return {
    async insertCandidate(candidate) {
      try {
        await candidates().insertOne(candidate);
        return true;
      } catch (error) {
        if ((error as { code?: number }).code === 11000) return false;
        throw error;
      }
    },

    async findCandidateByPuzzleId(input) {
      return candidates().findOne(input);
    },

    async findCandidateById(id) {
      return candidates().findOne({ id });
    },

    async listCandidates(input) {
      const filter: Filter<PuzzlePlaytestCandidate> = {
        contractVersion: input.contractVersion,
        ...(input.statuses?.length ? { status: { $in: input.statuses } } : {}),
        ...(input.evidenceRoles?.length ? { evidenceRole: { $in: input.evidenceRoles } } : {}),
      };
      return candidates()
        .find(filter)
        .sort({ createdAt: 1, id: 1 })
        .limit(Math.max(1, Math.min(2000, input.limit ?? 200)))
        .toArray();
    },

    async listReviews(input) {
      const filter: Filter<PuzzlePlaytestReview> = {
        contractVersion: input.contractVersion,
        ...(input.reviewerId ? { reviewerId: input.reviewerId } : {}),
        ...(input.candidateIds?.length ? { candidateId: { $in: input.candidateIds } } : {}),
      };
      return reviews().find(filter).sort({ createdAt: 1, id: 1 }).toArray();
    },

    async insertReview(review) {
      try {
        await reviews().insertOne(review);
        return true;
      } catch (error) {
        if ((error as { code?: number }).code === 11000) return false;
        throw error;
      }
    },

    async completeCandidate(input) {
      return candidates().findOneAndUpdate(
        { id: input.id, status: "open", statusVersion: input.expectedStatusVersion },
        {
          $set: { status: "complete", updatedAt: input.updatedAt },
          $inc: { statusVersion: 1 },
        },
        { returnDocument: "after" }
      );
    },
  };
}
