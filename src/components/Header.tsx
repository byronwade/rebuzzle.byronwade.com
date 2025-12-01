"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";
import { InfoButton } from "./InfoButton";
import { NotificationBadge } from "./NotificationBadge";
import { Timer } from "./Timer";
import { UserMenu } from "./UserMenu";

type HeaderProps = {
  nextPlayTime: Date | null;
  puzzleType?: string;
};

export default function Header({ nextPlayTime, puzzleType }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering client-side state after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="w-full border-border border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6">
        {/* Logo */}
        <Link
          className="font-semibold text-foreground text-lg transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          href="/"
        >
          Rebuzzle
        </Link>

        {/* Navigation - Desktop */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            href="/"
          >
            Home
          </Link>
          <Link
            className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            href="/blog"
          >
            Blog
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {mounted && <NotificationBadge />}
          <InfoButton puzzleType={puzzleType} />
          <Button
            asChild
            className="flex items-center gap-1.5"
            size="sm"
            variant="ghost"
          >
            <Link
              href="https://www.buymeacoffee.com/VFYLE26"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Support</span>
            </Link>
          </Button>
          <UserMenu isAuthenticated={isAuthenticated} />
        </div>
      </div>

      {/* Timer bar */}
      <div className="mx-auto flex max-w-4xl items-center justify-between border-border border-t px-4 py-2 md:px-6">
        <Timer
          className="text-muted-foreground text-sm"
          nextPlayTime={nextPlayTime}
        />
      </div>
    </header>
  );
}
