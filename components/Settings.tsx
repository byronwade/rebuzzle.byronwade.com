'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SettingsIcon } from 'lucide-react'
import { gameSettings } from '@/lib/gameSettings'

export function Settings() {
  const [puzzlesPerDay, setPuzzlesPerDay] = useState(gameSettings.puzzlesPerDay)
  const [resetTime, setResetTime] = useState(gameSettings.resetTime)

  const handleSave = () => {
    // In a real app, you'd save these to a backend or local storage
    console.log('Saving settings:', { puzzlesPerDay, resetTime })
    // Update gameSettings
    gameSettings.puzzlesPerDay = puzzlesPerDay
    gameSettings.resetTime = resetTime
    // Close the dialog (you'd need to implement this)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Game Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="puzzlesPerDay" className="text-right">
              Puzzles per day
            </Label>
            <Input
              id="puzzlesPerDay"
              type="number"
              value={puzzlesPerDay}
              onChange={(e) => setPuzzlesPerDay(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="resetTime" className="text-right">
              Reset time
            </Label>
            <Input
              id="resetTime"
              type="time"
              value={resetTime}
              onChange={(e) => setResetTime(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <Button onClick={handleSave}>Save changes</Button>
      </DialogContent>
    </Dialog>
  )
}

