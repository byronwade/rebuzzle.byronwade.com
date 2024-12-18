'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Info } from 'lucide-react'

export function InfoButton() {
  const [showInfoDialog, setShowInfoDialog] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowInfoDialog(true)}
        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        <Info className="h-5 w-5" />
      </Button>

      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How to Play Rebuzzle</DialogTitle>
            <DialogDescription>
              Rebuzzle is a daily word puzzle game where you guess the hidden word based on a visual clue.
              <br /><br />
              1. Look at the image or word displayed.
              <br />
              2. Try to guess the hidden word related to the clue.
              <br />
              3. Type your guess using the on-screen keyboard or your device's keyboard.
              <br />
              4. Press Enter to submit your guess.
              <br />
              5. You have one attempt to guess correctly.
              <br />
              6. A new puzzle is available every day at midnight.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowInfoDialog(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

