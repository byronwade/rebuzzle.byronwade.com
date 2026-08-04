import { NextResponse } from "next/server";
import { getCollection } from "@/db/mongodb";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { buildCacheControl } from "@/lib/http/cache-headers";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { sendEmail } from "@/lib/notifications/email-service";

const TOPICS = ["product", "ai", "puzzle-quality", "bug", "docs", "other"] as const;
type FeedbackTopic = (typeof TOPICS)[number];

function isTopic(value: unknown): value is FeedbackTopic {
  return typeof value === "string" && (TOPICS as readonly string[]).includes(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * POST /api/feedback
 *
 * Public site feedback (how-it-works, product notes). Stores a row and emails
 * maintainers when Resend is configured. Auth optional.
 */
export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    const limit = await rateLimit({
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      keyGenerator: () => `rate-limit:site-feedback:${ip}`,
    })(request);

    if (limit && !limit.success) {
      return NextResponse.json(
        { success: false, error: "Too many submissions. Try again in a bit." },
        { status: 429, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }

    const body = (await request.json()) as {
      topic?: string;
      message?: string;
      email?: string;
      name?: string;
      page?: string;
      website?: string; // honeypot
    };

    // Honeypot — bots fill hidden fields; humans leave them empty.
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ success: true });
    }

    if (!isTopic(body.topic)) {
      return NextResponse.json(
        { success: false, error: "Choose a feedback topic." },
        { status: 400 }
      );
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (message.length < 10 || message.length > 4000) {
      return NextResponse.json(
        { success: false, error: "Message must be between 10 and 4,000 characters." },
        { status: 400 }
      );
    }

    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    const email = emailRaw.length > 0 ? emailRaw.slice(0, 254) : undefined;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "That email address looks invalid." },
        { status: 400 }
      );
    }

    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 120)
        : undefined;
    const page =
      typeof body.page === "string" && body.page.trim()
        ? body.page.trim().slice(0, 200)
        : "/how-it-works";

    const user = await getAuthenticatedUser(request);

    const id = crypto.randomUUID();
    const now = new Date();
    await getCollection("siteFeedback").insertOne({
      id,
      topic: body.topic,
      message,
      email: email ?? null,
      name: name ?? null,
      page,
      userId: user?.userId ?? null,
      createdAt: now,
      processed: false,
    });

    const inbox =
      process.env.FEEDBACK_TO_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      process.env.FROM_EMAIL ||
      "hello@byronwade.com";

    const subject = `[Rebuzzle feedback · ${body.topic}] ${name || email || "Anonymous"}`;
    const html = `
      <p><strong>Topic:</strong> ${escapeHtml(body.topic)}</p>
      <p><strong>Page:</strong> ${escapeHtml(page)}</p>
      <p><strong>From:</strong> ${escapeHtml(name || "—")} &lt;${escapeHtml(email || "no email")}&gt;</p>
      <p><strong>User:</strong> ${escapeHtml(user?.userId || "anonymous")}</p>
      <hr />
      <pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:14px;">${escapeHtml(message)}</pre>
    `;

    const mailed = await sendEmail({
      to: inbox,
      subject,
      html,
      text: `Topic: ${body.topic}\nPage: ${page}\nFrom: ${name || "—"} <${email || "no email"}>\n\n${message}`,
    });

    if (!mailed.success) {
      console.warn("[feedback] Stored but email failed:", mailed.error);
    }

    return NextResponse.json(
      { success: true, id },
      { headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  } catch (error) {
    console.error("[feedback] Error:", error);
    return NextResponse.json(
      { success: false, error: "Could not send feedback. Please try again." },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
