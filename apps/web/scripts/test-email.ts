import dotenv from "dotenv";
import { sendEmail } from "../src/lib/notifications/email-service";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function testEmail() {
  console.log("Testing email service...");

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "Warning: RESEND_API_KEY is not set in .env.local. Skipping email send verification."
    );
    return;
  }

  const testEmail = "test@example.com"; // Replace with a valid email if needed for real testing

  console.log(`Sending test email to ${testEmail}...`);

  const result = await sendEmail({
    to: testEmail,
    subject: "Test Email from Rebuzzle",
    html: "<h1>This is a test email</h1><p>If you received this, the email service is working!</p>",
    text: "This is a test email. If you received this, the email service is working!",
  });

  if (result.success) {
    console.log("Email sent successfully!");
    console.log("Message ID:", result.messageId);
  } else {
    console.error("Failed to send email:", result.error);
  }
}

testEmail().catch(console.error);
