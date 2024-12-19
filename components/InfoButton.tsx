'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Info, Bell, BellOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/hooks/useNotifications";

export function InfoButton() {
	const { isSignedIn } = useAuth();
	const [showInfoDialog, setShowInfoDialog] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const { notificationsEnabled, isLoading, error, showInstructions, showEmailDialog, email, handleToggleNotifications, setShowInstructions, setShowEmailDialog, setEmail, setError } = useNotifications();

	useEffect(() => {
		setIsMounted(true);
		const hasSeenDialog = localStorage.getItem("hasSeenInfoDialog");
		if (!hasSeenDialog) {
			setShowInfoDialog(true);
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
			<Button variant="ghost" size="icon" onClick={() => setShowInfoDialog(true)} className="relative">
				<Info className="h-5 w-5" />
			</Button>

			<Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>How to Play</DialogTitle>
						<DialogDescription className="space-y-4 pt-4">
							<p>Rebuzzle is a daily word puzzle game that challenges you to find the hidden word by making guesses.</p>
							<div className="space-y-2">
								<h4 className="font-semibold">Rules:</h4>
								<ul className="list-disc list-inside space-y-1">
									<li>You have unlimited attempts to guess the word</li>
									<li>Each guess must be a valid 5-letter word</li>
									<li>The color of the tiles will change to show how close your guess was</li>
									<li>A new puzzle is available each day at 8am</li>
								</ul>
							</div>
							<div className="space-y-2">
								<h4 className="font-semibold">Get Notified:</h4>
								<div className="flex items-center gap-2">
									<Button variant={isMobile ? "default" : "ghost"} size={isMobile ? "default" : "sm"} onClick={handleToggleNotifications} disabled={isLoading} className={cn("flex items-center gap-2", isMobile && "w-full justify-center")}>
										{notificationsEnabled ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
										<span>{notificationsEnabled ? "Disable Notifications" : "Enable Notifications"}</span>
									</Button>
								</div>
								<p className="text-sm text-muted-foreground">{isSignedIn ? "You'll receive both email and push notifications when new puzzles are available." : "Enter your email to receive notifications when new puzzles are available."}</p>
							</div>
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>

			{error && (
				<Dialog open={!!error} onOpenChange={() => setError(null)}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Notification Error</DialogTitle>
							<DialogDescription>{error}</DialogDescription>
						</DialogHeader>
					</DialogContent>
				</Dialog>
			)}

			<Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Enter Email for Notifications</DialogTitle>
						<DialogDescription>
							<p className="mb-4">Please enter your email address to receive notifications when you're not logged in.</p>
							<Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" />
							<Button
								onClick={() => {
									if (email) {
										setShowEmailDialog(false);
										void handleToggleNotifications();
									}
								}}
								className="mt-4 w-full"
								disabled={!email}
							>
								nable Notifications
							</Button>
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>

			<Dialog open={showInstructions} onOpenChange={setShowInstructions}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Enable Notifications</DialogTitle>
						<DialogDescription>
							<p className="mb-4">Notifications are currently blocked. To enable notifications, follow these steps:</p>
							<ol className="space-y-2 list-decimal list-inside">
								<li>Click the lock/info icon in the address bar (left of the URL)</li>
								<li>Click "Site settings"</li>
								<li>Find "Notifications"</li>
								<li>Change it from "Block" to "Ask" or "Allow"</li>
								<li>Refresh this page</li>
							</ol>
							<p className="mt-4">If you don&apos;t see the option there:</p>
							<ol className="space-y-2 list-decimal list-inside">
								<li>Open your browser settings</li>
								<li>Go to "Privacy and security"</li>
								<li>Click "Site Settings"</li>
								<li>Click "Notifications"</li>
								<li>Find this site and change to "Ask" or "Allow"</li>
							</ol>
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</>
	);
}

