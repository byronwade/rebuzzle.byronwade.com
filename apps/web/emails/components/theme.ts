/**
 * Email tokens aligned to the marketing/play site (globals.css + Header).
 * Narrative type = Inter (Geist fallback). Technical layer = IBM Plex Mono.
 */

export const colors = {
  /** `--background` */
  canvas: "#fafafa",
  /** `--card` */
  paper: "#ffffff",
  /** `--foreground` / `--primary` */
  ink: "#171717",
  /** Soft body ink */
  inkSoft: "#2a2a2a",
  /** `--muted-foreground` */
  muted: "#666666",
  /** `--subtle-foreground` */
  subtle: "#888888",
  /** `--border` */
  line: "#ebebeb",
  /** `--border-strong` */
  lineStrong: "#a1a1a1",
  /** `--inset` / `--muted` / `--secondary` */
  inset: "#f5f5f5",
  /** `--link` */
  link: "#0070f3",
  /** `--link-deep` */
  linkDeep: "#0761d1",
  /** `--primary-foreground` / on-ink */
  onInk: "#fafafa",
  /** Soft warning wash (from `--warning` #f5a623) */
  warnBg: "#fff6e8",
  warnInk: "#8a5a12",
  /** Soft danger wash (from `--destructive` #ee0000) */
  dangerBg: "#fff1f1",
  dangerInk: "#b30000",
  white: "#ffffff",
} as const;

/** Site stacks: Geist → Inter. Email loads Inter + IBM Plex Mono via <Head>. */
export const fonts = {
  sans: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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
    WebkitFontSmoothing: "antialiased" as const,
  },
  outer: {
    backgroundColor: colors.canvas,
    padding: "40px 16px",
  },
  container: {
    backgroundColor: colors.paper,
    margin: "0 auto",
    maxWidth: "560px",
    borderRadius: "8px",
    border: `1px solid ${colors.line}`,
    overflow: "hidden" as const,
  },
  content: {
    padding: "32px 28px 28px",
  },
  /** Site `.eyebrow`: mono 11px, uppercase, tracking 0.14em, subtle */
  eyebrow: {
    margin: "0 0 14px",
    fontFamily: fonts.mono,
    fontSize: "11px",
    fontWeight: "500" as const,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: colors.subtle,
  },
  /** Site h1: weight 600, tracking ~-0.04em — no serif */
  h1: {
    margin: "0 0 16px",
    fontFamily: fonts.sans,
    fontSize: "32px",
    fontWeight: "600" as const,
    lineHeight: "1.12",
    letterSpacing: "-0.04em",
    color: colors.ink,
  },
  h2: {
    margin: "0 0 10px",
    fontFamily: fonts.sans,
    fontSize: "22px",
    fontWeight: "600" as const,
    lineHeight: "1.2",
    letterSpacing: "-0.035em",
    color: colors.ink,
  },
  h3: {
    margin: "0 0 8px",
    fontFamily: fonts.sans,
    fontSize: "15px",
    fontWeight: "600" as const,
    letterSpacing: "-0.02em",
    color: colors.ink,
  },
  p: {
    margin: "0 0 16px",
    fontSize: "15px",
    lineHeight: "1.65",
    color: colors.muted,
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
  /** Marketing `.cta-pill`: ink fill, pill radius, medium weight, 15px */
  cta: {
    backgroundColor: colors.ink,
    color: colors.onInk,
    padding: "12px 20px",
    borderRadius: "999px",
    textDecoration: "none",
    fontWeight: "500" as const,
    fontSize: "15px",
    letterSpacing: "-0.01em",
    display: "inline-block",
    lineHeight: "1.2",
  },
  panel: {
    backgroundColor: colors.inset,
    border: `1px solid ${colors.line}`,
    borderRadius: "8px",
    padding: "20px 20px",
    margin: "24px 0",
  },
  panelWarn: {
    backgroundColor: colors.warnBg,
    border: `1px solid ${colors.warnInk}22`,
    borderRadius: "8px",
    padding: "20px 20px",
    margin: "24px 0",
  },
  panelDanger: {
    backgroundColor: colors.dangerBg,
    border: `1px solid ${colors.dangerInk}22`,
    borderRadius: "8px",
    padding: "20px 20px",
    margin: "24px 0",
  },
  link: {
    color: colors.link,
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
    fontSize: "14px",
    lineHeight: "1.6",
    color: colors.subtle,
  },
} as const;
