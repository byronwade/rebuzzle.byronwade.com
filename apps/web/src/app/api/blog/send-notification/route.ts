import { NextResponse } from "next/server";
import type { BlogPost, User } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getAppUrl } from "@/lib/env";
import { sendBlogPostEmail } from "@/lib/notifications/email-service";

export async function POST(request: Request) {
  try {
    const { postId, sendToAllUsers = false } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    // Get blog post
    const blogPostsCollection = getCollection<BlogPost>("blogPosts");
    const post = await blogPostsCollection.findOne({ id: postId });

    if (!post) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const baseUrl = getAppUrl();
    const postUrl = `${baseUrl}/blog/${post.slug}`;

    // Get recipients
    let recipients: Array<{ email: string; username?: string }> = [];

    if (sendToAllUsers) {
      // Send to all registered users
      const usersCollection = getCollection<User>("users");
      const allUsers = await usersCollection.find({}).toArray();
      recipients = allUsers.map((user) => ({
        email: user.email,
        username: user.username,
      }));
    } else {
      // Send only to email subscribers
      const emailSubscriptionsCollection = getCollection("emailSubscriptions");
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30); // Use UTC for consistent behavior

      const subscriptions = await emailSubscriptionsCollection
        .find({
          enabled: true,
          updatedAt: { $gte: thirtyDaysAgo },
        })
        .toArray();

      // Get user info for personalization
      const usersCollection = getCollection<User>("users");
      const userIds = subscriptions.map((s) => s.userId).filter((id): id is string => Boolean(id));
      const users = await usersCollection.find({ id: { $in: userIds } }).toArray();

      const userMap = new Map(users.map((u) => [u.id, u]));

      recipients = subscriptions.map((sub) => ({
        email: sub.email,
        username: sub.userId ? userMap.get(sub.userId)?.username : undefined,
      }));
    }

    console.log(`[Blog] Sending blog post notification to ${recipients.length} recipients`);

    // Send emails in batches
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
        try {
          const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}`;

          const result = await sendBlogPostEmail(recipient.email, {
            username: recipient.username,
            postTitle: post.title,
            postExcerpt: post.excerpt || "",
            postUrl,
            authorName: post.authorId === "ai-system" ? "Rebuzzle AI" : undefined,
            unsubscribeUrl,
          });

          if (result.success) {
            emailResults.sent++;
            return { success: true, email: recipient.email };
          }
          emailResults.failed++;
          emailResults.errors.push(`${recipient.email}: ${result.error}`);
          return {
            success: false,
            email: recipient.email,
            error: result.error,
          };
        } catch (error) {
          emailResults.failed++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          emailResults.errors.push(`${recipient.email}: ${errorMessage}`);
          return {
            success: false,
            email: recipient.email,
            error: errorMessage,
          };
        }
      });

      await Promise.all(batchPromises);

      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

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
