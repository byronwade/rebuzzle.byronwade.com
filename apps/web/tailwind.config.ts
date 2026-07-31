import type { Config } from "tailwindcss";

/**
 * Rebuzzle design system.
 *
 * Ink on canvas: a neutral ladder carries every surface, hairline and
 * disabled state; the brand mesh gradient is the only decorative chrome.
 * Display type is tracked aggressively negative and never exceeds weight 600.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "475px",
        "3xl": "1600px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Body ladder — neutral to slightly-negative tracking.
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "-0.005em" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.02em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.03em" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.035em" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.04em" }],
        "5xl": ["3rem", { lineHeight: "1", letterSpacing: "-0.045em" }],
        "6xl": ["3.75rem", { lineHeight: "1", letterSpacing: "-0.05em" }],
        "7xl": ["4.5rem", { lineHeight: "1", letterSpacing: "-0.05em" }],
        // Display ladder — mirrors the brand's hero / section scale.
        "display-sm": ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.03em" }],
        "display-md": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.04em" }],
        "display-lg": ["2rem", { lineHeight: "2.5rem", letterSpacing: "-0.04em" }],
        "display-xl": ["3rem", { lineHeight: "1", letterSpacing: "-0.05em" }],
      },
      fontWeight: {
        // 600 is the display ceiling. Heavier aliases are remapped rather than
        // removed so existing `font-bold` markup lands on the system's ceiling.
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "600",
        extrabold: "600",
        black: "600",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        inset: "hsl(var(--inset))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        subtle: {
          DEFAULT: "hsl(var(--subtle-foreground))",
          foreground: "hsl(var(--subtle-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        link: {
          DEFAULT: "hsl(var(--link))",
          deep: "hsl(var(--link-deep))",
        },
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)", // 4px — tightest inline chrome
        md: "calc(var(--radius) - 2px)", // 6px — in-app buttons, inputs, menus
        lg: "var(--radius)", // 8px — marketing + feature cards
        xl: "0.75rem", // 12px — larger card chrome
        "2xl": "1rem", // 16px — cards with a hero image cap
        pill: "100px", // marketing CTA
      },
      boxShadow: {
        // Stacked small offsets + an inset hairline ring — never one heavy drop.
        border: "var(--shadow-border)",
        sm: "var(--shadow-sm), var(--shadow-border)",
        DEFAULT: "var(--shadow-sm), var(--shadow-border)",
        md: "var(--shadow-md), var(--shadow-border)",
        lg: "var(--shadow-lg), var(--shadow-border)",
        xl: "var(--shadow-menu), var(--shadow-border)",
        "2xl": "var(--shadow-menu), var(--shadow-border)",
        menu: "var(--shadow-menu), var(--shadow-border)",
        none: "none",
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-top": "env(safe-area-inset-top)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
        header: "var(--header-height)",
      },
      maxWidth: {
        page: "1200px",
        "page-wide": "1400px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "mesh-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(-2%, 1.5%, 0) scale(1.06)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "mesh-drift": "mesh-drift 18s ease-in-out infinite",
      },
      typography: () => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": "hsl(var(--muted-foreground))",
            "--tw-prose-headings": "hsl(var(--foreground))",
            "--tw-prose-lead": "hsl(var(--muted-foreground))",
            "--tw-prose-links": "hsl(var(--foreground))",
            "--tw-prose-bold": "hsl(var(--foreground))",
            "--tw-prose-counters": "hsl(var(--subtle-foreground))",
            "--tw-prose-bullets": "hsl(var(--border-strong))",
            "--tw-prose-hr": "hsl(var(--border))",
            "--tw-prose-quotes": "hsl(var(--foreground))",
            "--tw-prose-quote-borders": "hsl(var(--border))",
            "--tw-prose-captions": "hsl(var(--subtle-foreground))",
            "--tw-prose-code": "hsl(var(--foreground))",
            "--tw-prose-pre-code": "hsl(var(--background))",
            "--tw-prose-pre-bg": "hsl(var(--foreground))",
            "--tw-prose-th-borders": "hsl(var(--border))",
            "--tw-prose-td-borders": "hsl(var(--border))",
            maxWidth: "68ch",
            h1: { letterSpacing: "-0.04em", fontWeight: "600" },
            h2: { letterSpacing: "-0.035em", fontWeight: "600" },
            h3: { letterSpacing: "-0.03em", fontWeight: "600" },
            h4: { letterSpacing: "-0.02em", fontWeight: "600" },
            a: { fontWeight: "500", textUnderlineOffset: "3px" },
            code: {
              fontWeight: "400",
              fontSize: "0.875em",
              backgroundColor: "hsl(var(--inset))",
              padding: "0.15em 0.4em",
              borderRadius: "4px",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            pre: { borderRadius: "8px", fontSize: "0.8125rem", lineHeight: "1.55" },
          },
        },
      }),
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
