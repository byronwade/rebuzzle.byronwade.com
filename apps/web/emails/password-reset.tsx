import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";

interface PasswordResetEmailProps {
  username: string;
  resetUrl: string;
  expiryHours?: number;
}

export function PasswordResetEmail({
  username,
  resetUrl,
  expiryHours = 1,
}: PasswordResetEmailProps) {
  return (
    <BaseEmail preview="Reset your Rebuzzle password" showUnsubscribe={false}>
      <Heading style={headingStyle}>Reset Your Password</Heading>

      <Text style={textStyle}>Hi {username},</Text>

      <Text style={textStyle}>
        We received a request to reset your password. Click the button below to
        create a new password:
      </Text>

      <Section style={buttonSectionStyle}>
        <Button href={resetUrl} style={buttonStyle}>
          Reset Password
        </Button>
      </Section>

      <Text style={textStyle}>
        Or copy and paste this link into your browser:
      </Text>

      <Text style={linkTextStyle}>{resetUrl}</Text>

      <Section style={warningBoxStyle}>
        <Text style={warningTextStyle}>
          <strong>⚠️ Security Notice:</strong>
        </Text>
        <Text style={warningTextStyle}>
          • This link will expire in {expiryHours} hour
          {expiryHours > 1 ? "s" : ""}
        </Text>
        <Text style={warningTextStyle}>
          • If you didn't request this, you can safely ignore this email
        </Text>
        <Text style={warningTextStyle}>
          • Your password will not change until you click the link above
        </Text>
      </Section>

      <Text style={textStyle}>
        For security reasons, never share this link with anyone. If you have
        concerns about your account security, please contact our support team.
      </Text>
    </BaseEmail>
  );
}

const headingStyle = {
  fontSize: "28px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const textStyle = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0 0 16px",
};

const buttonSectionStyle = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const buttonStyle = {
  backgroundColor: "#8b5cf6",
  color: "#ffffff",
  padding: "14px 28px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "16px",
  display: "inline-block",
};

const linkTextStyle = {
  fontSize: "12px",
  lineHeight: "1.6",
  color: "#6b7280",
  wordBreak: "break-all" as const,
  backgroundColor: "#f3f4f6",
  padding: "12px",
  borderRadius: "4px",
  margin: "16px 0",
  fontFamily: "monospace",
};

const warningBoxStyle = {
  backgroundColor: "#fef2f2",
  borderLeft: "4px solid #ef4444",
  borderRadius: "4px",
  padding: "16px 20px",
  margin: "24px 0",
};

const warningTextStyle = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#991b1b",
  margin: "4px 0",
};

