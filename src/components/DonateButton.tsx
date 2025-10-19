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
					<DialogDescription>Your donation helps us keep Rebuzzle free and continuously improve the game. Thank you for your support!</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col space-y-4">
					<Button onClick={() => window.open("https://www.buymeacoffee.com/VFYLE26", "_blank")} className="bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-black">
						<img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="Buy me a coffee" className="h-4 w-4 mr-2" />
						Buy me a coffee
					</Button>
					<p className="text-xs text-center text-gray-500">Secure payments powered by Buy Me a Coffee</p>
				</div>
			</DialogContent>
		</Dialog>
  );
}

