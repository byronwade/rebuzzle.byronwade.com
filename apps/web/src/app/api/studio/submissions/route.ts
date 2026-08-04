import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import { gradeUserPuzzleSubmission } from "@/lib/ugc/grade-submission";
import { publicEveReview, runEveStudioReview } from "@/lib/ugc/eve-review";
import { requireStudioUser } from "@/lib/ugc/require-studio-user";
import {
  findSubmissionById,
  listSubmissionsForUser,
  markSubmissionGraded,
  upsertDraftSubmission,
} from "@/lib/ugc/submissions";

const saveLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: (request) => getUserKey(`studio-save:${request.headers.get("x-forwarded-for")}`),
});

function publicSubmission(row: Awaited<ReturnType<typeof listSubmissionsForUser>>[number]) {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    title: row.title,
    answer: row.answer,
    explanation: row.explanation,
    hints: row.hints,
    techniqueId: row.techniqueId,
    difficulty: row.difficulty,
    rebusPuzzle: row.rebusPuzzle,
    visual: row.visual,
    grade: row.grade,
    eveReview: row.eveReview,
    puzzleId: row.puzzleId,
    featuredOn: row.featuredOn,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

/** GET /api/studio/submissions — list the caller's drafts + submissions. */
export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const gate = await requireStudioUser(auth);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const items = await listSubmissionsForUser(gate.user.userId);
  return NextResponse.json({ submissions: items.map(publicSubmission) });
}

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
  submit?: boolean;
  deepReview?: boolean;
};

/** POST /api/studio/submissions — save draft and optionally Eve-review + submit. */
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const gate = await requireStudioUser(auth);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const limit = await saveLimit(request);
  if (limit && !limit.success) {
    return NextResponse.json({ error: "Too many Studio saves — slow down" }, { status: 429 });
  }

  const body = (await request.json()) as Body;
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  const explanation = typeof body.explanation === "string" ? body.explanation.trim() : "";
  const hints = Array.isArray(body.hints)
    ? body.hints.filter((h): h is string => typeof h === "string").map((h) => h.trim())
    : [];
  const techniqueId = typeof body.techniqueId === "string" ? body.techniqueId.trim() : "";
  const difficulty = typeof body.difficulty === "number" ? body.difficulty : 5;
  const layers = Array.isArray(body.layers) ? body.layers : [];
  const title = typeof body.title === "string" ? body.title.trim() : undefined;

  if (!answer || !techniqueId || layers.length === 0) {
    return NextResponse.json(
      { error: "Add at least one board piece, an answer, and a technique." },
      { status: 400 }
    );
  }

  try {
    const visualInput = {
      layout: body.layout,
      layers: layers as never,
      caption: typeof body.caption === "string" ? body.caption : undefined,
    };

    // Publish path: full Eve review (safety → grade → critique → optional sim).
    // Draft saves keep the lighter deterministic grade for fast iteration.
    if (body.submit) {
      const review = await runEveStudioReview({
        title,
        answer,
        explanation,
        hints,
        techniqueId,
        difficulty,
        visual: visualInput,
        deepReview: body.deepReview === true,
      });

      const draft = await upsertDraftSubmission({
        id: typeof body.id === "string" ? body.id : undefined,
        userId: gate.user.userId,
        username: gate.user.username,
        title,
        answer,
        explanation,
        hints,
        techniqueId,
        difficulty,
        visual: review.grade.visual,
        rebusPuzzle: review.grade.rebusPuzzle,
        answerKey: review.grade.answerKey,
      });

      const eveReview = {
        reviewId: review.reviewId,
        ok: review.ok,
        verdict: review.verdict,
        summary: review.summary,
        blockers: review.blockers,
        warnings: review.warnings,
        checkedAt: review.checkedAt,
        spend: review.spend,
      };

      if (!review.ok) {
        const rejected = await markSubmissionGraded({
          submission: { ...draft, status: "pending_grade" },
          ok: false,
          score: review.grade.score,
          funScore: review.grade.funScore,
          issues: review.blockers.length ? review.blockers : review.grade.issues,
          visual: review.grade.visual,
          rebusPuzzle: review.grade.rebusPuzzle,
          answerKey: review.grade.answerKey,
          eveReview,
        });
        return NextResponse.json(
          {
            error: "Eve review did not ship — fix the blockers and try again.",
            submission: publicSubmission(rejected),
            grade: {
              ok: false,
              score: review.grade.score,
              funScore: review.grade.funScore,
              issues: review.blockers.length ? review.blockers : review.grade.issues,
            },
            review: publicEveReview(review),
          },
          { status: 422 }
        );
      }

      const existing = await findSubmissionById(draft.id);
      const approved = await markSubmissionGraded({
        submission: existing ?? draft,
        ok: true,
        score: review.grade.score,
        funScore: review.grade.funScore,
        issues: [],
        visual: review.grade.visual,
        rebusPuzzle: review.grade.rebusPuzzle,
        answerKey: review.grade.answerKey,
        eveReview,
      });

      return NextResponse.json({
        submission: publicSubmission(approved),
        grade: {
          ok: true,
          score: review.grade.score,
          funScore: review.grade.funScore,
          issues: [],
        },
        review: publicEveReview(review),
      });
    }

    const grade = await gradeUserPuzzleSubmission({
      answer,
      explanation,
      hints,
      techniqueId,
      difficulty,
      visual: visualInput,
    });

    const draft = await upsertDraftSubmission({
      id: typeof body.id === "string" ? body.id : undefined,
      userId: gate.user.userId,
      username: gate.user.username,
      title,
      answer,
      explanation,
      hints,
      techniqueId,
      difficulty,
      visual: grade.visual,
      rebusPuzzle: grade.rebusPuzzle,
      answerKey: grade.answerKey,
    });

    return NextResponse.json({
      submission: publicSubmission(draft),
      grade: {
        ok: grade.ok,
        score: grade.score,
        funScore: grade.funScore,
        issues: grade.issues,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save submission";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
