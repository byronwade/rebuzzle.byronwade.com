import { Heading, Link, Section, Text } from "@react-email/components";
import { appBaseUrl, colors, fonts, styles } from "./theme";

interface EmailHeaderProps {
  appName?: string;
  kicker?: string;
}

export function EmailHeader({ appName = "Rebuzzle", kicker }: EmailHeaderProps) {
  const baseUrl = appBaseUrl();

  return (
    <Section style={headerStyle}>
      <Link href={baseUrl} style={logoLinkStyle}>
        <Heading as="h1" style={wordmarkStyle}>
          {appName}
        </Heading>
      </Link>
      {kicker ? <Text style={styles.eyebrow}>{kicker}</Text> : null}
      <Text style={taglineStyle}>See it. Say it. Solve it.</Text>
    </Section>
  );
}

const headerStyle = {
  backgroundColor: colors.ink,
  color: colors.paper,
  padding: "28px 28px 24px",
  textAlign: "center" as const,
};

const logoLinkStyle = {
  textDecoration: "none",
  color: "inherit",
  display: "inline-block",
};

const wordmarkStyle = {
  margin: "0 0 8px",
  fontFamily: fonts.serif,
  fontSize: "32px",
  fontWeight: "700" as const,
  letterSpacing: "-0.03em",
  color: colors.paper,
  lineHeight: "1.1",
};

const taglineStyle = {
  margin: "0",
  fontFamily: fonts.mono,
  fontSize: "11px",
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "rgba(255, 252, 247, 0.55)",
};
