import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from "@react-email/components";
import type { ReactNode } from "react";
import { EmailFooter } from "./email-footer";
import { EmailHeader } from "./email-header";

interface BaseEmailProps {
  children: ReactNode;
  preview?: string;
  unsubscribeUrl?: string;
  showUnsubscribe?: boolean;
}

export function BaseEmail({
  children,
  preview,
  unsubscribeUrl,
  showUnsubscribe = true,
}: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview || "Rebuzzle - Daily Puzzle Game"}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <EmailHeader />
          <Section style={contentStyle}>{children as any}</Section>
          <EmailFooter
            showUnsubscribe={showUnsubscribe}
            unsubscribeUrl={unsubscribeUrl}
          />
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f9fafb",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: "0",
  padding: "0",
};

const containerStyle = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  overflow: "hidden",
};

const contentStyle = {
  padding: "40px 20px",
};

