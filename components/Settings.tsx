'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { SettingsIcon, Bell, Gamepad2, Trophy } from "lucide-react";
import { gameSettings } from '@/lib/gameSettings'
import { Switch } from "@/components/ui/switch";

// Create a mutable settings state
const settings = {
  puzzlesPerDay: gameSettings.puzzlesPerDay as number,
  resetTime: gameSettings.resetTime as string,
}

export function Settings() {
  const [puzzlesPerDay, setPuzzlesPerDay] = useState<number>(settings.puzzlesPerDay)
  const [resetTime, setResetTime] = useState<string>(settings.resetTime)
  const [isOpen, setIsOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [soundEffects, setSoundEffects] = useState(false);

  const handleSave = () => {
    // Update the mutable settings object
    settings.puzzlesPerDay = puzzlesPerDay
    settings.resetTime = resetTime
    console.log('Settings saved:', settings)
  }

  const handleToggleNotifications = async (checked: boolean) => {
		setIsLoading(true);
		try {
			// Logic to toggle notifications
			setNotificationsEnabled(checked);
		} catch (error) {
			console.error("Error toggling notifications:", error);
		} finally {
			setIsLoading(false);
		}
  };

  return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" className="hover:bg-gray-100">
					<SettingsIcon className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md mx-4 rounded-2xl border-0 shadow-2xl">
				<DialogHeader className="text-center pb-4">
					<DialogTitle className="text-2xl font-bold text-purple-600">Game Settings</DialogTitle>
					<DialogDescription className="text-gray-600 mt-2">Customize your Rebuzzle experience</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Notification Settings */}
					<div className="space-y-4">
						<h3 className="font-semibold text-gray-800 flex items-center gap-2">
							<Bell className="h-4 w-4" />
							Notifications
						</h3>

						<div className="space-y-3">
							<div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
								<div>
									<p className="font-medium text-gray-800">Daily Puzzle Reminders</p>
									<p className="text-sm text-gray-600">Get notified when new puzzles are available</p>
								</div>
								<Switch checked={notificationsEnabled} onCheckedChange={handleToggleNotifications} disabled={isLoading} />
							</div>

							{notificationsEnabled && (
								<div className="ml-4 p-3 bg-green-50 rounded-lg border border-green-200">
									<p className="text-sm text-green-700 flex items-center gap-2">
										<span className="w-2 h-2 bg-green-500 rounded-full"></span>
										Notifications are enabled
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Game Preferences */}
					<div className="space-y-4">
						<h3 className="font-semibold text-gray-800 flex items-center gap-2">
							<Gamepad2 className="h-4 w-4" />
							Game Preferences
						</h3>

						<div className="space-y-3">
							<div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
								<div>
									<p className="font-medium text-gray-800">Show Hints</p>
									<p className="text-sm text-gray-600">Display helpful hints for each puzzle</p>
								</div>
								<Switch checked={showHints} onCheckedChange={setShowHints} />
							</div>

							<div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
								<div>
									<p className="font-medium text-gray-800">Sound Effects</p>
									<p className="text-sm text-gray-600">Play sounds for interactions</p>
								</div>
								<Switch checked={soundEffects} onCheckedChange={setSoundEffects} />
							</div>
						</div>
					</div>

					{/* Stats */}
					<div className="p-4 bg-gray-50 rounded-xl">
						<h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
							<Trophy className="h-4 w-4" />
							Your Stats
						</h3>
						<div className="grid grid-cols-2 gap-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-purple-600">12</div>
								<div className="text-sm text-gray-600">Puzzles Solved</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">85%</div>
								<div className="text-sm text-gray-600">Success Rate</div>
							</div>
						</div>
					</div>
				</div>

				<div className="pt-4 border-t border-gray-100">
					<Button onClick={() => setIsOpen(false)} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-12 font-semibold">
						Save Settings
					</Button>
				</div>
			</DialogContent>
		</Dialog>
  );
}

