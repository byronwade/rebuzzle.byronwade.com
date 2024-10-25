"use client";
import { useState, useEffect } from "react";
import { Info, Settings, BarChart2, User } from "react-feather";
import Link from "next/link";
import CustomDialog from "@/components/ui/CustomDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import Statistics from "@/components/game/Statistics";
import { SettingsForm } from "@/components/SettingsForm";

import { logout, getUser } from "@/actions/auth";

const HowToPlayContent = () => {
	return (
		<div className="text-left p-2 pb-10">
			<h2 className="font-bold text-lg sm:text-xl">How to Play</h2>
			<p className="mt-2 text-sm sm:text-base">Rebuzzle is a daily rebus puzzle game where you solve puzzles using clues. You have a limited number of attempts to guess the correct answer. The next puzzle will be available after the countdown ends. Good luck and have fun!</p>
			<div className="mt-4">
				<h3 className="font-bold text-base sm:text-lg">Step-by-Step Guide</h3>
				<ol className="list-decimal list-inside text-sm sm:text-base">
					<li className="mt-2">Guess the Puzzle: You will see a picture puzzle called a &quot;rebus.&quot; Your job is to guess what words the picture stands for.</li>
					<li className="mt-2">Type Your Guess: There will be boxes where you can type your guess.</li>
					<li className="mt-2">
						Check Your Guess:
						<ul className="list-disc list-inside ml-4">
							<li>
								If the boxes turn <span className="text-green-500 font-bold">green</span>, it means you got the word right!
							</li>
							<li>
								If the boxes turn <span className="text-red-500 font-bold">red</span>, it means the word is wrong.
							</li>
						</ul>
					</li>
					<li className="mt-2">
						You Have 3 Tries:
						<ul className="list-disc list-inside ml-4">
							<li>
								You can try to guess the puzzle up to <span className="font-bold">3 times</span>.
							</li>
							<li>If you still don&apos;t get it right after 3 tries, the game will explain the puzzle to you.</li>
						</ul>
					</li>
					<li className="mt-2">
						One Puzzle a Day:
						<ul className="list-disc list-inside ml-4">
							<li>You only get one new puzzle every day.</li>
							<li>Take your time and think about the puzzle throughout the day.</li>
						</ul>
					</li>
					<li className="mt-2">Have Fun! Enjoy trying to figure out the rebus puzzle with your friends and family!</li>
				</ol>
			</div>
		</div>
	);
};

const SettingsContent = () => {
	return (
		<>
			<SettingsForm />
			{/* Add dark mode toggle here */}
		</>
	);
};

export default function Header() {
	const [howToPlayDialogOpen, setHowToPlayDialogOpen] = useState(false);
	const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
	const [statisticsDialogOpen, setStatisticsDialogOpen] = useState(false);
	const [user, setUser] = useState(null);
	console.log(user?.email.charAt(0).toUpperCase());

	useEffect(() => {
		const fetchUser = async () => {
			const result = await getUser();
			console.log(result);
			setUser(result);
		};
		fetchUser();
	}, []);

	useEffect(() => {
		const hasSeenHowToPlay = localStorage.getItem("hasSeenHowToPlay");
		if (!hasSeenHowToPlay) {
			setHowToPlayDialogOpen(true);
			localStorage.setItem("hasSeenHowToPlay", "true");
		}
	}, []);

	const handleHowToPlayDialogOpen = () => {
		setHowToPlayDialogOpen(true);
	};

	const handleSettingsDialogOpen = () => {
		setSettingsDialogOpen(true);
	};

	const handleStatisticsDialogOpen = () => {
		setStatisticsDialogOpen(true);
	};

	const handleLogout = async () => {
		await logout();
	};

	return (
		<>
			<div className="relative flex justify-between container mx-auto p-2 px-4">
				<div className="flex items-center space-x-4">
					<Link href="/" className="flex items-center space-x-4 font-bold text-2xl">
						Rebuzzle
					</Link>
					<p className="text-xs text-gray-500">Daily rebus puzzle games</p>
				</div>
				<div className="flex space-x-4 items-center font-bold">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<button onClick={handleHowToPlayDialogOpen} aria-label="How to Play">
									<Info className="w-6 h-6" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>How to Play</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					{/* Conditionally show Statistics icon */}
					{user && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<button onClick={handleStatisticsDialogOpen} aria-label="Statistics">
										<BarChart2 className="w-6 h-6" />
									</button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Statistics</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}

					{/* Always show Settings icon */}
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<button onClick={handleSettingsDialogOpen} aria-label="Settings">
									<Settings className="w-6 h-6" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Settings</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Avatar className="cursor-pointer w-7 h-7 bg-brand text-white">{user ? <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback> : <AvatarImage src="/avatar.png" alt="Avatar" />}</Avatar>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{user ? (
								<DropdownMenuItem>
									<button className="w-full text-left" onClick={handleLogout}>
										Logout
									</button>
								</DropdownMenuItem>
							) : (
								<>
									<DropdownMenuItem>
										<Link className="w-full text-left" href="/login">
											Login
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Link className="w-full text-left" href="/signup">
											Sign Up
										</Link>
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			<CustomDialog open={howToPlayDialogOpen} onOpenChange={setHowToPlayDialogOpen}>
				<HowToPlayContent />
			</CustomDialog>
			<CustomDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
				<SettingsContent />
			</CustomDialog>
			<CustomDialog open={statisticsDialogOpen} onOpenChange={setStatisticsDialogOpen}>
				{/* Render Statistics component here */}
				{statisticsDialogOpen && <Statistics userId={user ? user?.id : null} />}
			</CustomDialog>
		</>
	);
}
