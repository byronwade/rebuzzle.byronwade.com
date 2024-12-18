"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function InfoDialog() {
	const [isOpen, setIsOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
		const hasSeenDialog = localStorage.getItem("hasSeenInfoDialog");
		if (!hasSeenDialog) {
			setIsOpen(true);
		}
	}, []);

	const handleClose = () => {
		localStorage.setItem("hasSeenInfoDialog", "true");
		setIsOpen(false);
	};

	// Don't render anything during SSR or before hydration
	if (!isMounted) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[425px] bg-background">
				<DialogHeader>
					<DialogTitle className="text-xl font-bold">Welcome to Rebuzzle!</DialogTitle>
					<DialogDescription className="text-base">Here's how to play:</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<h4 className="font-medium">🎯 Daily Challenge</h4>
						<p className="text-sm text-muted-foreground">Each day brings a new rebus puzzle. Try to solve it in as few attempts as possible!</p>
					</div>
					<div className="space-y-2">
						<h4 className="font-medium">🤔 How to Solve</h4>
						<p className="text-sm text-muted-foreground">Look at the visual clue and type your answer. The answer is always a common word or phrase.</p>
					</div>
					<div className="space-y-2">
						<h4 className="font-medium">💡 Need Help?</h4>
						<p className="text-sm text-muted-foreground">Use the hint badge to reveal helpful clues, but be careful - each hint reduces your potential points!</p>
					</div>
					<div className="space-y-2">
						<h4 className="font-medium">🏆 Points & Streaks</h4>
						<p className="text-sm text-muted-foreground">Create an account to track your progress, earn points, and compete on the leaderboard!</p>
					</div>
				</div>
				<DialogFooter>
					<Button onClick={handleClose} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
						Let's Play!
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
