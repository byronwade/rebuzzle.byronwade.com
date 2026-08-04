import { Body, Container, Head, Html, Preview, Section } from "@react-email/components";
import type { ReactNode } from "react";
import { EmailFooter } from "./email-footer";
import { EmailHeader } from "./email-header";
import { styles } from "./theme";

interface BaseEmailProps {
  children: ReactNode;
  preview?: string;
  unsubscribeUrl?: string;
  showUnsubscribe?: boolean;
  /** Optional label under the wordmark (e.g. "Daily puzzle"). */
  kicker?: string;
}

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600&display=swap";

export function BaseEmail({
  children,
  preview,
  unsubscribeUrl,
  showUnsubscribe = true,
  kicker,
}: BaseEmailProps) {
  return (
    <Html lang="en">
      <Head>
        <link href={FONT_HREF} rel="stylesheet" />
      </Head>
      <Preview>{preview || "Rebuzzle — one visual puzzle a day"}</Preview>
      <Body style={styles.body}>
        <Section style={styles.outer}>
          <Container style={styles.container}>
            <EmailHeader kicker={kicker} />
            <Section style={styles.content}>{children}</Section>
            <EmailFooter showUnsubscribe={showUnsubscribe} unsubscribeUrl={unsubscribeUrl} />
          </Container>
        </Section>
      </Body>
    </Html>
  );
}
