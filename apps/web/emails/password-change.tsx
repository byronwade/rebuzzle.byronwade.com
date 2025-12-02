import { Heading, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";

interface PasswordChangeEmailProps {
  username: string;
  timestamp: Date;
  ipAddress?: string;
}

export function PasswordChangeEmail({
  username,
  timestamp,
  ipAddress,
}: PasswordChangeEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";
  const formattedDate = timestamp.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const resetPasswordUrl = `${baseUrl}/forgot-password`;

  return (
    <BaseEmail
      preview="Your Rebuzzle password has been changed"
      showUnsubscribe={false}
    >
      <Heading style={headingStyle}>Password Changed Successfully</Heading>

      <Text style={textStyle}>Hi {username},</Text>

      <Text style={textStyle}>
        This email confirms that your Rebuzzle password was successfully
        changed.
      </Text>

      <Section style={infoBoxStyle}>
        <Text style={infoTextStyle}>
          <strong>Change Details:</strong>
        </Text>
        <Text style={infoTextStyle}>• Date & Time: {formattedDate}</Text>
        {ipAddress && (
          <Text style={infoTextStyle}>• IP Address: {ipAddress}</Text>
        )}
      </Section>

      <Section style={warningBoxStyle}>
        <Text style={warningTextStyle}>
          <strong>⚠️ Security Notice:</strong>
        </Text>
        <Text style={warningTextStyle}>
          If you did not make this change, your account may be compromised.
          Please take immediate action:
        </Text>
        <Text style={warningTextStyle}>
          1. Reset your password immediately by clicking{" "}
          <a href={resetPasswordUrl} style={linkStyle}>
            here
          </a>
        </Text>
        <Text style={warningTextStyle}>
          2. Review your account settings for any unauthorized changes
        </Text>
        <Text style={warningTextStyle}>
          3. Contact our support team if you notice any suspicious activity
        </Text>
      </Section>

      <Text style={textStyle}>
        If you made this change, you can safely ignore this email. Your new
        password is now active and you can use it to log in to your account.
      </Text>

      <Text style={textStyle}>For security reasons, we recommend:</Text>
      <ul style={listStyle}>
        <li style={listItemStyle}>Using a strong, unique password</li>
        <li style={listItemStyle}>Not sharing your password with anyone</li>
        <li style={listItemStyle}>
          Enabling two-factor authentication if available
        </li>
        <li style={listItemStyle}>Regularly reviewing your account activity</li>
      </ul>

      <Text style={textStyle}>
        If you have any questions or concerns, please contact our support team.
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

const infoBoxStyle = {
  backgroundColor: "#f0f9ff",
  borderLeft: "4px solid #3b82f6",
  borderRadius: "4px",
  padding: "16px 20px",
  margin: "24px 0",
};

const infoTextStyle = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#1e40af",
  margin: "4px 0",
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

const linkStyle = {
  color: "#8b5cf6",
  textDecoration: "underline",
};

const listStyle = {
  margin: "16px 0",
  paddingLeft: "24px",
};

const listItemStyle = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "8px 0",
};

