import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { gradeUserPuzzleSubmission } from "@/lib/ugc/grade-submission";
import {
  findSubmissionById,
  listSubmissionsForUser,
  markSubmissionGraded,
  upsertDraftSubmission,
} from "@/lib/ugc/submissions";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";

const saveLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: (request) => getUserKey(`studio-save:${request.headers.get("x-forwarded-for")}`),
});

/** GET /api/studio/submissions — list the caller's drafts + submissions. */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.username.toLowerCase().startsWith("player") && user.email.includes("@guest.")) {
    return NextResponse.json({ error: "Create a free account to use Studio" }, { status: 403 });
  }

  const items = await listSubmissionsForUser(user.userId);
  return NextResponse.json({
    submissions: items.map((row) => ({
      id: row.id,
      slug: row.slug,
      status: row.status,
      title: row.title,
      answer: row.answer,
      techniqueId: row.techniqueId,
      difficulty: row.difficulty,
      rebusPuzzle: row.rebusPuzzle,
      visual: row.visual,
      grade: row.grade,
      puzzleId: row.puzzleId,
      featuredOn: row.featuredOn,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    })),
  });
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
};

/** POST /api/studio/submissions — save draft and optionally grade/submit. */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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

  if (!answer || !techniqueId || layers.length === 0) {
    return NextResponse.json(
      { error: "answer, techniqueId, and at least one layer are required" },
      { status: 400 }
    );
  }

  const grade = await gradeUserPuzzleSubmission({
    answer,
    explanation,
    hints,
    techniqueId,
    difficulty,
    visual: {
      layout: body.layout,
      layers: layers as never,
      caption: typeof body.caption === "string" ? body.caption : undefined,
    },
  });

  // Always persist a draft snapshot (even if grade fails) so authors can iterate.
  const draft = await upsertDraftSubmission({
    id: typeof body.id === "string" ? body.id : undefined,
    userId: user.userId,
    username: user.username,
    title: body.title,
    answer,
    explanation,
    hints,
    techniqueId,
    difficulty,
    visual: grade.visual,
    rebusPuzzle: grade.rebusPuzzle,
    answerKey: grade.answerKey,
  });

  if (!body.submit) {
    return NextResponse.json({
      submission: draft,
      grade: {
        ok: grade.ok,
        score: grade.score,
        funScore: grade.funScore,
        issues: grade.issues,
      },
    });
  }

  // Soft preview grade on save-without-submit already ran; submit requires pass.
  if (!grade.ok) {
    const rejected = await markSubmissionGraded({
      submission: { ...draft, status: "pending_grade" },
      ok: false,
      score: grade.score,
      funScore: grade.funScore,
      issues: grade.issues,
      visual: grade.visual,
      rebusPuzzle: grade.rebusPuzzle,
      answerKey: grade.answerKey,
    });
    return NextResponse.json(
      {
        error: "AI checks failed",
        submission: rejected,
        grade: {
          ok: false,
          score: grade.score,
          funScore: grade.funScore,
          issues: grade.issues,
        },
      },
      { status: 422 }
    );
  }

  // Re-check uniqueness against other pending/approved UGC (archive already checked).
  const existing = await findSubmissionById(draft.id);
  const approved = await markSubmissionGraded({
    submission: existing ?? draft,
    ok: true,
    score: grade.score,
    funScore: grade.funScore,
    issues: [],
    visual: grade.visual,
    rebusPuzzle: grade.rebusPuzzle,
    answerKey: grade.answerKey,
  });

  return NextResponse.json({
    submission: approved,
    grade: {
      ok: true,
      score: grade.score,
      funScore: grade.funScore,
      issues: [],
    },
  });
}
