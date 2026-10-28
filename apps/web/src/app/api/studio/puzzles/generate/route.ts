import { NextResponse } from "next/server";
import { z } from "zod";
import { qualifyRenderedCandidate } from "@/ai/puzzle-agent/apex/rendered-qualification";
import { normalizeAnswerKey } from "@/ai/puzzle-agent/quality";
import { runPuzzleAgentGeneration } from "@/ai/puzzle-agent/run-generation";
import {
  type StudioQualification,
  toStudioPuzzleDraft,
} from "@/ai/puzzle-agent/studio-draft-contract";
import { toStudioApexCandidate } from "@/ai/puzzle-agent/studio-drafts";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import { requireStudioUser } from "@/lib/ugc/require-studio-user";
import {
  consumeStudioAiGeneration,
  getStudioAiQuota,
  refundStudioAiGeneration,
} from "@/lib/ugc/studio-ai-quota";
import { STUDIO_AI_GENERATION_LIMIT } from "@/lib/ugc/studio-marks";

export const maxDuration = 300;

const MAX_REQUEST_BYTES = 4096;
const CANDIDATE_COUNT = 2;

const StudioPuzzleGenerationRequestSchema = z
  .object({
    prompt: z.string().trim().min(2).max(180),
    answer: z.string().trim().min(2).max(80).optional(),
    difficulty: z.number().int().min(1).max(10),
  })
  .strict();

const generationLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 1,
  keyGenerator: (request) =>
    getUserKey(`studio-puzzle-generation:${request.headers.get("x-forwarded-for") ?? "unknown"}`),
});

type StudioQuota = { used: number; limit: number; remaining: number };

function errorResponse(error: string, status: number, quota?: StudioQuota) {
  return NextResponse.json({ error, ...quota }, { status });
}

function qualificationFor(
  qualified: Awaited<ReturnType<typeof qualifyRenderedCandidate>>
): StudioQualification {
  const issues = qualified.rejectReasons.filter(Boolean);
  if (qualified.publishable) return { status: "passed", issues: [] };
  return {
    status: "needs_review",
    issues: issues.length ? issues : ["This draft did not pass every initial quality check."],
  };
}

/** POST /api/studio/puzzles/generate — build up to two private Studio puzzle drafts. */
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return errorResponse("Not authenticated", 401);

  const gate = await requireStudioUser(auth);
  if (!gate.ok) return errorResponse(gate.error, gate.status);

  const rate = await generationLimit(request);
  if (rate && !rate.success) {
    return NextResponse.json(
      { error: "Give the puzzle generator a minute before trying again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 60) } }
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return errorResponse("That puzzle brief is too large. Shorten it and try again.", 413);
  }

  let rawBody = "";
  try {
    const reader = request.body?.getReader();
    if (reader) {
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_REQUEST_BYTES) {
          await reader.cancel().catch(() => undefined);
          return errorResponse("That puzzle brief is too large. Shorten it and try again.", 413);
        }
        chunks.push(value);
      }

      const bytes = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      rawBody = new TextDecoder().decode(bytes);
    }
  } catch {
    return errorResponse("Could not read the puzzle brief. Try again.", 400);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return errorResponse("The puzzle brief could not be read. Check it and try again.", 400);
  }

  const parsed = StudioPuzzleGenerationRequestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return errorResponse("Add a topic, an optional answer, and a difficulty from 1 to 10.", 400);
  }
  const input = parsed.data;
  const userId = gate.user.userId;

  let reservedQuota: StudioQuota | null;
  try {
    reservedQuota = await consumeStudioAiGeneration(userId);
  } catch {
    return errorResponse("Studio AI credits could not be checked. Try again shortly.", 503);
  }
  if (!reservedQuota) {
    let quota: StudioQuota | undefined;
    try {
      quota = await getStudioAiQuota(userId);
    } catch {
      quota = { used: STUDIO_AI_GENERATION_LIMIT, limit: STUDIO_AI_GENERATION_LIMIT, remaining: 0 };
    }
    return errorResponse(
      `AI generator limit reached (${STUDIO_AI_GENERATION_LIMIT} per account).`,
      403,
      quota
    );
  }

  const candidates = [];
  let answerMismatch = false;

  for (let slot = 1; slot <= CANDIDATE_COUNT; slot += 1) {
    try {
      const result = await runPuzzleAgentGeneration({
        targetDifficulty: input.difficulty,
        theme: input.prompt,
        briefSummary: `Studio creator brief: ${input.prompt}. Make an original, fair, editable Rebuzzle with visible clue relationships.`,
        answerSeed: input.answer,
        maxAttempts: 1,
        candidateIndex: slot,
        candidateCount: CANDIDATE_COUNT,
        deferRenderedEvaluation: true,
        useLearningFeedback: false,
      });

      if (result.status !== "success") continue;
      if (
        input.answer &&
        normalizeAnswerKey(result.puzzle.answer) !== normalizeAnswerKey(input.answer)
      ) {
        answerMismatch = true;
        continue;
      }

      const candidate = toStudioApexCandidate(result, slot);
      let qualification: StudioQualification;
      try {
        const qualified = await qualifyRenderedCandidate(candidate, undefined, input.difficulty);
        qualification = qualificationFor(qualified);
      } catch {
        qualification = {
          status: "pending",
          issues: ["Rendered checks are pending. Run Eve review before submitting this draft."],
        };
      }
      candidates.push(toStudioPuzzleDraft(candidate, qualification));
    } catch {
      // Continue to the next slot and keep provider diagnostics out of the creator response.
    }
  }

  if (candidates.length === 0) {
    try {
      await refundStudioAiGeneration(userId);
      const quota = await getStudioAiQuota(userId);
      return errorResponse(
        answerMismatch
          ? "The exact answer could not be preserved. Change the topic or answer and try again."
          : "Could not create a puzzle from that topic. Change the topic and try again.",
        502,
        quota
      );
    } catch {
      return errorResponse(
        "No puzzle draft came through. Check your remaining AI credits before trying again.",
        502,
        reservedQuota
      );
    }
  }

  return NextResponse.json({
    candidates,
    partial: candidates.length < CANDIDATE_COUNT,
    ...(candidates.length < CANDIDATE_COUNT
      ? { notice: "The second idea could not be completed." }
      : {}),
    ...reservedQuota,
  });
}
