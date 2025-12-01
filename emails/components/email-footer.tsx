import { Container, Hr, Link, Section, Text } from "@react-email/components";

interface EmailFooterProps {
  unsubscribeUrl?: string;
  showUnsubscribe?: boolean;
}

export function EmailFooter({
  unsubscribeUrl,
  showUnsubscribe = true,
}: EmailFooterProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";

  return (
    <Section style={footerStyle}>
      <Container style={containerStyle}>
        <Hr style={hrStyle} />
        <Text style={footerTextStyle}>
          © {new Date().getFullYear()} Rebuzzle. All rights reserved.
        </Text>
        <Text style={footerLinkStyle}>
          <Link href={`${baseUrl}/settings`} style={linkStyle}>
            Manage Preferences
          </Link>
          {" • "}
          <Link href={`${baseUrl}/leaderboard`} style={linkStyle}>
            Leaderboard
          </Link>
          {" • "}
          <Link href={`${baseUrl}/blog`} style={linkStyle}>
            Blog
          </Link>
        </Text>
        <Text style={footerLinkStyle}>
          <Link href={`${baseUrl}/privacy`} style={linkStyle}>
            Privacy Policy
          </Link>
          {" • "}
          <Link href={`${baseUrl}/terms`} style={linkStyle}>
            Terms of Service
          </Link>
        </Text>
        {showUnsubscribe && unsubscribeUrl && (
          <Text style={unsubscribeTextStyle}>
            <Link href={unsubscribeUrl} style={unsubscribeLinkStyle}>
              Unsubscribe from these emails
            </Link>
          </Text>
        )}
      </Container>
    </Section>
  );
}

const footerStyle = {
  backgroundColor: "#f9fafb",
  padding: "30px 0",
  marginTop: "40px",
};

const containerStyle = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "0 20px",
};

const hrStyle = {
  borderColor: "#e5e7eb",
  margin: "20px 0",
};

const footerTextStyle = {
  fontSize: "12px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "10px 0",
};

const footerLinkStyle = {
  fontSize: "12px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "10px 0",
};

const linkStyle = {
  color: "#8b5cf6",
  textDecoration: "underline",
};

const unsubscribeTextStyle = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "20px 0 10px",
};

const unsubscribeLinkStyle = {
  color: "#9ca3af",
  textDecoration: "underline",
};
