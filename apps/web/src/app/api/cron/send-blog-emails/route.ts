import { NextResponse } from "next/server";
import type { BlogPost } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { authorizeCron } from "@/lib/cron/auth";
import { getAppUrl } from "@/lib/env";
import { sendBlogPostEmail } from "@/lib/notifications/email-service";
import { getActiveEmailRecipients } from "@/lib/notifications/subscribers";

/**
 * Morning blog-post emails for the notification list.
 * Picks the most recently published Eve archive post and blasts subscribers.
 * Vercel cron uses GET.
 */
async function handleSendBlogEmails() {
  console.log("[Blog Emails] Starting morning blog notification send...");

  const blogPostsCollection = getCollection<BlogPost>("blogPosts");
  const post = await blogPostsCollection.findOne({}, { sort: { publishedAt: -1 } });

  if (!post) {
    return NextResponse.json({
      success: false,
      error: "No blog post found to send",
    });
  }

  // Avoid re-sending the same post on every morning run
  if (post.lastEmailedAt) {
    const last = new Date(post.lastEmailedAt).getTime();
    const ageMs = Date.now() - last;
    if (ageMs < 20 * 60 * 60 * 1000) {
      return NextResponse.json({
        success: true,
        skipped: "already_emailed_recently",
        postId: post.id,
        slug: post.slug,
      });
    }
  }

  const baseUrl = getAppUrl();
  const postUrl = `${baseUrl}/blog/${post.slug}`;
  const recipients = await getActiveEmailRecipients();

  console.log(`[Blog Emails] Sending "${post.title}" to ${recipients.length} subscribers`);

  const emailResults = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  const BATCH_SIZE = 10;
  const BATCH_DELAY_MS = 1000;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (recipient) => {
      const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
      const result = await sendBlogPostEmail(recipient.email, {
        username: recipient.username,
        postTitle: post.title,
        postExcerpt: post.excerpt || "Yesterday's puzzle write-up is live.",
        postUrl,
        authorName: "Eve",
        unsubscribeUrl,
      });
      if (result.success) {
        return { success: true as const, email: recipient.email };
      }
      return {
        success: false as const,
        email: recipient.email,
        error: result.error,
      };
    });

    const batchResults = await Promise.allSettled(batchPromises);
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        if (result.value.success) emailResults.sent++;
        else {
          emailResults.failed++;
          emailResults.errors.push(`${result.value.email}: ${result.value.error}`);
        }
      } else {
        emailResults.failed++;
        emailResults.errors.push(
          `Batch item failed: ${
            result.reason instanceof Error ? result.reason.message : "Unknown error"
          }`
        );
      }
    }

    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  await blogPostsCollection.updateOne(
    { id: post.id },
    { $set: { lastEmailedAt: new Date(), updatedAt: new Date() } }
  );

  console.log("[Blog Emails] Morning blog send completed:", emailResults);

  return NextResponse.json({
    success: true,
    message: "Blog notifications sent",
    postId: post.id,
    slug: post.slug,
    results: { emails: emailResults },
  });
}

export async function GET(request: Request) {
  const auth = authorizeCron(request);
  if (!auth.ok) return auth.response;
  try {
    return await handleSendBlogEmails();
  } catch (error) {
    console.error("[Blog Emails] Cron failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send blog emails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
