"use client";

import { useState } from "react";
import { InfoButton } from "./InfoButton";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, BellOff, Heart, BellRing } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { Timer } from "./Timer";
import { useAuth } from "./AuthProvider";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface HeaderProps {
	nextPlayTime: Date | null;
}

export default function Header({ nextPlayTime }: HeaderProps) {
	const { isAuthenticated } = useAuth();
	const { notificationsEnabled, isLoading, error, showInstructions, showEmailDialog, email, handleToggleNotifications, setShowInstructions, setShowEmailDialog, setEmail, setError } = useNotifications();

	const getBellIcon = () => {
		if (isLoading) {
			return <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />;
		}

		if (notificationsEnabled) {
			return (
				<>
					<BellRing className="h-4 w-4" />
					<div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
				</>
			);
		}

		return <Bell className="h-4 w-4" />;
	};

	const getBellTooltip = () => {
		if (notificationsEnabled) {
			return "Daily reminders enabled - Click to disable";
		}
		return "Get daily puzzle reminders - Click to enable";
	};

	const getBellStyle = () => {
		if (notificationsEnabled) {
			return "text-green-600 hover:text-green-700 hover:bg-green-50";
		}
		return "text-gray-600 hover:text-blue-600 hover:bg-blue-50";
	};

	return (
		<header className="w-full bg-white backdrop-blur-sm border-b border-gray-100 px-4 sm:px-6 py-4">
			{/* Main header content */}
			<div className="max-w-4xl mx-auto flex items-center justify-between">
				{/* Logo and Navigation */}
				<div className="flex items-center gap-6">
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold text-purple-600">Rebuzzle</h1>
					</div>

					<nav className="hidden sm:flex items-center gap-6">
						<Link href="/" className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors duration-200 relative group">
							Home
							<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-600 transition-all duration-200 group-hover:w-full"></span>
						</Link>
						<Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors duration-200 relative group">
							Blog
							<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-600 transition-all duration-200 group-hover:w-full"></span>
						</Link>
					</nav>
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-3">
					<Button variant="outline" size="sm" asChild className="hidden sm:flex items-center gap-2 hover:border-pink-300 hover:text-pink-600 transition-colors">
						<Link href="https://www.buymeacoffee.com/VFYLE26" target="_blank" rel="noopener noreferrer">
							<Heart className="h-4 w-4 text-pink-500" />
							Support
						</Link>
					</Button>

					{/* Enhanced Notification Bell */}
					<Button variant="ghost" size="icon" onClick={handleToggleNotifications} disabled={isLoading} title={getBellTooltip()} className={cn("relative transition-all duration-200 rounded-full", getBellStyle(), isLoading && "cursor-not-allowed opacity-50")}>
						{getBellIcon()}
					</Button>

					<InfoButton />
					<UserMenu isAuthenticated={isAuthenticated} />
				</div>
			</div>

			{/* Secondary info bar */}
			<div className="max-w-4xl mx-auto flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
				<Timer nextPlayTime={nextPlayTime} className="text-sm text-gray-500" />

				<div className="flex items-center gap-2 text-sm text-gray-400">
					<div className="flex gap-1">
						{Array.from({ length: 7 }).map((_, i) => (
							<div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all duration-300", i < 3 ? "bg-green-400" : "bg-gray-300")} />
						))}
					</div>
					<span className="text-xs font-medium">Week streak</span>
				</div>
			</div>

			{/* Error Dialog */}
			{error && (
				<Dialog open={!!error} onOpenChange={() => setError(null)}>
					<DialogContent className="slide-up max-w-sm sm:max-w-md mx-auto">
						<DialogHeader>
							<DialogTitle className="text-red-600">Notification Error</DialogTitle>
							<DialogDescription className="text-sm">{error}</DialogDescription>
						</DialogHeader>
					</DialogContent>
				</Dialog>
			)}

			{/* Email Dialog - Only show when needed */}
			<Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
				<DialogContent className="slide-up max-w-sm sm:max-w-md mx-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Bell className="h-5 w-5 text-blue-600" />
							Enable Daily Reminders
						</DialogTitle>
						<DialogDescription>
							<p className="mb-4 text-sm text-gray-600">Enter your email to receive daily puzzle notifications at 8 AM.</p>
							<Input type="email" placeholder="your-email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 custom-focus text-sm" autoFocus />
							<div className="flex gap-2 mt-4">
								<Button
									onClick={() => {
										if (email) {
											setShowEmailDialog(false);
											void handleToggleNotifications();
										}
									}}
									className="flex-1 interactive-element text-sm"
									disabled={!email || isLoading}
								>
									{isLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Enable Notifications"}
								</Button>
								<Button variant="outline" onClick={() => setShowEmailDialog(false)} className="text-sm" disabled={isLoading}>
									Cancel
								</Button>
							</div>
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>

			{/* Instructions Dialog - Only for permission issues */}
			<Dialog open={showInstructions} onOpenChange={setShowInstructions}>
				<DialogContent className="slide-up max-w-sm sm:max-w-lg mx-auto max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<BellOff className="h-5 w-5 text-orange-600" />
							Enable Browser Notifications
						</DialogTitle>
						<DialogDescription>
							<p className="mb-4 text-sm text-gray-600">Notifications are blocked in your browser. Follow these steps to enable them:</p>

							<div className="space-y-4">
								<div className="bg-blue-50 p-3 rounded-lg">
									<h4 className="font-medium text-blue-900 mb-2">Quick Fix:</h4>
									<ol className="space-y-1 list-decimal list-inside text-sm text-blue-800">
										<li>Look for a 🔒 or ℹ️ icon in your address bar</li>
										<li>Click it and select "Site settings"</li>
										<li>Change "Notifications" from "Block" to "Allow"</li>
										<li>Refresh this page</li>
									</ol>
								</div>

								<div className="bg-gray-50 p-3 rounded-lg">
									<h4 className="font-medium text-gray-900 mb-2">Alternative Method:</h4>
									<ol className="space-y-1 list-decimal list-inside text-sm text-gray-700">
										<li>Open your browser settings</li>
										<li>Go to "Privacy and security" → "Site Settings"</li>
										<li>Click "Notifications"</li>
										<li>Find this site and change to "Allow"</li>
									</ol>
								</div>
							</div>

							<Button onClick={() => setShowInstructions(false)} className="w-full mt-4">
								I've Updated My Settings
							</Button>
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</header>
	);
}
