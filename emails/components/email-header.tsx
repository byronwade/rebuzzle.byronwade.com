import { Container, Heading, Link, Section } from "@react-email/components";

interface EmailHeaderProps {
  logoUrl?: string;
  appName?: string;
}

export function EmailHeader({
  logoUrl = "https://byronwade.com/logo.png",
  appName = "Rebuzzle",
}: EmailHeaderProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";

  return (
    <Section style={headerStyle}>
      <Container style={containerStyle}>
        <Link href={baseUrl} style={logoLinkStyle}>
          <Heading style={headingStyle}>🧩 {appName}</Heading>
        </Link>
      </Container>
    </Section>
  );
}

const headerStyle = {
  backgroundColor: "#ffffff",
  padding: "20px 0",
  borderBottom: "1px solid #e5e7eb",
};

const containerStyle = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "0 20px",
};

const logoLinkStyle = {
  textDecoration: "none",
  color: "inherit",
};

const headingStyle = {
  margin: "0",
  fontSize: "24px",
  fontWeight: "600",
  color: "#8b5cf6",
  textAlign: "center" as const,
};
