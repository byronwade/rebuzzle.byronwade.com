import { useState } from "react";
import { InfoCircledIcon, GearIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useContext } from "react";
import GameContext from "@/context/GameContext";
import CustomDialog from "@/components/CustomDialog";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Component for "How to Play" dialog content
const HowToPlayContent = () => {
	return (
		<div className="text-left">
			<h2 className="text-xl font-bold text-lg sm:text-xl">How to Play</h2>
			<p className="mt-2 text-sm sm:text-base">Rebuzzle is a daily rebus puzzle game where you solve puzzles using clues. You have a limited number of attempts to guess the correct answer. The next puzzle will be available after the countdown ends. Good luck and have fun!</p>
			{/* <Image src="/vercel.svg" alt="Example" className="mt-4" width={40} height={40} /> */}
			<div className="mt-4">
				<h3 className="text-lg font-bold text-base sm:text-lg">Step-by-Step Guide</h3>
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

// Component for "Settings" dialog content
const SettingsContent = () => {
	return (
		<div>
			<h2 className="text-xl font-bold">Settings</h2>
			<p className="mt-2">Here you can configure your game settings and preferences.</p>
			{/* Add settings options here */}
		</div>
	);
};

export default function Header() {
	const { attemptsLeft, countdown } = useContext(GameContext);
	const [howToPlayDialogOpen, setHowToPlayDialogOpen] = useState(false);
	const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

	const handleHowToPlayDialogOpen = () => {
		setHowToPlayDialogOpen(true);
	};

	const handleSettingsDialogOpen = () => {
		setSettingsDialogOpen(true);
	};

	return (
		<>
			<div className="relative flex justify-between container mx-auto p-4">
				<div>
					<Link href="/" className="flex items-center space-x-4 font-bold text-2xl">
						Rebuzzle
					</Link>
					<p className="text-xs text-gray-500">Daily rebus puzzle games</p>
				</div>
				<div className="flex space-x-8 items-center font-bold justify-center align-middle">
					<Badge variant="outline">{attemptsLeft} attempts left</Badge>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger>
								<button onClick={handleHowToPlayDialogOpen} aria-label="How to Play">
									<InfoCircledIcon className="w-7 h-7" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>How to Play</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger>
								<button onClick={handleSettingsDialogOpen} aria-label="Settings">
									<GearIcon className="w-7 h-7" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Settings</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
			<CustomDialog open={howToPlayDialogOpen} onOpenChange={setHowToPlayDialogOpen}>
				<HowToPlayContent />
			</CustomDialog>
			<CustomDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
				<SettingsContent />
			</CustomDialog>
		</>
	);
}
