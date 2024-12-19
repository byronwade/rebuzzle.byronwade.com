"use client";

import { useState } from "react";
import { InfoButton } from "./InfoButton";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, BellOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { Timer } from "./Timer";
import { useAuth } from "./AuthProvider";
import { useNotifications } from "@/lib/hooks/useNotifications";

interface HeaderProps {
	nextPlayTime: Date | null;
}

export default function Header({ nextPlayTime }: HeaderProps) {
	const { isAuthenticated } = useAuth();
	const { notificationsEnabled, isLoading, error, showInstructions, showEmailDialog, email, handleToggleNotifications, setShowInstructions, setShowEmailDialog, setEmail, setError } = useNotifications();

	return (
		<header className="w-full max-w-2xl flex flex-col items-start pt-4">
			<div className="w-full flex justify-between items-center mb-2">
				<div className="flex items-center">
					<h1 className="text-xl sm:text-2xl font-bold mr-4">Rebuzzle</h1>
					<nav className="flex space-x-4">
						<Link href="/" className="text-sm font-medium hover:text-purple-400">
							Home
						</Link>
						<Link href="/blog" className="text-sm font-medium hover:text-purple-400">
							Blog
						</Link>
					</nav>
				</div>
				<div className="flex items-center space-x-2">
					<Button variant="outline" size="sm" asChild>
						<Link href="https://www.buymeacoffee.com/VFYLE26" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
							<img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="Buy me a coffee" className="h-4 w-4" />
							<span className="hidden sm:inline">Donate</span>
						</Link>
					</Button>
					<Button variant="ghost" size="icon" onClick={handleToggleNotifications} disabled={isLoading} title={notificationsEnabled ? "Disable daily reminders" : "Enable daily reminders"}>
						{notificationsEnabled ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
					</Button>
					<InfoButton />
					<UserMenu isAuthenticated={isAuthenticated} />
				</div>
			</div>
			<Timer nextPlayTime={nextPlayTime} className="text-xs text-gray-600 w-full" />

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
								Enable Notifications
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
		</header>
	);
}
