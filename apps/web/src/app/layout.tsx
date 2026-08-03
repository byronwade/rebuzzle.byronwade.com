import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppCommandMenu } from "@/components/AppCommandMenu";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthSessionSeed } from "@/components/AuthSessionSeed";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeHotkey } from "@/components/ThemeHotkey";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toaster";
import { VisualThemeProvider } from "@/components/VisualThemeProvider";
import { getServerSession } from "@/lib/auth/get-server-session";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import {
  generateAccessibilitySchema,
  generateEducationalUseSchema,
  generateOrganizationSchema,
  generateReviewSchema,
  generateSoftwareApplicationSchema,
  generateWebSiteSchema,
} from "@/lib/seo/structured-data";
import { VISUAL_THEME_BOOTSTRAP_SCRIPT } from "@/lib/visual-theme";

// Geometric sans carries display, body, button — everything narrative.
const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["Inter", "system-ui", "-apple-system", "sans-serif"],
  adjustFontFallback: true,
  // Distinct from --font-sans so visual skins can rebind the semantic stack.
  variable: "--font-geist-sans",
});

// Mono carries the technical layer only: eyebrows, code, puzzle ciphers.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  variable: "--font-geist-mono",
});

// Pixel face for the optional 8-bit visual skin (8bitcn-inspired).
const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-pixel",
});

// Enhanced viewport configuration for mobile
// Note: We allow zoom (don't set maximumScale or disable userScalable) per AGENTS.md
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  // Chromium/Android: resize layout viewport with the OSK. Safari ignores.
  interactiveWidget: "resizes-content",
};

// Pre-compute metadata with mobile-optimized PWA settings
export const metadata: Metadata = {
  metadataBase: new URL("https://rebuzzle.com"),
  title: {
    default: "Rebuzzle - Daily Rebus Puzzle Game",
    template: "%s | Rebuzzle",
  },
  description:
    "Rebuzzle - The ultimate Wordle alternative! Daily rebus puzzles, logic grids, cryptic crosswords, and more. Free AI-generated puzzles every day. Compete on leaderboards and build your streak!",
  keywords: [
    "rebus",
    "puzzle",
    "word game",
    "daily challenge",
    "brain teaser",
    "mobile game",
    "PWA",
    "wordle",
    "wordle alternative",
    "wordle like games",
    "daily puzzle game",
    "rebus puzzle game",
    "visual word puzzle",
    "emoji puzzle",
    "logic puzzle",
    "cryptic crossword",
    "number sequence puzzle",
    "pattern recognition",
    "caesar cipher",
    "trivia puzzle",
    "free puzzle game",
    "online puzzle game",
    "puzzle solver",
    "brain training",
    "cognitive game",
    "word puzzle daily",
    "puzzle challenge",
    "daily brain teaser",
    "puzzle app",
    "word game app",
  ],
  authors: [{ name: "Rebuzzle Team" }],
  creator: "Rebuzzle Team",
  publisher: "Rebuzzle",
  applicationName: "Rebuzzle",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rebuzzle",
    startupImage: [
      {
        url: "/apple-splash-2048-2732.png",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/apple-splash-1668-2224.png",
        media:
          "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/apple-splash-1536-2048.png",
        media:
          "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/apple-splash-1125-2436.png",
        media:
          "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/apple-splash-1242-2208.png",
        media:
          "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/apple-splash-750-1334.png",
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/apple-splash-640-1136.png",
        media:
          "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rebuzzle.com",
    siteName: "Rebuzzle",
    title: "Rebuzzle - Daily Rebus Puzzle Game",
    description:
      "Challenge your mind with Rebuzzle, a daily rebus puzzle game. Solve visual word puzzles and compete with friends!",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Rebuzzle - Daily Rebus Puzzle Game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rebuzzle - Daily Rebus Puzzle Game",
    description:
      "Challenge your mind with Rebuzzle, a daily rebus puzzle game. Solve visual word puzzles and compete with friends!",
    images: ["/opengraph-image"],
    creator: "@rebuzzle",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/icon-192x192.png", sizes: "192x192", type: "image/png" }],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://rebuzzle.com",
    languages: {
      "en-US": "https://rebuzzle.com",
    },
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Rebuzzle",
    "application-name": "Rebuzzle",
    "msapplication-TileColor": "#171717",
    "msapplication-config": "/browserconfig.xml",
  },
};

/**
 * Streams session into the stable AuthProvider without remounting page children.
 */
async function AuthSessionLoader() {
  await connection();
  const session = await getServerSession();
  return <AuthSessionSeed session={session} />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Generate JSON-LD structured data (static — safe to prerender)
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();
  const softwareApplicationSchema = generateSoftwareApplicationSchema();

  const reviewSchema = generateReviewSchema({
    ratingValue: 4.8,
    ratingCount: 500,
    ratingDistribution: {
      "5": 380,
      "4": 90,
      "3": 20,
      "2": 7,
      "1": 3,
    },
    datePublished: "2024-11-01T00:00:00.000Z",
  });
  const educationalUseSchema = generateEducationalUseSchema();
  const accessibilitySchema = generateAccessibilitySchema();

  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable}`}
      data-skin="default"
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: VISUAL_THEME_BOOTSTRAP_SCRIPT }} />
        {/* JSON-LD Structured Data */}
        <script
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(organizationSchema),
          }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(websiteSchema),
          }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(softwareApplicationSchema),
          }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(reviewSchema),
          }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(educationalUseSchema),
          }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(accessibilitySchema),
          }}
          type="application/ld+json"
        />

        {/* RSS Feed */}
        <link
          href="/feed.xml"
          rel="alternate"
          title="Rebuzzle Blog RSS Feed"
          type="application/rss+xml"
        />

        {/* Mobile-optimized icons */}
        <link href="/icon.svg" rel="icon" type="image/svg+xml" />
        <link href="/icon-192x192.png" rel="icon" sizes="192x192" type="image/png" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" sizes="180x180" />
        <link href="/icon-192x192.png" rel="shortcut icon" />

        {/* PWA manifest */}
        <link href="/manifest.json" rel="manifest" />

        {/* iOS specific meta tags */}
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta content="default" name="apple-mobile-web-app-status-bar-style" />
        <meta content="Rebuzzle" name="apple-mobile-web-app-title" />

        {/* Android specific meta tags */}
        <meta content="yes" name="mobile-web-app-capable" />
        <meta content="Rebuzzle" name="application-name" />

        {/* Microsoft specific meta tags */}
        <meta content="#171717" name="msapplication-TileColor" />
        <meta content="/icon-192x192.png" name="msapplication-TileImage" />

        {/* Notification permission hint for mobile */}
        <meta content="granted" name="notification-permission" />
      </head>
      <body className="min-h-screen overflow-x-hidden bg-background font-sans antialiased">
        {/* Skip to content link for keyboard navigation */}
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:font-medium focus:text-background focus:text-sm"
          href="#main-content"
        >
          Skip to content
        </a>
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
          >
            <ThemeHotkey />
            <AppCommandMenu />
            <VisualThemeProvider>
              <AuthProvider initialSession={null}>
                <Suspense
                  fallback={
                    <div
                      aria-busy="true"
                      aria-label="Loading session"
                      className="flex items-center gap-2 px-4 py-2"
                      role="status"
                    >
                      <Skeleton className="h-2 w-24" />
                      <span className="text-muted-foreground text-xs">Loading…</span>
                    </div>
                  }
                >
                  <AuthSessionLoader />
                </Suspense>
                {children}
                <Toaster />
              </AuthProvider>
            </VisualThemeProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
