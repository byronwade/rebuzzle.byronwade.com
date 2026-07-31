/**
 * Test Email Sending Script
 *
 * Sends a test email to verify the email system is working
 */

import dotenv from "dotenv";
import { sendSignupWelcomeEmail } from "../src/lib/notifications/email-service";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function testEmail() {
  const testEmail = "bcw1995@gmail.com";
  const testUsername = "Test User";

  console.log(`📧 Sending test email to ${testEmail}...`);

  // Set NODE_ENV to development if not set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️  Warning: RESEND_API_KEY is not set in .env.local.");
    console.log("   In development mode, emails will be logged but not sent.");
    console.log("   Set RESEND_API_KEY in .env.local to send real emails.");
    console.log("   Continuing with test in development mode...\n");
  }

  try {
    const result = await sendSignupWelcomeEmail(testEmail, testUsername);

    if (result.success) {
      console.log("✅ Email sent successfully!");
      console.log(`   Message ID: ${result.messageId}`);
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.RESEND_API_KEY
      ) {
        console.log(
          "   (This was a development mode test - email was not actually sent)"
        );
      }
    } else {
      console.error("❌ Failed to send email:");
      console.error(`   Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error sending email:", error);
    process.exit(1);
  }
}

testEmail();
