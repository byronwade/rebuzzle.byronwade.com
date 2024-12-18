'use client'

import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function DonateButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-500" />
          <span className="hidden sm:inline">Donate</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Support Rebuzzle</DialogTitle>
          <DialogDescription>
            Your donation helps us keep Rebuzzle free and continuously improve the game. Thank you for your support!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <Button onClick={() => window.open('https://example.com/donate/5', '_blank')}>
            Donate $5
          </Button>
          <Button onClick={() => window.open('https://example.com/donate/10', '_blank')}>
            Donate $10
          </Button>
          <Button onClick={() => window.open('https://example.com/donate/20', '_blank')}>
            Donate $20
          </Button>
          <Button variant="outline" onClick={() => window.open('https://example.com/donate', '_blank')}>
            Custom Amount
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

