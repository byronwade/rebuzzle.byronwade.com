"use client";

import { Bell, Gamepad2, SettingsIcon, Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { gameSettings } from "@/lib/gameSettings";

// Create a mutable settings state
const settings = {
  puzzlesPerDay: gameSettings.puzzlesPerDay as number,
  resetTime: gameSettings.resetTime as string,
};

export function Settings() {
  const [puzzlesPerDay, setPuzzlesPerDay] = useState<number>(
    settings.puzzlesPerDay
  );
  const [resetTime, setResetTime] = useState<string>(settings.resetTime);
  const [isOpen, setIsOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [soundEffects, setSoundEffects] = useState(false);

  const handleSave = () => {
    // Update the mutable settings object
    settings.puzzlesPerDay = puzzlesPerDay;
    settings.resetTime = resetTime;
    console.log("Settings saved:", settings);
  };

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
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button className="hover:bg-gray-100" size="icon" variant="ghost">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="mx-4 max-w-md rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="pb-4 text-center">
          <DialogTitle className="font-bold text-2xl text-purple-600">
            Game Settings
          </DialogTitle>
          <DialogDescription className="mt-2 text-gray-600">
            Customize your Rebuzzle experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800">
              <Bell className="h-4 w-4" />
              Notifications
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3">
                <div>
                  <p className="font-medium text-gray-800">
                    Daily Puzzle Reminders
                  </p>
                  <p className="text-gray-600 text-sm">
                    Get notified when new puzzles are available
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  disabled={isLoading}
                  onCheckedChange={handleToggleNotifications}
                />
              </div>

              {notificationsEnabled && (
                <div className="ml-4 rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="flex items-center gap-2 text-green-700 text-sm">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Notifications are enabled
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Game Preferences */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800">
              <Gamepad2 className="h-4 w-4" />
              Game Preferences
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-purple-50 p-3">
                <div>
                  <p className="font-medium text-gray-800">Show Hints</p>
                  <p className="text-gray-600 text-sm">
                    Display helpful hints for each puzzle
                  </p>
                </div>
                <Switch checked={showHints} onCheckedChange={setShowHints} />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3">
                <div>
                  <p className="font-medium text-gray-800">Sound Effects</p>
                  <p className="text-gray-600 text-sm">
                    Play sounds for interactions
                  </p>
                </div>
                <Switch
                  checked={soundEffects}
                  onCheckedChange={setSoundEffects}
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-xl bg-gray-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
              <Trophy className="h-4 w-4" />
              Your Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="font-bold text-2xl text-purple-600">12</div>
                <div className="text-gray-600 text-sm">Puzzles Solved</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-2xl text-green-600">85%</div>
                <div className="text-gray-600 text-sm">Success Rate</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-gray-100 border-t pt-4">
          <Button
            className="h-12 w-full rounded-xl bg-purple-600 font-semibold text-white hover:bg-purple-700"
            onClick={() => setIsOpen(false)}
          >
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
