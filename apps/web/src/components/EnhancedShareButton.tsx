"use client";

import {
  Check,
  Copy,
  Facebook,
  Link2,
  Linkedin,
  Mail,
  MessageCircle,
  Share2,
  Twitter,
} from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { beatMeShareLine, buildBeatMeUrl } from "@/lib/game/share-challenge";
import { haptics } from "@/lib/haptics";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { playInterfaceSound } from "@/lib/interface-sounds";
import { cn } from "@/lib/utils";

interface EnhancedShareButtonProps {
  success: boolean;
  attempts: number;
  maxAttempts: number;
  streak?: number;
  difficulty?: number;
  answer?: string;
  puzzleType?: string;
  /** Player brushed a close miss before solving / on loss. */
  nearMiss?: boolean;
  className?: string;
  /** Smaller primary for inline result cards. */
  size?: "default" | "sm" | "lg";
}

export function EnhancedShareButton({
  success,
  attempts,
  maxAttempts,
  streak = 0,
  nearMiss = false,
  className,
  size = "sm",
}: EnhancedShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const isClient = useIsClient();
  const hasNativeShare =
    isClient && typeof navigator !== "undefined" && typeof navigator.share === "function";
  const { userId } = useAuth();
  const hasTrackedShare = useRef(false);

  const trackShare = async () => {
    if (!userId || hasTrackedShare.current) return;
    hasTrackedShare.current = true;

    try {
      await fetch("/api/user/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualAward: { achievementId: "share_first" },
        }),
      });

      await fetch("/api/user/update-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incrementSharedResults: true,
        }),
      });
    } catch (error) {
      console.error("Error tracking share:", error);
    }
  };

  const getBaseUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "https://rebuzzle.com";
  };

  const generateShareUrl = () => buildBeatMeUrl(getBaseUrl(), userId);

  const generateShareText = () => {
    const url = generateShareUrl();
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const squares = success
      ? "🟩".repeat(attempts) + "⬜".repeat(maxAttempts - attempts)
      : "🟥".repeat(Math.max(1, attempts));

    let message = `Rebuzzle ${today} · ${success ? attempts : "X"}/${maxAttempts}\n\n${squares}\n\n`;

    if (success) {
      if (attempts === 1) {
        message += `First guess.`;
      } else if (attempts >= maxAttempts) {
        message += `Clutch — last heart.`;
      } else if (nearMiss) {
        message += `Almost had it → got it.`;
      } else {
        message += `Solved today's puzzle.`;
      }
      const invite = beatMeShareLine(streak, true);
      if (invite) message += ` ${invite}`;
      message += `\n\n${url}`;
    } else if (nearMiss) {
      message += `So close.\n\n${url}`;
    } else {
      message += `Today's puzzle.\n\n${url}`;
    }

    return message;
  };

  const generateTwitterText = () => {
    const url = generateShareUrl();
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const squares = success
      ? "🟩".repeat(attempts) + "⬜".repeat(maxAttempts - attempts)
      : "🟥".repeat(Math.max(1, attempts));

    let tweet = `Rebuzzle ${today} ${success ? attempts : "X"}/${maxAttempts}\n\n${squares}\n\n`;
    if (success) {
      if (attempts === 1) tweet += `First guess. `;
      else if (attempts >= maxAttempts) tweet += `Clutch. `;
      else if (nearMiss) tweet += `Almost → got it. `;
      else tweet += `Solved. `;
      if (streak > 0) tweet += `🔥${streak} `;
    } else if (nearMiss) {
      tweet += `So close. `;
    }
    tweet += url;
    return tweet;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopied(true);
      haptics.tap();
      void playInterfaceSound("notification");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      void playInterfaceSound("failure");
    }
  };

  const handleShare = async (platform: string) => {
    setIsSharing(true);
    const url = generateShareUrl();
    const encodedUrl = encodeURIComponent(url);
    void trackShare();

    try {
      switch (platform) {
        case "native": {
          if (navigator.share) {
            await navigator.share({
              title: success ? `Rebuzzle — solved in ${attempts}` : "Rebuzzle — daily puzzle",
              text: generateShareText(),
              url,
            });
            haptics.tap();
            void playInterfaceSound("notification");
          } else {
            await handleCopy();
          }
          break;
        }
        case "twitter": {
          window.open(
            `https://x.com/intent/tweet?text=${encodeURIComponent(generateTwitterText())}`,
            "_blank",
            "noopener,noreferrer"
          );
          break;
        }
        case "facebook": {
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(generateShareText())}`,
            "_blank",
            "noopener,noreferrer"
          );
          break;
        }
        case "linkedin": {
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            "_blank",
            "noopener,noreferrer"
          );
          break;
        }
        case "reddit": {
          const title = success ? `Rebuzzle ${attempts}/${maxAttempts}` : "Rebuzzle — daily puzzle";
          window.open(
            `https://reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(title)}`,
            "_blank",
            "noopener,noreferrer"
          );
          break;
        }
        case "email": {
          const subject = success
            ? `I solved today's Rebuzzle in ${attempts} attempts`
            : "Try today's Rebuzzle";
          const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(generateShareText())}`;
          window.open(mailto, "_self");
          break;
        }
        case "copy": {
          await handleCopy();
          break;
        }
      }
    } catch (error) {
      // User cancel on native share is fine — don't force copy.
      if (platform !== "native" && platform !== "copy") {
        console.error("Error sharing:", error);
        await handleCopy();
      }
    }
    setIsSharing(false);
  };

  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Share options"
          className={cn(
            hasNativeShare || !success ? "flex-1" : "w-full",
            !hasNativeShare && "w-full"
          )}
          disabled={isSharing}
          size={size}
          variant={hasNativeShare ? "outline" : "default"}
        >
          <Share2 data-icon="inline-start" className="mr-2 h-4 w-4" />
          {hasNativeShare ? "More" : "Share"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => void handleShare("twitter")}>
            <Twitter data-icon="inline-start" className="mr-2 h-4 w-4" />
            Share on X
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => void handleShare("facebook")}>
            <Facebook data-icon="inline-start" className="mr-2 h-4 w-4" />
            Share on Facebook
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => void handleShare("linkedin")}>
            <Linkedin data-icon="inline-start" className="mr-2 h-4 w-4" />
            Share on LinkedIn
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => void handleShare("reddit")}>
            <MessageCircle data-icon="inline-start" className="mr-2 h-4 w-4" />
            Share on Reddit
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => void handleShare("email")}>
            <Mail data-icon="inline-start" className="mr-2 h-4 w-4" />
            Email
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => void handleShare("copy")}>
            {copied ? (
              <Check data-icon="inline-start" className="mr-2 h-4 w-4" />
            ) : (
              <Copy data-icon="inline-start" className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy text"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex w-full gap-2", className)}>
        {hasNativeShare ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Share your result"
                  className="flex-[1.4]"
                  disabled={isSharing}
                  onClick={() => void handleShare("native")}
                  size={size}
                >
                  <Share2 data-icon="inline-start" className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share your result</TooltipContent>
            </Tooltip>
            {moreMenu}
          </>
        ) : (
          moreMenu
        )}

        {!hasNativeShare ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="flex-1"
                onClick={() => void handleCopy()}
                size={size}
                variant="outline"
              >
                {copied ? (
                  <Check data-icon="inline-start" className="mr-2 h-4 w-4" />
                ) : (
                  <Link2 data-icon="inline-start" className="mr-2 h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy results</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
