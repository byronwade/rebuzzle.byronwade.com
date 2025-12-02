import { Heading, Link, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";

interface NotificationWelcomeEmailProps {
  email: string;
  unsubscribeUrl?: string;
}

export function NotificationWelcomeEmail({
  email,
  unsubscribeUrl,
}: NotificationWelcomeEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";

  return (
    <BaseEmail
      preview="Welcome to Rebuzzle notifications! You're all set."
      showUnsubscribe={true}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={headingStyle}>
        Welcome to Rebuzzle Notifications! 🎉
      </Heading>

      <Text style={textStyle}>
        Thanks for subscribing to email notifications! You're now set to receive
        updates about:
      </Text>

      <Section style={infoBoxStyle}>
        <Text style={infoTextStyle}>
          ✅ Daily puzzle availability notifications
        </Text>
        <Text style={infoTextStyle}>✅ Special events and challenges</Text>
        <Text style={infoTextStyle}>✅ Game updates and new features</Text>
        <Text style={infoTextStyle}>✅ Blog posts and puzzle insights</Text>
      </Section>

      <Section style={tipsBoxStyle}>
        <Heading as="h3" style={tipsHeadingStyle}>
          What to Expect
        </Heading>
        <Text style={tipsTextStyle}>
          You'll receive an email each morning when a new puzzle is ready. We
          typically send notifications around 8 AM in your timezone.
        </Text>
        <Text style={tipsTextStyle}>
          You can manage your notification preferences or unsubscribe at any
          time from your{" "}
          <Link href={`${baseUrl}/settings`} style={linkStyle}>
            account settings
          </Link>
          .
        </Text>
      </Section>

      <Text style={textStyle}>
        Ready to start solving? Head over to{" "}
        <Link href={baseUrl} style={linkStyle}>
          Rebuzzle
        </Link>{" "}
        and tackle today's puzzle!
      </Text>

      <Text style={textStyle}>
        If you have any questions or feedback, feel free to reach out. We're
        here to help!
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
  backgroundColor: "#f0fdf4",
  borderLeft: "4px solid #22c55e",
  borderRadius: "4px",
  padding: "20px",
  margin: "24px 0",
};

const infoTextStyle = {
  fontSize: "15px",
  lineHeight: "1.8",
  color: "#166534",
  margin: "4px 0",
};

const tipsBoxStyle = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const tipsHeadingStyle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 12px",
};

const tipsTextStyle = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#4b5563",
  margin: "8px 0",
};

const linkStyle = {
  color: "#8b5cf6",
  textDecoration: "underline",
};

