'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Info, Bell, BellOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/hooks/useNotifications";

export function InfoButton() {
	const { isAuthenticated } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const { notificationsEnabled, isLoading, error, showInstructions, showEmailDialog, email, handleToggleNotifications, setShowInstructions, setShowEmailDialog, setEmail, setError } = useNotifications();

	useEffect(() => {
		setIsMounted(true);
		const hasSeenDialog = localStorage.getItem("hasSeenInfoDialog");
		if (!hasSeenDialog) {
			setIsOpen(true);
			localStorage.setItem("hasSeenInfoDialog", "true");
		}

		// Check if we're on a mobile device
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		// Initial check
		checkMobile();

		// Add resize listener
		window.addEventListener("resize", checkMobile);

		return () => {
			window.removeEventListener("resize", checkMobile);
		};
	}, []);

	if (!isMounted) {
		return null;
	}

	return (
		<>
			<Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="hover:bg-gray-100 transition-colors">
				<Info className="h-4 w-4" />
			</Button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="max-w-md mx-4 rounded-2xl border-0 shadow-2xl">
					<DialogHeader className="text-center pb-4">
						<DialogTitle className="text-2xl font-bold text-purple-600">How to Play Rebuzzle</DialogTitle>
						<DialogDescription className="text-gray-600 mt-2">Solve visual word puzzles by interpreting the clues</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						{/* Game Rules */}
						<div className="space-y-4">
							<div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
								<div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
									<span className="text-purple-600 font-bold text-sm">1</span>
								</div>
								<div>
									<h3 className="font-semibold text-gray-800 mb-1">Interpret the Puzzle</h3>
									<p className="text-sm text-gray-600">Look at the visual clues and figure out what word or phrase they represent.</p>
								</div>
							</div>

							<div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
								<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
									<span className="text-blue-600 font-bold text-sm">2</span>
								</div>
								<div>
									<h3 className="font-semibold text-gray-800 mb-1">Type Your Answer</h3>
									<p className="text-sm text-gray-600">Use the virtual keyboard or your device's keyboard to enter your guess.</p>
								</div>
							</div>

							<div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
								<div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
									<span className="text-green-600 font-bold text-sm">3</span>
								</div>
								<div>
									<h3 className="font-semibold text-gray-800 mb-1">Submit & Win</h3>
									<p className="text-sm text-gray-600">Hit submit when ready. You have 3 attempts to solve each puzzle!</p>
								</div>
							</div>
						</div>

						{/* Example */}
						<div className="p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
							<h3 className="font-semibold text-gray-800 mb-3 text-center">Example Puzzle</h3>
							<div className="text-center mb-3">
								<div className="text-4xl font-bold text-gray-700 bg-white p-4 rounded-xl shadow-sm">
									STAND
									<br />
									<span className="text-2xl">I</span>
								</div>
							</div>
							<p className="text-sm text-gray-600 text-center">
								Answer: <span className="font-semibold text-purple-600">"I understand"</span>
								<br />
								<span className="text-xs text-gray-500">(I is standing under "STAND")</span>
							</p>
						</div>

						{/* Tips */}
						<div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
							<h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
								<span className="text-lg">💡</span>
								Pro Tips
							</h3>
							<ul className="space-y-1 text-sm text-amber-700">
								<li>• Think about word positioning and relationships</li>
								<li>• Consider common phrases and idioms</li>
								<li>• Look for visual puns and wordplay</li>
								<li>• Use hints if you get stuck!</li>
							</ul>
						</div>
					</div>

					<div className="pt-4 border-t border-gray-100">
						<Button onClick={() => setIsOpen(false)} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-12 font-semibold">
							Got it! Let's Play
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{error && (
				<Dialog open={!!error} onOpenChange={() => setError(null)}>
					<DialogContent className="max-w-[95vw] sm:max-w-md mx-auto">
						<DialogHeader>
							<DialogTitle className="text-base xs:text-lg">Notification Error</DialogTitle>
							<DialogDescription className="text-xs xs:text-sm">{error}</DialogDescription>
						</DialogHeader>
					</DialogContent>
				</Dialog>
			)}

			<Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
				<DialogContent className="max-w-[95vw] sm:max-w-md mx-auto">
					<DialogHeader>
						<DialogTitle className="text-base xs:text-lg">Enter Email for Notifications</DialogTitle>
						<DialogDescription className="text-xs xs:text-sm">Please enter your email address to receive notifications when you're not logged in.</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 xs:space-y-4">
						<Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="text-sm xs:text-base h-10 xs:h-11" />
						<Button
							onClick={() => {
								if (email) {
									setShowEmailDialog(false);
									void handleToggleNotifications();
								}
							}}
							className="w-full text-sm xs:text-base h-10 xs:h-11"
							disabled={!email}
						>
							Enable Notifications
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={showInstructions} onOpenChange={setShowInstructions}>
				<DialogContent className="max-w-[95vw] sm:max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-base xs:text-lg">Enable Notifications</DialogTitle>
						<DialogDescription className="text-xs xs:text-sm">Notifications are currently blocked. To enable notifications, follow these steps:</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 xs:space-y-4">
						<ol className="space-y-1 xs:space-y-2 text-xs xs:text-sm list-decimal list-inside leading-relaxed">
							<li>Click the lock/info icon in the address bar (left of the URL)</li>
							<li>Click "Site settings"</li>
							<li>Find "Notifications"</li>
							<li>Change it from "Block" to "Ask" or "Allow"</li>
							<li>Refresh this page</li>
						</ol>
						<p className="text-xs xs:text-sm text-muted-foreground">If you don&apos;t see the option there:</p>
						<ol className="space-y-1 xs:space-y-2 text-xs xs:text-sm list-decimal list-inside leading-relaxed">
							<li>Open your browser settings</li>
							<li>Go to "Privacy and security"</li>
							<li>Click "Site Settings"</li>
							<li>Click "Notifications"</li>
							<li>Find this site and change to "Ask" or "Allow"</li>
						</ol>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

