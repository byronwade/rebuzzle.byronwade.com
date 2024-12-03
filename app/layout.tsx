import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { QueryProvider } from '@/components/providers'
import '@/styles/globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true 
})

export const metadata: Metadata = {
  metadataBase: new URL('https://rebuzzle.byronwade.com'),
  title: {
    default: 'Rebuzzle - Daily Rebus Puzzles',
    template: '%s | Rebuzzle'
  },
  description: 'Challenge yourself with daily rebus puzzles. Solve visual word puzzles and maintain your daily streak!',
  keywords: ['rebus', 'puzzle', 'word game', 'daily puzzle', 'brain teaser'],
  authors: [{ name: 'Byron Wade' }],
  creator: 'Byron Wade',
  publisher: 'Byron Wade',
  openGraph: {
    title: 'Rebuzzle - Daily Rebus Puzzles',
    description: 'Challenge yourself with daily rebus puzzles. Solve visual word puzzles and maintain your daily streak!',
    url: 'https://rebuzzle.byronwade.com',
    siteName: 'Rebuzzle',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rebuzzle - Daily Rebus Puzzles',
    description: 'Challenge yourself with daily rebus puzzles. Solve visual word puzzles and maintain your daily streak!',
    creator: '@byronwade',
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
} 