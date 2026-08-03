/**
 * Rebuzzle email design tokens — ink on canvas, email-safe stacks.
 * Avoids the old purple SaaS look; keeps brand readable in Gmail/Outlook.
 */

export const colors = {
  canvas: "#f4f2ee",
  paper: "#fffcf7",
  ink: "#141414",
  inkSoft: "#3a3a3a",
  muted: "#6b6560",
  subtle: "#8a837c",
  line: "#e4dfd6",
  inset: "#efeae2",
  accent: "#0f766e",
  accentSoft: "#d8ebe8",
  warnBg: "#f7efe4",
  warnInk: "#6b4a1b",
  dangerBg: "#f8e8e6",
  dangerInk: "#7a2e24",
  white: "#ffffff",
} as const;

export const fonts = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://rebuzzle.byronwade.com";
}

export const styles = {
  body: {
    backgroundColor: colors.canvas,
    fontFamily: fonts.sans,
    margin: "0",
    padding: "0",
    color: colors.ink,
  },
  outer: {
    backgroundColor: colors.canvas,
    padding: "32px 12px",
  },
  container: {
    backgroundColor: colors.paper,
    margin: "0 auto",
    maxWidth: "560px",
    borderRadius: "4px",
    border: `1px solid ${colors.line}`,
    overflow: "hidden" as const,
  },
  content: {
    padding: "36px 28px 28px",
  },
  eyebrow: {
    margin: "0 0 12px",
    fontFamily: fonts.mono,
    fontSize: "11px",
    fontWeight: "600" as const,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    color: colors.subtle,
  },
  h1: {
    margin: "0 0 18px",
    fontFamily: fonts.serif,
    fontSize: "34px",
    fontWeight: "700" as const,
    lineHeight: "1.15",
    letterSpacing: "-0.02em",
    color: colors.ink,
  },
  h2: {
    margin: "0 0 10px",
    fontFamily: fonts.serif,
    fontSize: "22px",
    fontWeight: "700" as const,
    lineHeight: "1.25",
    letterSpacing: "-0.015em",
    color: colors.ink,
  },
  h3: {
    margin: "0 0 8px",
    fontFamily: fonts.sans,
    fontSize: "15px",
    fontWeight: "700" as const,
    color: colors.ink,
  },
  p: {
    margin: "0 0 14px",
    fontSize: "16px",
    lineHeight: "1.65",
    color: colors.inkSoft,
  },
  pSmall: {
    margin: "0 0 10px",
    fontSize: "14px",
    lineHeight: "1.6",
    color: colors.muted,
  },
  ctaWrap: {
    textAlign: "center" as const,
    margin: "28px 0 8px",
  },
  cta: {
    backgroundColor: colors.ink,
    color: colors.paper,
    padding: "14px 26px",
    borderRadius: "4px",
    textDecoration: "none",
    fontWeight: "600" as const,
    fontSize: "15px",
    letterSpacing: "0.01em",
    display: "inline-block",
  },
  ctaAccent: {
    backgroundColor: colors.accent,
    color: colors.white,
    padding: "14px 26px",
    borderRadius: "4px",
    textDecoration: "none",
    fontWeight: "600" as const,
    fontSize: "15px",
    display: "inline-block",
  },
  panel: {
    backgroundColor: colors.inset,
    border: `1px solid ${colors.line}`,
    borderRadius: "4px",
    padding: "18px 20px",
    margin: "22px 0",
  },
  panelAccent: {
    backgroundColor: colors.accentSoft,
    border: `1px solid ${colors.accent}33`,
    borderRadius: "4px",
    padding: "18px 20px",
    margin: "22px 0",
  },
  panelWarn: {
    backgroundColor: colors.warnBg,
    border: `1px solid ${colors.warnInk}22`,
    borderRadius: "4px",
    padding: "18px 20px",
    margin: "22px 0",
  },
  panelDanger: {
    backgroundColor: colors.dangerBg,
    border: `1px solid ${colors.dangerInk}22`,
    borderRadius: "4px",
    padding: "18px 20px",
    margin: "22px 0",
  },
  link: {
    color: colors.accent,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: "12px",
    color: colors.muted,
  },
  signature: {
    margin: "28px 0 0",
    fontSize: "15px",
    lineHeight: "1.6",
    color: colors.muted,
  },
} as const;
