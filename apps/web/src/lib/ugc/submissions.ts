/**
 * Mongo helpers for Studio submissions + community puzzle promotion.
 */

import type { NewPuzzle, Puzzle, PuzzleVisual, UserPuzzleSubmission } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { toLegacyDifficultyLabel } from "@/lib/game/published-puzzle";
import { logger } from "@/lib/logger";
import { communityPuzzlePath, profilePathForUsername, slugifyHandle } from "./slug";

export function submissionsCollection() {
  return getCollection<UserPuzzleSubmission>("userPuzzleSubmissions");
}

export async function findSubmissionById(id: string): Promise<UserPuzzleSubmission | null> {
  return (await submissionsCollection().findOne({ id })) as UserPuzzleSubmission | null;
}

export async function findSubmissionBySlug(slug: string): Promise<UserPuzzleSubmission | null> {
  return (await submissionsCollection().findOne({ slug })) as UserPuzzleSubmission | null;
}

export async function listSubmissionsForUser(
  userId: string,
  limit = 40
): Promise<UserPuzzleSubmission[]> {
  return (await submissionsCollection()
    .find({ userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray()) as UserPuzzleSubmission[];
}

export async function listPublicCreatorPuzzles(
  username: string,
  limit = 40
): Promise<UserPuzzleSubmission[]> {
  return (await submissionsCollection()
    .find({
      username: { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      status: { $in: ["approved", "featured"] },
    })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray()) as UserPuzzleSubmission[];
}

/** Newest approved / featured boards for the community index. */
export async function listRecentCommunityPuzzles(limit = 36): Promise<UserPuzzleSubmission[]> {
  return (await submissionsCollection()
    .find({ status: { $in: ["approved", "featured"] } })
    .sort({ updatedAt: -1 })
    .limit(Math.min(limit, 100))
    .toArray()) as UserPuzzleSubmission[];
}

export async function listSitemapCommunityPuzzles(
  limit = 500
): Promise<Array<{ slug: string; updatedAt: Date; username: string }>> {
  const rows = (await submissionsCollection()
    .find({ status: { $in: ["approved", "featured"] } })
    .project({ slug: 1, updatedAt: 1, username: 1 })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray()) as Array<{ slug: string; updatedAt: Date; username: string }>;
  return rows;
}

export async function listSitemapCreators(
  limit = 200
): Promise<Array<{ username: string; updatedAt: Date }>> {
  const rows = (await submissionsCollection()
    .aggregate([
      { $match: { status: { $in: ["approved", "featured"] } } },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: { $toLower: "$username" },
          username: { $first: "$username" },
          updatedAt: { $first: "$updatedAt" },
        },
      },
      { $sort: { updatedAt: -1 } },
      { $limit: limit },
    ])
    .toArray()) as Array<{ username: string; updatedAt: Date }>;
  return rows;
}

function uniqueSlug(base: string, id: string): string {
  const stem = slugifyHandle(base) || "puzzle";
  return `${stem}-${id.slice(0, 8)}`;
}

export async function upsertDraftSubmission(input: {
  id?: string;
  userId: string;
  username: string;
  title?: string;
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  difficulty: number;
  visual: PuzzleVisual;
  rebusPuzzle: string;
  answerKey: string;
}): Promise<UserPuzzleSubmission> {
  const now = new Date();
  const id = input.id ?? crypto.randomUUID();
  const existing = input.id ? await findSubmissionById(input.id) : null;
  if (existing && existing.userId !== input.userId) {
    throw new Error("Not allowed to edit this draft");
  }
  if (existing && (existing.status === "featured" || existing.status === "approved")) {
    throw new Error("Approved puzzles are locked — duplicate to revise");
  }

  const slug = existing?.slug ?? uniqueSlug(input.title || input.answer, id);
  const doc: UserPuzzleSubmission = {
    id,
    slug,
    userId: input.userId,
    username: input.username,
    status: "draft",
    title: input.title?.trim() || undefined,
    answer: input.answer,
    answerKey: input.answerKey,
    explanation: input.explanation,
    hints: input.hints,
    techniqueId: input.techniqueId,
    difficulty: input.difficulty,
    visual: input.visual,
    rebusPuzzle: input.rebusPuzzle,
    puzzleId: existing?.puzzleId,
    grade: existing?.grade,
    eveReview: existing?.eveReview,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await submissionsCollection().updateOne({ id }, { $set: doc }, { upsert: true });
  return doc;
}

/** True when another live Studio submission already claims this answer key. */
export async function isUgcAnswerKeyTaken(
  answerKey: string,
  excludeSubmissionId?: string
): Promise<boolean> {
  if (!answerKey) return false;
  const query: Record<string, unknown> = {
    answerKey,
    status: { $in: ["approved", "featured", "pending_grade"] },
  };
  if (excludeSubmissionId) {
    query.id = { $ne: excludeSubmissionId };
  }
  const hit = await submissionsCollection().findOne(query, { projection: { id: 1 } });
  return Boolean(hit);
}

/** Persist an Eve review snapshot on the author's draft without publishing. */
export async function attachEveReviewSnapshot(input: {
  submissionId: string;
  userId: string;
  eveReview: NonNullable<UserPuzzleSubmission["eveReview"]>;
  grade?: UserPuzzleSubmission["grade"];
  visual?: PuzzleVisual;
  rebusPuzzle?: string;
  answerKey?: string;
}): Promise<UserPuzzleSubmission | null> {
  const existing = await findSubmissionById(input.submissionId);
  if (!existing || existing.userId !== input.userId) return null;
  if (existing.status === "approved" || existing.status === "featured") {
    throw new Error("Approved puzzles are locked — duplicate to revise");
  }

  const now = new Date();
  const next: UserPuzzleSubmission = {
    ...existing,
    eveReview: input.eveReview,
    grade: input.grade ?? existing.grade,
    visual: input.visual ?? existing.visual,
    rebusPuzzle: input.rebusPuzzle ?? existing.rebusPuzzle,
    answerKey: input.answerKey ?? existing.answerKey,
    updatedAt: now,
  };
  await submissionsCollection().updateOne({ id: next.id }, { $set: next });
  return next;
}

/** Create / refresh the community Puzzle row for an approved submission. */
export async function ensureCommunityPuzzle(submission: UserPuzzleSubmission): Promise<string> {
  const puzzles = getCollection<Puzzle>("puzzles");
  const now = new Date();
  const attribution = {
    userId: submission.userId,
    username: submission.username,
    submissionId: submission.id,
    profilePath: profilePathForUsername(submission.username),
  };

  if (submission.puzzleId) {
    await puzzles.updateOne(
      { id: submission.puzzleId },
      {
        $set: {
          puzzle: submission.rebusPuzzle,
          answer: submission.answer,
          difficulty: toLegacyDifficultyLabel(submission.difficulty),
          explanation: submission.explanation,
          hints: submission.hints,
          visual: submission.visual,
          rebusPuzzle: submission.rebusPuzzle,
          updatedAt: now,
          "metadata.techniqueId": submission.techniqueId,
          "metadata.difficultyScore": submission.difficulty,
          "metadata.attribution": attribution,
          "metadata.communityPlayable": true,
          "metadata.ugcSubmissionId": submission.id,
          "metadata.source": "user",
          "metadata.createdByUserId": submission.userId,
        },
      }
    );
    return submission.puzzleId;
  }

  const puzzleId = crypto.randomUUID();
  // Backdate publication one day so archive/community guess path is immediately playable.
  const publishedAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const doc: NewPuzzle = {
    id: puzzleId,
    puzzle: submission.rebusPuzzle,
    puzzleType: "rebus",
    answer: submission.answer,
    difficulty: toLegacyDifficultyLabel(submission.difficulty),
    category: "community",
    explanation: submission.explanation,
    hints: submission.hints,
    publishedAt,
    createdAt: now,
    active: false,
    visual: submission.visual,
    rebusPuzzle: submission.rebusPuzzle,
    metadata: {
      topic: "community",
      category: "community",
      puzzleType: "rebus",
      aiGenerated: false,
      generatedAt: now.toISOString(),
      source: "user",
      generationMethod: "studio-ugc",
      techniqueId: submission.techniqueId,
      visualStyleId: submission.visual.styleId,
      difficultyScore: submission.difficulty,
      answerKey: submission.answerKey,
      uniquenessContract: "archive-v1",
      archived: false,
      communityPlayable: true,
      ugcSubmissionId: submission.id,
      createdByUserId: submission.userId,
      attribution,
      qualityScore: submission.grade?.score,
      funScore: submission.grade?.funScore,
    },
  };

  await puzzles.insertOne(doc as Puzzle);
  await submissionsCollection().updateOne(
    { id: submission.id },
    { $set: { puzzleId, updatedAt: now } }
  );
  return puzzleId;
}

export async function markSubmissionGraded(input: {
  submission: UserPuzzleSubmission;
  ok: boolean;
  score: number;
  funScore: number;
  issues: string[];
  visual: PuzzleVisual;
  rebusPuzzle: string;
  answerKey: string;
  eveReview?: UserPuzzleSubmission["eveReview"];
  /**
   * When review fails: hold `pending_grade` (default) so the answer key stays
   * reserved while the author revises. Hard rejects set this to false.
   */
  pendingOnFail?: boolean;
}): Promise<UserPuzzleSubmission> {
  const now = new Date();
  const grade = {
    ok: input.ok,
    score: input.score,
    funScore: input.funScore,
    issues: input.issues,
    gradedAt: now.toISOString(),
  };
  const eveReview = input.eveReview ?? input.submission.eveReview;

  if (input.ok) {
    // Stage as pending_grade first so the unique answerKey index holds the phrase
    // while we create the community puzzle — never approve without puzzleId.
    const staging: UserPuzzleSubmission = {
      ...input.submission,
      status: "pending_grade",
      visual: input.visual,
      rebusPuzzle: input.rebusPuzzle,
      answerKey: input.answerKey,
      grade,
      eveReview,
      submittedAt: input.submission.submittedAt ?? now,
      updatedAt: now,
    };
    await submissionsCollection().updateOne({ id: staging.id }, { $set: staging });

    let puzzleId: string;
    try {
      puzzleId = await ensureCommunityPuzzle(staging);
    } catch (error) {
      await submissionsCollection().updateOne(
        { id: staging.id },
        {
          $set: {
            status: "draft",
            updatedAt: new Date(),
            grade: {
              ok: false,
              score: input.score,
              funScore: input.funScore,
              issues: [
                "Could not create the community puzzle row — fix any issues and publish again",
              ],
              gradedAt: new Date().toISOString(),
            },
          },
        }
      );
      throw error;
    }

    const approved: UserPuzzleSubmission = {
      ...staging,
      status: "approved",
      puzzleId,
      approvedAt: now,
      updatedAt: new Date(),
    };
    await submissionsCollection().updateOne({ id: approved.id }, { $set: approved });
    logger.info("Studio submission approved", {
      submissionId: approved.id,
      puzzleId,
      path: communityPuzzlePath(approved.slug),
    });
    return approved;
  }

  const status = input.pendingOnFail === false ? "rejected" : "pending_grade";
  const next: UserPuzzleSubmission = {
    ...input.submission,
    status,
    visual: input.visual,
    rebusPuzzle: input.rebusPuzzle,
    answerKey: input.answerKey,
    grade,
    eveReview,
    submittedAt: input.submission.submittedAt ?? now,
    updatedAt: now,
  };
  await submissionsCollection().updateOne({ id: next.id }, { $set: next });
  return next;
}
