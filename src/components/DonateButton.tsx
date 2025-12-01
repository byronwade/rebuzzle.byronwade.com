"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DonateButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2" size="sm" variant="outline">
          <Heart className="h-4 w-4 text-red-500" />
          <span className="hidden sm:inline">Donate</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Support Rebuzzle</DialogTitle>
          <DialogDescription>
            Your donation helps us keep Rebuzzle free and continuously improve
            the game. Thank you for your support!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <Button
            className="bg-[#FFDD00] text-black hover:bg-[#FFDD00]/90"
            onClick={() =>
              window.open("https://www.buymeacoffee.com/VFYLE26", "_blank")
            }
          >
            <img
              alt="Buy me a coffee"
              className="mr-2 h-4 w-4"
              src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
            />
            Buy me a coffee
          </Button>
          <p className="text-center text-gray-500 text-xs">
            Secure payments powered by Buy Me a Coffee
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
