"use client";

import { useState, useEffect } from "react";
import { InfoButton } from "./InfoButton";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { Timer } from "./Timer";
import { useAuth } from "./AuthProvider";

interface HeaderProps {
	nextPlayTime: Date | null;
}

export default function Header({ nextPlayTime }: HeaderProps) {
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [email, setEmail] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [notificationType, setNotificationType] = useState<"email" | "phone">("email");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const { toast } = useToast();
	const { isAuthenticated, isLoading } = useAuth();

	useEffect(() => {
		if ("Notification" in window) {
			Notification.requestPermission().then((permission) => {
				if (permission === "granted") {
					setIsSubscribed(true);
				}
			});
		}
	}, []);

	const handleSubscription = async () => {
		if (isSubscribed) {
			setIsSubscribed(false);
			setEmail("");
			setPhoneNumber("");
			setNotificationType("email");
			toast({
				title: "Unsubscribed",
				description: "You've been unsubscribed from daily reminders.",
			});
		} else {
			if ("Notification" in window) {
				const permission = await Notification.requestPermission();
				if (permission === "granted") {
					setIsSubscribed(true);
					toast({
						title: "Subscribed",
						description: "You've been subscribed to browser notifications for daily reminders!",
					});
				} else {
					setIsDialogOpen(true);
				}
			} else {
				setIsDialogOpen(true);
			}
		}
	};

	const handleSubmit = async () => {
		setIsSubscribed(true);
		toast({
			title: "Subscribed",
			description: `You've been subscribed to daily reminders via ${notificationType}!`,
		});
		setIsDialogOpen(false);
	};

	const validateInput = () => {
		if (notificationType === "email") {
			return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
		} else if (notificationType === "phone") {
			return /^\+?[1-9]\d{1,14}$/.test(phoneNumber);
		}
		return false;
	};

	return (
		<header className="w-full max-w-2xl flex flex-col items-start pt-4">
			<div className="w-full flex justify-between items-center mb-2">
				<div className="flex items-center">
					<h1 className="text-xl sm:text-2xl font-bold mr-4">Rebuzzle</h1>
					<nav className="flex space-x-4">
						<Link href="/" className="text-sm font-medium hover:text-purple-400">
							Game
						</Link>
						<Link href="/blog" className="text-sm font-medium hover:text-purple-400">
							Blog
						</Link>
					</nav>
				</div>
				<div className="flex items-center space-x-2">
					<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
						<DialogTrigger asChild>
							<Button variant="outline" size="sm" onClick={handleSubscription} className="flex items-center gap-2">
								{isSubscribed ? (
									<>
										<BellOff className="h-4 w-4" />
										<span className="hidden sm:inline">Unsubscribe</span>
									</>
								) : (
									<>
										<Bell className="h-4 w-4" />
										<span className="hidden sm:inline">Subscribe</span>
									</>
								)}
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-[425px]">
							<DialogHeader>
								<DialogTitle>Subscribe to Daily Reminders</DialogTitle>
								<DialogDescription>Choose how you'd like to receive daily reminders.</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<RadioGroup value={notificationType} onValueChange={(value) => setNotificationType(value as "email" | "phone")} className="grid grid-cols-2 gap-4">
									<div>
										<RadioGroupItem value="email" id="email" className="peer sr-only" />
										<Label htmlFor="email" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
											Email
										</Label>
									</div>
									<div>
										<RadioGroupItem value="phone" id="phone" className="peer sr-only" />
										<Label htmlFor="phone" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
											Phone (SMS)
										</Label>
									</div>
								</RadioGroup>
								{notificationType === "email" && (
									<div className="grid gap-4">
										<Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
									</div>
								)}
								{notificationType === "phone" && (
									<div className="grid gap-4">
										<Input type="tel" placeholder="Enter your phone number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full" />
									</div>
								)}
							</div>
							<DialogFooter>
								<Button onClick={handleSubmit} disabled={!validateInput()}>
									Subscribe
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<Button variant="outline" size="sm" asChild>
						<Link href="https://www.buymeacoffee.com/VFYLE26" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
							<img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="Buy me a coffee" className="h-4 w-4" />
							<span className="hidden sm:inline">Donate</span>
						</Link>
					</Button>
					<InfoButton />
					<UserMenu isAuthenticated={isAuthenticated} />
				</div>
			</div>
			<Timer nextPlayTime={nextPlayTime} className="text-xs text-gray-600 w-full" />
		</header>
	);
}
