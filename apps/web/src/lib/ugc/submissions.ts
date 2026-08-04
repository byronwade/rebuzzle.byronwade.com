/**
 * Mongo helpers for Studio submissions + community puzzle promotion.
 */

import { getCollection } from "@/db/mongodb";
import type { NewPuzzle, Puzzle, PuzzleVisual, UserPuzzleSubmission } from "@/db/models";
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

export async function listSitemapCommunityPuzzles(limit = 500): Promise<
  Array<{ slug: string; updatedAt: Date; username: string }>
> {
  const rows = (await submissionsCollection()
    .find({ status: { $in: ["approved", "featured"] } })
    .project({ slug: 1, updatedAt: 1, username: 1 })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray()) as Array<{ slug: string; updatedAt: Date; username: string }>;
  return rows;
}

export async function listSitemapCreators(limit = 200): Promise<
  Array<{ username: string; updatedAt: Date }>
> {
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
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await submissionsCollection().updateOne(
    { id },
    { $set: doc },
    { upsert: true }
  );
  return doc;
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
}): Promise<UserPuzzleSubmission> {
  const now = new Date();
  const status = input.ok ? "approved" : "rejected";
  const next: UserPuzzleSubmission = {
    ...input.submission,
    status,
    visual: input.visual,
    rebusPuzzle: input.rebusPuzzle,
    answerKey: input.answerKey,
    grade: {
      ok: input.ok,
      score: input.score,
      funScore: input.funScore,
      issues: input.issues,
      gradedAt: now.toISOString(),
    },
    eveReview: input.eveReview ?? input.submission.eveReview,
    submittedAt: input.submission.submittedAt ?? now,
    approvedAt: input.ok ? now : input.submission.approvedAt,
    updatedAt: now,
  };

  await submissionsCollection().updateOne({ id: next.id }, { $set: next });

  if (input.ok) {
    const puzzleId = await ensureCommunityPuzzle(next);
    next.puzzleId = puzzleId;
    logger.info("Studio submission approved", {
      submissionId: next.id,
      puzzleId,
      path: communityPuzzlePath(next.slug),
    });
  }

  return next;
}
