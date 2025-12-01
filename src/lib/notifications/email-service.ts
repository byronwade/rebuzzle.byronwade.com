/**
 * Email Notification Service
 *
 * Uses Resend SDK for reliable email delivery
 * Integrates with React Email for template rendering
 */

import type { ReactElement } from "react";
import React from "react";
import { Resend } from "resend";
import { renderEmailTemplateSync } from "../emails/render";

// Initialize Resend client lazily
let resend: Resend | null = null;

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export type EmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Send email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // Development mode check
    if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
      // eslint-disable-next-line no-console
      console.log("[Email] Would send email:", {
        to: options.to,
        subject: options.subject,
      });
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
      };
    }

    const client = getResendClient();

    if (!client) {
      return {
        success: false,
        error: "RESEND_API_KEY is not configured",
      };
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      process.env.FROM_EMAIL ||
      "notifications@byronwade.com";

    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });

    if (error) {
      console.error("[Email] Resend API error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Email] Send failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send email from React Email component
 */
export async function sendEmailFromTemplate(
  component: ReactElement,
  to: string,
  subject: string
): Promise<EmailResult> {
  try {
    const { html, text } = await renderEmailTemplateSync(component);

    // Ensure html and text are strings
    const htmlString = typeof html === "string" ? html : String(html);
    const textString = typeof text === "string" ? text : String(text);

    return await sendEmail({
      to,
      subject,
      html: htmlString,
      text: textString,
    });
  } catch (error) {
    console.error("[Email] Template rendering failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Template rendering failed",
    };
  }
}

/**
 * Send signup welcome email
 */
export async function sendSignupWelcomeEmail(
  email: string,
  username: string
): Promise<EmailResult> {
  const { SignupWelcomeEmail } = await import("../../../emails/signup-welcome");
  return sendEmailFromTemplate(
    React.createElement(SignupWelcomeEmail, { username, email }),
    email,
    `Welcome to Rebuzzle, ${username}! 🎉`
  );
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  username: string,
  resetUrl: string,
  expiryHours = 1
): Promise<EmailResult> {
  const { PasswordResetEmail } = await import("../../../emails/password-reset");
  return sendEmailFromTemplate(
    React.createElement(PasswordResetEmail, {
      username,
      resetUrl,
      expiryHours,
    }),
    email,
    "Reset Your Rebuzzle Password"
  );
}

/**
 * Send daily puzzle notification email (enhanced with React Email)
 */
export async function sendDailyPuzzleEmail(
  email: string,
  puzzleUrl: string,
  options?: {
    username?: string;
    puzzleType?: string;
    difficulty?: string;
    unsubscribeUrl?: string;
  }
): Promise<EmailResult> {
  const { DailyPuzzleEmail } = await import("../../../emails/daily-puzzle");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";
  const unsubscribeUrl =
    options?.unsubscribeUrl ||
    `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;

  return sendEmailFromTemplate(
    React.createElement(DailyPuzzleEmail, {
      username: options?.username,
      puzzleUrl,
      puzzleType: options?.puzzleType,
      difficulty: options?.difficulty,
      unsubscribeUrl,
    }),
    email,
    "🧩 Today's Rebuzzle is Ready!"
  );
}

/**
 * Send blog post notification email
 */
export async function sendBlogPostEmail(
  email: string,
  options: {
    username?: string;
    postTitle: string;
    postExcerpt: string;
    postUrl: string;
    authorName?: string;
    featuredImageUrl?: string;
    unsubscribeUrl?: string;
  }
): Promise<EmailResult> {
  const { BlogPostEmail } = await import("../../../emails/blog-post");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";
  const unsubscribeUrl =
    options.unsubscribeUrl ||
    `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;

  return sendEmailFromTemplate(
    React.createElement(BlogPostEmail, {
      username: options.username,
      postTitle: options.postTitle,
      postExcerpt: options.postExcerpt,
      postUrl: options.postUrl,
      authorName: options.authorName,
      featuredImageUrl: options.featuredImageUrl,
      unsubscribeUrl,
    }),
    email,
    `📝 ${options.postTitle}`
  );
}

/**
 * Send notification welcome email
 */
export async function sendNotificationWelcomeEmail(
  email: string,
  unsubscribeUrl?: string
): Promise<EmailResult> {
  const { NotificationWelcomeEmail } = await import(
    "../../../emails/notification-welcome"
  );
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";
  const finalUnsubscribeUrl =
    unsubscribeUrl ||
    `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;

  return sendEmailFromTemplate(
    React.createElement(NotificationWelcomeEmail, {
      email,
      unsubscribeUrl: finalUnsubscribeUrl,
    }),
    email,
    "Welcome to Rebuzzle Notifications! 🎉"
  );
}

/**
 * Send password change confirmation email
 */
export async function sendPasswordChangeEmail(
  email: string,
  username: string,
  timestamp: Date,
  ipAddress?: string
): Promise<EmailResult> {
  const { PasswordChangeEmail } = await import(
    "../../../emails/password-change"
  );
  return sendEmailFromTemplate(
    React.createElement(PasswordChangeEmail, {
      username,
      timestamp,
      ipAddress,
    }),
    email,
    "Your Rebuzzle Password Has Been Changed"
  );
}
