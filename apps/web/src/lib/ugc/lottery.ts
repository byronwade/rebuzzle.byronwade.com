/**
 * Date-seeded lottery that promotes approved Studio puzzles into the daily slot
 * ahead of curated reserve inventory.
 */

import { getCollection } from "@/db/mongodb";
import type { NewInAppNotification, Puzzle, UserPuzzleSubmission } from "@/db/models";
import { logger } from "@/lib/logger";
import { communityPuzzlePath, profilePathForUsername } from "./slug";
import { ensureCommunityPuzzle, submissionsCollection } from "./submissions";

/** ~35% of reserve/filler days try UGC first (deterministic from date). */
const UGC_LOTTERY_THRESHOLD = 0.35;

function dateUnitInterval(dateString: string): number {
  let hash = 216_613_626_1;
  for (let i = 0; i < dateString.length; i++) {
    hash ^= dateString.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 4_294_967_295;
}

function lotteryOffset(dateString: string, modulus: number): number {
  if (modulus <= 0) return 0;
  return Math.floor(dateUnitInterval(`${dateString}:ugc-offset`) * modulus) % modulus;
}

async function notifyCreatorFeatured(input: {
  userId: string;
  username: string;
  dateString: string;
  slug: string;
}): Promise<void> {
  try {
    const collection = getCollection<NewInAppNotification>("inAppNotifications");
    await collection.insertOne({
      id: crypto.randomUUID(),
      userId: input.userId,
      type: "ugc_featured",
      title: "Your puzzle is today’s Rebuzzle",
      message: `Nice work, ${input.username} — players worldwide are solving your board today.`,
      link: communityPuzzlePath(input.slug),
      read: false,
      createdAt: new Date(),
    });
  } catch (error) {
    logger.warn("Failed to notify UGC creator about featured day", {
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Promote an approved Studio puzzle into today's daily publication.
 * Returns null when the lottery skips UGC or no eligible candidate exists.
 */
export async function trySelectUgcLotteryFiller(input: {
  dateString: string;
  fallbackReason: string;
}): Promise<{
  id: string;
  rebusPuzzle: string;
  answer: string;
  difficulty: number;
  category: string;
  explanation: string;
  hints: string[];
  visual: Puzzle["visual"];
  techniqueId?: string;
  difficultyLevel?: string;
  attribution: NonNullable<Puzzle["metadata"]>["attribution"];
  submissionId: string;
} | null> {
  if (dateUnitInterval(input.dateString) > UGC_LOTTERY_THRESHOLD) {
    return null;
  }

  const pool = (await submissionsCollection()
    .find({ status: "approved", puzzleId: { $type: "string" } })
    .sort({ approvedAt: 1, createdAt: 1 })
    .limit(200)
    .toArray()) as UserPuzzleSubmission[];

  if (!pool.length) return null;

  const start = lotteryOffset(input.dateString, pool.length);
  const ordered = [...pool.slice(start), ...pool.slice(0, start)];
  const puzzles = getCollection<Puzzle>("puzzles");

  for (const submission of ordered) {
    try {
      const puzzleId = await ensureCommunityPuzzle(submission);
      const puzzle = (await puzzles.findOne({ id: puzzleId })) as Puzzle | null;
      if (!puzzle?.answer || !puzzle.visual) continue;

      // Skip if answer already used as a daily elsewhere (unique index may throw).
      const answerTaken = await puzzles.findOne({
        "metadata.answerKey": submission.answerKey,
        "metadata.dailyPublicationKey": { $type: "string" },
      });
      if (answerTaken) continue;

      const publishedAt = new Date(`${input.dateString}T00:00:00.000Z`);
      const attribution = {
        userId: submission.userId,
        username: submission.username,
        submissionId: submission.id,
        profilePath: profilePathForUsername(submission.username),
      };

      await puzzles.updateOne(
        { id: puzzleId },
        {
          $set: {
            active: true,
            publishedAt,
            "metadata.dailyPublicationKey": input.dateString,
            "metadata.uniquenessContract": "archive-v1",
            "metadata.answerKey": submission.answerKey,
            "metadata.source": "user",
            "metadata.communityPlayable": true,
            "metadata.attribution": attribution,
            "metadata.fallbackReason": input.fallbackReason,
            "metadata.generationMethod": "studio-ugc-lottery",
            "metadata.ugcSubmissionId": submission.id,
            "metadata.createdByUserId": submission.userId,
          },
          $unset: {
            "metadata.archived": "",
            "metadata.retiredReason": "",
          },
        }
      );

      const now = new Date();
      await submissionsCollection().updateOne(
        { id: submission.id },
        {
          $set: {
            status: "featured",
            featuredOn: input.dateString,
            featuredNotifiedAt: now.toISOString(),
            puzzleId,
            updatedAt: now,
          },
        }
      );

      await notifyCreatorFeatured({
        userId: submission.userId,
        username: submission.username,
        dateString: input.dateString,
        slug: submission.slug,
      });

      logger.info("UGC lottery promoted Studio puzzle to daily", {
        dateString: input.dateString,
        submissionId: submission.id,
        puzzleId,
        username: submission.username,
      });

      return {
        id: puzzleId,
        rebusPuzzle: puzzle.rebusPuzzle || puzzle.puzzle,
        answer: puzzle.answer,
        difficulty:
          typeof puzzle.metadata?.difficultyScore === "number"
            ? puzzle.metadata.difficultyScore
            : typeof puzzle.difficulty === "number"
              ? puzzle.difficulty
              : 5,
        category: puzzle.category || "community",
        explanation: puzzle.explanation || "",
        hints: puzzle.hints || [],
        visual: puzzle.visual,
        techniqueId: puzzle.metadata?.techniqueId,
        difficultyLevel: puzzle.metadata?.difficultyLevel,
        attribution,
        submissionId: submission.id,
      };
    } catch (error) {
      logger.warn("UGC lottery candidate skipped", {
        submissionId: submission.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return null;
}
