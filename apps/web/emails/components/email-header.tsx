import { Heading, Link, Section, Text } from "@react-email/components";
import { appBaseUrl, colors, fonts, styles } from "./theme";

interface EmailHeaderProps {
  appName?: string;
  kicker?: string;
}

/**
 * Matches site Header wordmark: Inter/Geist, 600, ~17px, tracking -0.04em on light chrome.
 */
export function EmailHeader({ appName = "Rebuzzle", kicker }: EmailHeaderProps) {
  const baseUrl = appBaseUrl();

  return (
    <Section style={headerStyle}>
      <Link href={baseUrl} style={logoLinkStyle}>
        <Heading as="h1" style={wordmarkStyle}>
          {appName}
        </Heading>
      </Link>
      {kicker ? <Text style={kickerStyle}>{kicker}</Text> : null}
    </Section>
  );
}

const headerStyle = {
  backgroundColor: colors.paper,
  borderBottom: `1px solid ${colors.line}`,
  padding: "20px 28px 18px",
  textAlign: "left" as const,
};

const logoLinkStyle = {
  textDecoration: "none",
  color: "inherit",
  display: "inline-block",
};

const wordmarkStyle = {
  margin: "0",
  fontFamily: fonts.sans,
  fontSize: "17px",
  fontWeight: "600" as const,
  letterSpacing: "-0.04em",
  color: colors.ink,
  lineHeight: "1.2",
};

const kickerStyle = {
  ...styles.eyebrow,
  margin: "10px 0 0",
};
