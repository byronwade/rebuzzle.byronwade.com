"use client"

import { useEffect, useState } from "react"
import Layout from "@/components/Layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Settings as SettingsIcon,
  Bell,
  Volume2,
  Moon,
  Smartphone,
  Mail,
  Shield,
  Trash2,
  Save,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState({
    notifications: false,
    sound: true,
    darkMode: false,
    emailNotifications: false,
    pushNotifications: false,
    showHints: true,
  })

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem("appSettings")
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem("appSettings", JSON.stringify(settings))
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    })
  }

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      const defaultSettings = {
        notifications: false,
        sound: true,
        darkMode: false,
        emailNotifications: false,
        pushNotifications: false,
        showHints: true,
      }
      setSettings(defaultSettings)
      localStorage.setItem("appSettings", JSON.stringify(defaultSettings))
      toast({
        title: "Settings Reset",
        description: "All settings have been reset to default.",
      })
    }
  }

  const handleClearData = () => {
    if (
      confirm(
        "Are you sure you want to clear ALL your game data? This cannot be undone!"
      )
    ) {
      localStorage.removeItem("userStats")
      localStorage.removeItem("gameCompletion")
      localStorage.removeItem("appSettings")
      toast({
        title: "Data Cleared",
        description: "All your game data has been deleted.",
        variant: "destructive",
      })
      setTimeout(() => {
        window.location.href = "/"
      }, 1500)
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-gray-600">Manage your preferences and game settings</p>
        </div>

        <div className="space-y-6">
          {/* Notifications */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="text-base cursor-pointer">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new puzzles are available
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, pushNotifications: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-base cursor-pointer">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive daily puzzle reminders via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, emailNotifications: checked })
                  }
                />
              </div>
            </div>
          </Card>

          {/* Gameplay */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Gameplay
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound" className="text-base cursor-pointer">
                    Sound Effects
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Play sounds for correct/incorrect answers
                  </p>
                </div>
                <Switch
                  id="sound"
                  checked={settings.sound}
                  onCheckedChange={(checked) => setSettings({ ...settings, sound: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-hints" className="text-base cursor-pointer">
                    Show Hints
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display hint button during gameplay
                  </p>
                </div>
                <Switch
                  id="show-hints"
                  checked={settings.showHints}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, showHints: checked })
                  }
                />
              </div>
            </div>
          </Card>

          {/* Appearance */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Moon className="w-5 h-5" />
              Appearance
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode" className="text-base cursor-pointer">
                    Dark Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Switch to dark theme (coming soon)
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={settings.darkMode}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, darkMode: checked })
                  }
                  disabled
                />
              </div>
            </div>
          </Card>

          {/* Data & Privacy */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Data & Privacy
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Your Data</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your game statistics are stored locally on your device. We don't sell or share
                  your data.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearData}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Game Data
                </Button>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
            <Button onClick={handleReset} variant="outline" size="lg">
              Reset to Default
            </Button>
          </div>

          {/* Back Link */}
          <div className="text-center">
            <Link href="/" className="text-sm text-purple-600 hover:text-purple-700">
              ← Back to Game
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
