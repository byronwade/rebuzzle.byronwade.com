import { NextResponse } from "next/server";
import { z } from "zod";
import { dailyProgressOps, journalNoteOps } from "@/db/operations";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { buildCacheControl } from "@/lib/http/cache-headers";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import { hasPlusEntitlement } from "@/lib/storekit/plus-entitlement";

const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_NOTE_SCALARS = 10_000;
const MAX_NOTE_BYTES = 40_000;
const PRIVATE_HEADERS = { "Cache-Control": buildCacheControl({ private: true }) };
const NOTE_SEGMENTER = new Intl.Segmenter("en", { granularity: "grapheme" });
const NOTE_INPUT = z
  .object({
    puzzleId: z.string().regex(/^[A-Za-z0-9:_-]{1,128}$/),
    note: z.string(),
    expectedRevision: z.number().int().nonnegative().safe(),
  })
  .strict();

function failure(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status, headers: PRIVATE_HEADERS });
}

function jsonBody(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

type BoundedBodyResult =
  | { kind: "ok"; text: string }
  | { kind: "too_large" }
  | { kind: "invalid_encoding" };

async function readBoundedBody(request: Request): Promise<BoundedBodyResult> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    await request.body?.cancel().catch(() => undefined);
    return { kind: "too_large" };
  }

  const reader = request.body?.getReader();
  if (!reader) return { kind: "ok", text: "" };
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { kind: "too_large" };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { kind: "ok", text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { kind: "invalid_encoding" };
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return failure("Not authenticated", 401);
    if (auth.isGuestToken) return failure("Sign in to sync your journal.", 403);

    const rate = await rateLimit({
      name: "user-journal-note-write",
      windowMs: 60 * 1000,
      maxRequests: 30,
      keyGenerator: () => getUserKey(`journal-note:${auth.userId}`),
    })(request);
    if (rate && !rate.success) return failure("Too many journal updates. Slow down.", 429);

    if (!(await hasPlusEntitlement(request))) {
      return failure("Rebuzzle Plus is required to sync your journal.", 403);
    }

    const body = await readBoundedBody(request);
    if (body.kind === "too_large") return failure("Journal note request is too large.", 413);
    if (body.kind === "invalid_encoding") return failure("Invalid journal note.", 400);
    const parsed = NOTE_INPUT.safeParse(jsonBody(body.text));
    if (!parsed.success) return failure("Invalid journal note.", 400);
    const { puzzleId, note, expectedRevision } = parsed.data;
    if (
      Array.from(NOTE_SEGMENTER.segment(note)).length > MAX_NOTE_SCALARS ||
      Buffer.byteLength(note, "utf8") > MAX_NOTE_BYTES
    ) {
      return failure("Journal notes can contain up to 10,000 characters.", 400);
    }

    const completion = await dailyProgressOps.findForUserPuzzle(auth.userId, puzzleId);
    if (!completion) return failure("Complete this daily puzzle before saving a note.", 403);

    const saved = await journalNoteOps.compareAndSet({
      userId: auth.userId,
      puzzleId,
      note,
      expectedRevision,
      updatedAt: new Date(),
    });
    if (!saved) {
      const current = await journalNoteOps.findForUser(auth.userId, puzzleId);
      return NextResponse.json(
        {
          success: false,
          error: "This note changed on another device.",
          currentNote: current?.note ?? "",
          currentRevision: current?.revision ?? 0,
        },
        { status: 409, headers: PRIVATE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        note: saved.note,
        revision: saved.revision,
        updatedAt: saved.updatedAt.toISOString(),
      },
      { headers: PRIVATE_HEADERS }
    );
  } catch {
    // Journal text is private content; keep it out of server logs.
    return failure("Unable to save your note. Your on-device copy is safe.", 500);
  }
}
