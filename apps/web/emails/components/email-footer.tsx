import { Link, Section, Text } from "@react-email/components";
import { appBaseUrl, colors, fonts } from "./theme";

interface EmailFooterProps {
  unsubscribeUrl?: string;
  showUnsubscribe?: boolean;
}

export function EmailFooter({ unsubscribeUrl, showUnsubscribe = true }: EmailFooterProps) {
  const baseUrl = appBaseUrl();

  return (
    <Section style={footerStyle}>
      <Text style={brandNoteStyle}>One board a day · Local midnight unlock</Text>
      <Text style={navStyle}>
        <Link href={baseUrl} style={linkStyle}>
          Play
        </Link>
        {" · "}
        <Link href={`${baseUrl}/how-it-works`} style={linkStyle}>
          How it works
        </Link>
        {" · "}
        <Link href={`${baseUrl}/blog`} style={linkStyle}>
          Blog
        </Link>
        {" · "}
        <Link href={`${baseUrl}/settings`} style={linkStyle}>
          Preferences
        </Link>
      </Text>
      <Text style={legalStyle}>
        <Link href={`${baseUrl}/privacy`} style={mutedLinkStyle}>
          Privacy
        </Link>
        {" · "}
        <Link href={`${baseUrl}/terms`} style={mutedLinkStyle}>
          Terms
        </Link>
        {" · "}© {new Date().getFullYear()} Rebuzzle
      </Text>
      {showUnsubscribe && unsubscribeUrl ? (
        <Text style={unsubStyle}>
          <Link href={unsubscribeUrl} style={mutedLinkStyle}>
            Unsubscribe
          </Link>
        </Text>
      ) : null}
    </Section>
  );
}

const footerStyle = {
  backgroundColor: colors.canvas,
  borderTop: `1px solid ${colors.line}`,
  padding: "24px 28px 28px",
  textAlign: "center" as const,
};

const brandNoteStyle = {
  margin: "0 0 14px",
  fontFamily: fonts.mono,
  fontSize: "11px",
  fontWeight: "500" as const,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: colors.subtle,
};

const navStyle = {
  margin: "0 0 12px",
  fontSize: "13px",
  color: colors.muted,
};

const legalStyle = {
  margin: "0",
  fontSize: "12px",
  color: colors.subtle,
};

const unsubStyle = {
  margin: "14px 0 0",
  fontSize: "12px",
  color: colors.subtle,
};

const linkStyle = {
  color: colors.muted,
  textDecoration: "none",
};

const mutedLinkStyle = {
  color: colors.subtle,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};
