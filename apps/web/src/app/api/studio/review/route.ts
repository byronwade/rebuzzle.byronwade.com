import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import {
  type EveReviewEvent,
  type EveReviewInput,
  type EveReviewResult,
  publicEveReview,
  runEveStudioReview,
} from "@/lib/ugc/eve-review";
import { requireStudioUser } from "@/lib/ugc/require-studio-user";
import { attachEveReviewSnapshot, upsertDraftSubmission } from "@/lib/ugc/submissions";

const reviewLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 6,
  keyGenerator: (request) =>
    getUserKey(`studio-eve-review:${request.headers.get("x-forwarded-for")}`),
});

type Body = {
  id?: string;
  title?: string;
  answer?: string;
  explanation?: string;
  hints?: string[];
  techniqueId?: string;
  difficulty?: number;
  layout?: "row" | "stack" | "grid" | "overlay";
  layers?: unknown[];
  caption?: string;
  /** Opt into expensive vision player-sim when env allows */
  deepReview?: boolean;
  /** When true, return a single JSON result instead of NDJSON stream */
  sync?: boolean;
  /** Persist the review snapshot on the draft (default true) */
  persist?: boolean;
};

function parseBody(body: Body) {
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  const explanation = typeof body.explanation === "string" ? body.explanation.trim() : "";
  const hints = Array.isArray(body.hints)
    ? body.hints.filter((h): h is string => typeof h === "string").map((h) => h.trim())
    : [];
  const techniqueId = typeof body.techniqueId === "string" ? body.techniqueId.trim() : "";
  const difficulty = typeof body.difficulty === "number" ? body.difficulty : 5;
  const layers = Array.isArray(body.layers) ? body.layers : [];
  return {
    id: typeof body.id === "string" ? body.id : undefined,
    title: typeof body.title === "string" ? body.title.trim() : undefined,
    answer,
    explanation,
    hints,
    techniqueId,
    difficulty,
    layers,
    visual: {
      layout: body.layout,
      layers: layers as EveReviewInput["visual"]["layers"],
      caption: typeof body.caption === "string" ? body.caption : undefined,
    },
    deepReview: body.deepReview === true,
    persist: body.persist !== false,
  };
}

async function persistReview(input: {
  userId: string;
  username: string;
  draftId?: string;
  title?: string;
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  difficulty: number;
  review: EveReviewResult;
}) {
  const draft = await upsertDraftSubmission({
    id: input.draftId,
    userId: input.userId,
    username: input.username,
    title: input.title,
    answer: input.answer,
    explanation: input.explanation,
    hints: input.hints,
    techniqueId: input.techniqueId,
    difficulty: input.difficulty,
    visual: input.review.grade.visual,
    rebusPuzzle: input.review.grade.rebusPuzzle,
    answerKey: input.review.grade.answerKey,
  });

  const eveReview = {
    reviewId: input.review.reviewId,
    ok: input.review.ok,
    verdict: input.review.verdict,
    summary: input.review.summary,
    blockers: input.review.blockers,
    warnings: input.review.warnings,
    checkedAt: input.review.checkedAt,
    spend: input.review.spend,
  };

  const saved = await attachEveReviewSnapshot({
    submissionId: draft.id,
    userId: input.userId,
    eveReview,
    grade: {
      ok: input.review.grade.ok,
      score: input.review.grade.score,
      funScore: input.review.grade.funScore,
      issues: input.review.grade.issues,
      gradedAt: input.review.checkedAt,
    },
    visual: input.review.grade.visual,
    rebusPuzzle: input.review.grade.rebusPuzzle,
    answerKey: input.review.grade.answerKey,
  });

  return saved ?? draft;
}

/**
 * POST /api/studio/review
 * Streams NDJSON Eve review events (manifest → phase → thinking → check → answer → done).
 * Author-only; rate-limited; never exposes other users’ drafts.
 */
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const gate = await requireStudioUser(auth);
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const limit = await reviewLimit(request);
  if (limit && !limit.success) {
    return Response.json(
      { error: "Too many Eve reviews — wait a moment (keeps the environment safe)." },
      { status: 429 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed.answer || !parsed.techniqueId || parsed.layers.length === 0) {
    return Response.json(
      { error: "Add at least one board piece, an answer, and a technique." },
      { status: 400 }
    );
  }

  const input: EveReviewInput = {
    title: parsed.title,
    answer: parsed.answer,
    explanation: parsed.explanation,
    hints: parsed.hints,
    techniqueId: parsed.techniqueId,
    difficulty: parsed.difficulty,
    visual: parsed.visual,
    deepReview: parsed.deepReview,
    excludeSubmissionId: parsed.id,
  };

  if (body.sync) {
    const result = await runEveStudioReview(input);
    let submissionId = parsed.id;
    if (parsed.persist) {
      const saved = await persistReview({
        userId: gate.user.userId,
        username: gate.user.username,
        draftId: parsed.id,
        title: parsed.title,
        answer: parsed.answer,
        explanation: parsed.explanation,
        hints: parsed.hints,
        techniqueId: parsed.techniqueId,
        difficulty: parsed.difficulty,
        review: result,
      });
      submissionId = saved.id;
    }
    return Response.json({
      review: publicEveReview(result),
      submissionId,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (event: EveReviewEvent) => {
        const payload =
          event.type === "done" ? { type: "done", review: publicEveReview(event.result) } : event;
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };
      try {
        const result = await runEveStudioReview(input, { emit: write });
        if (parsed.persist) {
          const saved = await persistReview({
            userId: gate.user.userId,
            username: gate.user.username,
            draftId: parsed.id,
            title: parsed.title,
            answer: parsed.answer,
            explanation: parsed.explanation,
            hints: parsed.hints,
            techniqueId: parsed.techniqueId,
            difficulty: parsed.difficulty,
            review: result,
          });
          controller.enqueue(
            encoder.encode(`${JSON.stringify({ type: "persisted", submissionId: saved.id })}\n`)
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Eve review failed";
        controller.enqueue(
          encoder.encode(`${JSON.stringify({ type: "error", error: message })}\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
