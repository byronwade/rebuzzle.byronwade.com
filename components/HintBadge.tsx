"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LightbulbIcon, LockIcon, UnlockIcon } from "lucide-react";
import { trackEvent, analyticsEvents } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
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
	const { toast } = useToast();

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
			toast({
				title: "No hints available",
				description: "There are no hints available for this puzzle.",
				duration: 3000,
			});
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

			// Show toast notification
			toast({
				title: `Hint ${newRevealedCount} Revealed`,
				description: "Using hints will reduce your points for this puzzle.",
				duration: 3000,
			});

			// Reset revealing state after animation
			setTimeout(() => setIsRevealing(false), 500);
		}
	};

	if (!hints || hints.length === 0) return null;

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Badge variant="outline" className={cn("cursor-pointer hover:bg-purple-50 transition-all", isRevealing && "scale-110", className)}>
					<LightbulbIcon className="w-3 h-3 mr-1" />
					{revealedHints}/{hints.length} Hints
				</Badge>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<LightbulbIcon className="w-5 h-5" />
						Need a Hint?
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-4">
					{hints.map((hint, index) => {
						const isRevealed = index < revealedHints;
						const isNext = index === revealedHints;

						return (
							<div key={index} className={cn("p-4 rounded-lg border transition-all duration-300", isRevealed ? "bg-white border-gray-200" : "bg-gray-50/50 border-gray-100", isNext && "border-purple-200 shadow-sm", isRevealing && isRevealed && index === revealedHints - 1 && "animate-bounce")}>
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2">
										<span className="font-medium text-sm">Hint {index + 1}</span>
										{isRevealed ? (
											<Badge variant="secondary" className="text-xs">
												<UnlockIcon className="w-3 h-3 mr-1" />
												Revealed
											</Badge>
										) : (
											<Badge variant="outline" className="text-xs text-gray-500">
												<LockIcon className="w-3 h-3 mr-1" />
												Locked
											</Badge>
										)}
									</div>
								</div>
								<div className={cn("text-sm transition-all duration-300", isRevealed ? "text-gray-700" : "text-gray-400")}>{isRevealed ? hint : "This hint is still locked"}</div>
							</div>
						);
					})}

					{revealedHints < hints.length && (
						<div className="pt-2">
							<Button onClick={handleRevealNextHint} className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200" variant="outline">
								<LightbulbIcon className="w-4 h-4 mr-2" />
								Reveal Hint {revealedHints + 1}
							</Button>
							<p className="text-xs text-gray-500 mt-3 text-center">Using hints will reduce your points for this puzzle</p>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
