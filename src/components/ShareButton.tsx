"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Twitter, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
	success: boolean;
	attempts: number;
	maxAttempts: number;
	className?: string;
}

export function ShareButton({ success, attempts, maxAttempts, className }: ShareButtonProps) {
	const [isSharing, setIsSharing] = useState(false);

	const generateShareText = () => {
		const emoji = success ? "🟩" : "🟥";
		const attemptEmojis = Array(maxAttempts).fill("⬜").fill(emoji, 0, attempts);
		return `Rebuzzle ${success ? attempts : "X"}/${maxAttempts}

${attemptEmojis.join("")}

Play now at ${typeof window !== "undefined" ? window.location.origin : "https://rebuzzle.com"}`;
	};

	const handleShare = async (platform: "twitter" | "facebook") => {
		setIsSharing(true);
		const shareText = generateShareText();
		const encodedText = encodeURIComponent(shareText);
		const url = typeof window !== "undefined" ? window.location.origin : "https://rebuzzle.com";
		const encodedUrl = encodeURIComponent(url);

		let shareUrl = "";
		if (platform === "twitter") {
			shareUrl = `https://x.com/intent/tweet?text=${encodedText}`;
		} else {
			shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
		}

		window.open(shareUrl, "_blank", "noopener,noreferrer");
		setIsSharing(false);
	};

	return (
		<div className={cn("flex justify-center gap-2", className)}>
			<Button onClick={() => handleShare("twitter")} disabled={isSharing} className="flex items-center gap-1 bg-black hover:bg-gray-800 text-white" size="sm">
				<Twitter className="h-4 w-4" />
				<span className="text-xs">Share on X</span>
			</Button>
			<Button onClick={() => handleShare("facebook")} disabled={isSharing} className="flex items-center gap-1 bg-[#1877F2] hover:bg-[#1664d8] text-white" size="sm">
				<Facebook className="h-4 w-4" />
				<span className="text-xs">Share on Facebook</span>
			</Button>
		</div>
	);
}
