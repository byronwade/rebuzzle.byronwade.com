'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SettingsIcon } from 'lucide-react'
import { gameSettings } from '@/lib/gameSettings'

// Create a mutable settings state
const settings = {
  puzzlesPerDay: gameSettings.puzzlesPerDay as number,
  resetTime: gameSettings.resetTime as string,
}

export function Settings() {
  const [puzzlesPerDay, setPuzzlesPerDay] = useState<number>(settings.puzzlesPerDay)
  const [resetTime, setResetTime] = useState<string>(settings.resetTime)

  const handleSave = () => {
    // Update the mutable settings object
    settings.puzzlesPerDay = puzzlesPerDay
    settings.resetTime = resetTime
    console.log('Settings saved:', settings)
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

