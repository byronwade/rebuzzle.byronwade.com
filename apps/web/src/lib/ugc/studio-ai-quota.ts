import { db, getCollection } from "@/db";
import { STUDIO_AI_GENERATION_LIMIT } from "./studio-marks";

export function studioAiRemaining(used: number | undefined): number {
  return Math.max(0, STUDIO_AI_GENERATION_LIMIT - (used ?? 0));
}

export async function getStudioAiQuota(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  const user = await db.userOps.findById(userId);
  const used = user?.studioAiGenerationsUsed ?? 0;
  return {
    used,
    limit: STUDIO_AI_GENERATION_LIMIT,
    remaining: studioAiRemaining(used),
  };
}

/**
 * Atomically consume one Studio AI generation if under the lifetime cap.
 * Returns the new quota, or null when the user is out of generations.
 */
export async function consumeStudioAiGeneration(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
} | null> {
  const collection = getCollection<{
    id: string;
    studioAiGenerationsUsed?: number;
  }>("users");

  const result = await collection.findOneAndUpdate(
    {
      id: userId,
      $expr: {
        $lt: [{ $ifNull: ["$studioAiGenerationsUsed", 0] }, STUDIO_AI_GENERATION_LIMIT],
      },
    },
    { $inc: { studioAiGenerationsUsed: 1 } },
    { returnDocument: "after" }
  );

  if (!result) return null;

  const used = result.studioAiGenerationsUsed ?? STUDIO_AI_GENERATION_LIMIT;
  return {
    used,
    limit: STUDIO_AI_GENERATION_LIMIT,
    remaining: studioAiRemaining(used),
  };
}
