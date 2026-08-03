import { NextResponse } from "next/server";
import type { BlogPost } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { userOps } from "@/db/operations";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { authorizeCron } from "@/lib/cron/auth";
import { getAppUrl } from "@/lib/env";
import { sendBlogPostEmail } from "@/lib/notifications/email-service";
import { getActiveEmailRecipients } from "@/lib/notifications/subscribers";

/**
 * POST /api/blog/send-notification
 * Manual/admin or cron-triggered blog blast. Requires cron auth or admin user.
 */
export async function POST(request: Request) {
  try {
    const cronAuth = authorizeCron(request);
    let authorized = cronAuth.ok;

    if (!authorized) {
      const authUser = await getAuthenticatedUser(request);
      if (authUser) {
        const user = await userOps.findById(authUser.userId);
        authorized = Boolean(user?.isAdmin);
      }
    }

    if (!authorized) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { postId, sendToAllUsers = false } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    const blogPostsCollection = getCollection<BlogPost>("blogPosts");
    const post = await blogPostsCollection.findOne({ id: postId });

    if (!post) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const baseUrl = getAppUrl();
    const postUrl = `${baseUrl}/blog/${post.slug}`;
    const recipients = await getActiveEmailRecipients({ sendToAllUsers });

    console.log(`[Blog] Sending blog post notification to ${recipients.length} recipients`);

    const emailResults = {
      sent: 0,
      failed: 0,
      failures: [] as string[],
    };

    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 1000;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (recipient) => {
        try {
          const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
          const result = await sendBlogPostEmail(recipient.email, {
            username: recipient.username,
            postTitle: post.title,
            postExcerpt: post.excerpt || "",
            postUrl,
            authorName:
              post.authorId === "eve-ai" || post.authorId === "ai-system" ? "Eve" : undefined,
            unsubscribeUrl,
          });

          if (result.success) {
            emailResults.sent++;
            return { success: true, email: recipient.email };
          }
          emailResults.failed++;
          emailResults.failures.push(`${recipient.email}: ${result.error}`);
          return {
            success: false,
            email: recipient.email,
            error: result.error,
          };
        } catch (error) {
          emailResults.failed++;
          const failureText = error instanceof Error ? error.message : "Unknown error";
          emailResults.failures.push(`${recipient.email}: ${failureText}`);
          return {
            success: false,
            email: recipient.email,
            error: failureText,
          };
        }
      });

      await Promise.all(batchPromises);

      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    await blogPostsCollection.updateOne(
      { id: post.id },
      { $set: { lastEmailedAt: new Date(), updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: "Blog post notifications sent",
      results: emailResults,
    });
  } catch (error) {
    console.error("[Blog] Error sending notifications:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send blog post notifications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
