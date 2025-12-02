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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EnhancedShareButtonProps {
  success: boolean;
  attempts: number;
  maxAttempts: number;
  streak?: number;
  difficulty?: number;
  answer?: string;
  puzzleType?: string;
  className?: string;
}

export function EnhancedShareButton({
  success,
  attempts,
  maxAttempts,
  streak = 0,
  difficulty,
  answer,
  puzzleType,
  className,
}: EnhancedShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { userId } = useAuth();
  const hasTrackedShare = useRef(false);

  // Track share for achievement (only once per session)
  const trackShare = async () => {
    if (!userId || hasTrackedShare.current) return;
    hasTrackedShare.current = true;

    try {
      // Award share_result achievement
      await fetch("/api/user/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualAward: { achievementId: "share_result" },
        }),
      });

      // Also update the sharedResults counter in stats
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

  const generateShareText = () => {
    const url = getBaseUrl();
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    // Create visual representation
    const squares = success
      ? "🟩".repeat(attempts) + "⬜".repeat(maxAttempts - attempts)
      : "🟥".repeat(attempts);

    // SEO-friendly, engaging message that's not overdone
    // Includes natural keywords: daily puzzle, rebus puzzle, word game, free puzzle
    let message = `Rebuzzle ${today} - ${success ? attempts : "X"}/${maxAttempts}\n\n${squares}\n\n`;

    if (success) {
      message += `✅ Solved today's daily puzzle!`;
      if (streak > 0) {
        message += ` 🔥 ${streak} day streak`;
      }
      message += `\n\nTry the free daily rebus puzzle game at ${url}`;
    } else {
      message += `Challenge yourself with today's puzzle!\n\nPlay free daily puzzles at ${url}`;
    }

    return message;
  };

  const generateShareUrl = () => {
    return getBaseUrl();
  };

  const generateTwitterText = () => {
    // Twitter has character limits (280), so make it more concise
    const url = getBaseUrl();
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const squares = success
      ? "🟩".repeat(attempts) + "⬜".repeat(maxAttempts - attempts)
      : "🟥".repeat(attempts);

    let tweet = `Rebuzzle ${today} ${success ? attempts : "X"}/${maxAttempts}\n\n${squares}\n\n`;
    if (success) {
      tweet += `✅ Solved! `;
      if (streak > 0) {
        tweet += `🔥 ${streak} day streak `;
      }
    }
    tweet += `Play free daily rebus puzzles: ${url}`;

    return tweet;
  };

  const handleShare = async (platform: string) => {
    setIsSharing(true);
    const url = generateShareUrl();
    const encodedUrl = encodeURIComponent(url);

    // Track share for achievement
    trackShare();

    try {
      switch (platform) {
        case "native": {
          // Use Web Share API if available
          if (navigator.share) {
            const shareData = {
              title: success
                ? `Rebuzzle - Solved in ${attempts} attempts!`
                : "Rebuzzle - Daily Puzzle Challenge",
              text: generateShareText(),
              url,
            };
            await navigator.share(shareData);
          } else {
            // Fallback to copy
            await handleCopy();
          }
          break;
        }

        case "twitter": {
          const tweetText = generateTwitterText();
          const encodedText = encodeURIComponent(tweetText);
          const shareUrl = `https://x.com/intent/tweet?text=${encodedText}`;
          window.open(shareUrl, "_blank", "noopener,noreferrer");
          break;
        }

        case "facebook": {
          const shareText = generateShareText();
          const encodedText = encodeURIComponent(shareText);
          const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
          window.open(shareUrl, "_blank", "noopener,noreferrer");
          break;
        }

        case "linkedin": {
          const shareText = generateShareText();
          const encodedText = encodeURIComponent(shareText);
          const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&summary=${encodedText}`;
          window.open(shareUrl, "_blank", "noopener,noreferrer");
          break;
        }

        case "reddit": {
          const shareText = success
            ? `Rebuzzle ${success ? attempts : "X"}/${maxAttempts} - Solved today's puzzle!`
            : "Rebuzzle - Daily Puzzle Challenge";
          const encodedTitle = encodeURIComponent(shareText);
          const shareUrl = `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
          window.open(shareUrl, "_blank", "noopener,noreferrer");
          break;
        }

        case "email": {
          const subject = success
            ? `I solved today's Rebuzzle in ${attempts} attempts!`
            : "Try today's Rebuzzle puzzle challenge";
          const body = generateShareText();
          const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          window.location.href = mailtoUrl;
          break;
        }

        case "copy": {
          await handleCopy();
          break;
        }
      }
    } catch (error) {
      console.error("Error sharing:", error);
      // Fallback to copy on error
      if (platform !== "copy") {
        await handleCopy();
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    try {
      const text = generateShareText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Check if Web Share API is available
  const hasNativeShare = typeof navigator !== "undefined" && navigator.share;

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex flex-col gap-2", className)}>
        {/* Primary share button */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  className="w-full rounded-xl bg-neutral-800 py-6 font-semibold text-lg text-white shadow-lg transition-all hover:bg-neutral-900 hover:shadow-xl dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
                  disabled={isSharing}
                  size="lg"
                >
                  <Share2 className="mr-2 h-5 w-5" />
                  {copied ? "Copied!" : "Share Results"}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Share your results on social media</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="center" className="w-56">
            {hasNativeShare && (
              <>
                <DropdownMenuItem className="cursor-pointer" onClick={() => handleShare("native")}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share via...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem className="cursor-pointer" onClick={() => handleShare("twitter")}>
              <Twitter className="mr-2 h-4 w-4" />
              Share on X (Twitter)
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => handleShare("facebook")}>
              <Facebook className="mr-2 h-4 w-4" />
              Share on Facebook
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => handleShare("linkedin")}>
              <Linkedin className="mr-2 h-4 w-4" />
              Share on LinkedIn
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => handleShare("reddit")}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Share on Reddit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => handleShare("email")}>
              <Mail className="mr-2 h-4 w-4" />
              Share via Email
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => handleShare("copy")}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick copy button as fallback */}
        {!hasNativeShare && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="w-full border-2 py-3" onClick={handleCopy} variant="outline">
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Copy Share Text
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy results to clipboard</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
