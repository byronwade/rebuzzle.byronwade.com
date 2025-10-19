"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LightbulbIcon, LockIcon, UnlockIcon } from "lucide-react";
import { trackEvent, analyticsEvents } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface HintBadgeProps {
	hints: string[];
	className?: string;
	onHintReveal?: (hintIndex: number) => void;
	gameId?: string;
}

export function HintBadge({ hints = [], className, onHintReveal, gameId }: HintBadgeProps) {
	const [revealedHints, setRevealedHints] = useState<number>(0);
	const [isRevealing, setIsRevealing] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	// Load revealed hints from localStorage
	useEffect(() => {
		if (typeof window !== "undefined" && gameId) {
			const savedHints = localStorage.getItem(`hints-${gameId}`);
			if (savedHints) {
				setRevealedHints(parseInt(savedHints));
			}
		}
	}, [gameId]);

	const handleRevealNextHint = () => {
		if (!hints || hints.length === 0) {
			// Show native notification for no hints (with permission check)
			if ("Notification" in window && Notification.permission === "granted") {
				new Notification("No hints available", {
					body: "There are no hints available for this puzzle.",
					icon: "/icon-192x192.png",
				});
			}
			return;
		}

		if (revealedHints < hints.length) {
			const newRevealedCount = revealedHints + 1;
			setRevealedHints(newRevealedCount);
			setIsRevealing(true);

			// Save to localStorage
			if (gameId) {
				localStorage.setItem(`hints-${gameId}`, newRevealedCount.toString());
			}

			// Track hint usage
			trackEvent(analyticsEvents.HINTS_REVEALED, {
				hintNumber: newRevealedCount,
				totalHints: hints.length,
				gameId,
			});

			// Notify parent component
			onHintReveal?.(newRevealedCount - 1);

			// Show native notification for hint reveal (with permission check)
			if ("Notification" in window && Notification.permission === "granted") {
				new Notification(`Hint ${newRevealedCount} Revealed`, {
					body: "Using hints will reduce your points for this puzzle.",
					icon: "/icon-192x192.png",
				});
			}

			// Reset revealing state after animation
			setTimeout(() => setIsRevealing(false), 500);
		}
	};

	if (!hints || hints.length === 0) return null;

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Badge variant="outline" className={cn("cursor-pointer hover:bg-purple-50 transition-all text-xs xs:text-sm", isRevealing && "scale-110", className)}>
					<LightbulbIcon className="w-3 h-3 xs:w-4 xs:h-4 mr-1" />
					<span className="hidden xs:inline">
						{revealedHints}/{hints.length} Hints
					</span>
					<span className="xs:hidden">
						{revealedHints}/{hints.length}
					</span>
				</Badge>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] max-w-[95vw] mx-auto max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-base xs:text-lg">
						<LightbulbIcon className="w-4 h-4 xs:w-5 xs:h-5" />
						Need a Hint?
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-3 xs:space-y-4 py-2 xs:py-4">
					{hints.map((hint, index) => {
						const isRevealed = index < revealedHints;
						const isNext = index === revealedHints;

						return (
							<div key={index} className={cn("p-3 xs:p-4 rounded-lg border transition-all duration-300", isRevealed ? "bg-white border-gray-200" : "bg-gray-50/50 border-gray-100", isNext && "border-purple-200 shadow-sm", isRevealing && isRevealed && index === revealedHints - 1 && "animate-bounce")}>
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-1 xs:gap-2">
										<span className="font-medium text-xs xs:text-sm">Hint {index + 1}</span>
										{isRevealed ? (
											<Badge variant="secondary" className="text-[10px] xs:text-xs px-1 xs:px-2 py-0.5">
												<UnlockIcon className="w-2 h-2 xs:w-3 xs:h-3 mr-0.5 xs:mr-1" />
												<span className="hidden xs:inline">Revealed</span>
												<span className="xs:hidden">✓</span>
											</Badge>
										) : (
											<Badge variant="outline" className="text-[10px] xs:text-xs text-gray-500 px-1 xs:px-2 py-0.5">
												<LockIcon className="w-2 h-2 xs:w-3 xs:h-3 mr-0.5 xs:mr-1" />
												<span className="hidden xs:inline">Locked</span>
												<span className="xs:hidden">🔒</span>
											</Badge>
										)}
									</div>
								</div>
								<div className={cn("text-xs xs:text-sm transition-all duration-300 leading-relaxed", isRevealed ? "text-gray-700" : "text-gray-400")}>{isRevealed ? hint : "This hint is still locked"}</div>
							</div>
						);
					})}

					{revealedHints < hints.length && (
						<div className="pt-2">
							<Button onClick={handleRevealNextHint} className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 text-sm xs:text-base h-10 xs:h-11" variant="outline">
								<LightbulbIcon className="w-3 h-3 xs:w-4 xs:h-4 mr-1 xs:mr-2" />
								Reveal Hint {revealedHints + 1}
							</Button>
							<p className="text-[10px] xs:text-xs text-gray-500 mt-2 xs:mt-3 text-center leading-relaxed px-2">Using hints will reduce your points for this puzzle</p>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
