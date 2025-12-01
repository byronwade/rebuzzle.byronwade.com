"use client";

import Link from "next/link";
import type React from "react";
import Header from "./Header";
import { MobileAppPrompt } from "./MobileAppPrompt";

type LayoutProps = {
  children: React.ReactNode;
  nextPlayTime?: Date | null;
  puzzlesPlayedToday?: number;
  puzzleType?: string;
};

export default function Layout({
  children,
  nextPlayTime = null,
  puzzleType,
}: LayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 opacity-30 dark:opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(147,51,234,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(147,51,234,0.3),rgba(0,0,0,0))]" />
        <div
          className="absolute inset-0 motion-safe:animate-pulse motion-reduce:animate-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, rgba(147, 51, 234, 0.15) 1px, transparent 0)",
            backgroundSize: "20px 20px",
            animationDuration: "4s",
          }}
        />
      </div>

      {/* Header */}
      <Header nextPlayTime={nextPlayTime} puzzleType={puzzleType} />

      {/* Main content with smooth transitions */}
      <main
        className="fade-in-up relative z-10 animate-in pb-2 duration-700 sm:pb-4"
        id="main-content"
      >
        {children}
      </main>

      {/* Mobile app download prompt - only shows on mobile devices */}
      <MobileAppPrompt />

      {/* Enhanced footer */}
      <footer className="relative z-10 border-border border-t bg-card/50 text-center text-sm backdrop-blur-md">
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 md:px-6">
          <p className="font-medium text-muted-foreground">
            © {new Date().getFullYear()} Rebuzzle. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground">
            <Link
              className="group relative transition-colors duration-200 hover:text-foreground"
              href="/leaderboard"
            >
              Leaderboard
              <span className="-bottom-0.5 absolute left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
            <span className="text-border">•</span>
            <Link
              className="group relative transition-colors duration-200 hover:text-foreground"
              href="/blog"
            >
              Blog
              <span className="-bottom-0.5 absolute left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
            <span className="text-border">•</span>
            <Link
              className="group relative transition-colors duration-200 hover:text-foreground"
              href="/how-it-works"
            >
              How It Works
              <span className="-bottom-0.5 absolute left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground text-xs">
            <Link
              className="group relative transition-colors duration-200 hover:text-foreground"
              href="/privacy"
            >
              Privacy Policy
              <span className="-bottom-0.5 absolute left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
            <span className="text-border">•</span>
            <Link
              className="group relative transition-colors duration-200 hover:text-foreground"
              href="/terms"
            >
              Terms of Service
              <span className="-bottom-0.5 absolute left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
