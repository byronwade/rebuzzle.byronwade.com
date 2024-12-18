'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link'
import { LogIn, LogOut, Settings, User } from 'lucide-react'
import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect } from 'react';
import { trackEvent, analyticsEvents } from '@/lib/analytics'

export function UserMenu() {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    if (isSignedIn) {
      trackEvent(analyticsEvents.USER_LOGIN, { userId: user.id })
    }
  }, [isSignedIn, user])

  if (!isSignedIn) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/sign-in">
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImageUrl} alt={user.username || ''} />
            <AvatarFallback>{user.username?.[0] || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-gray-900 text-gray-100" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.primaryEmailAddress?.emailAddress || ''}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="focus:bg-gray-800 focus:text-white">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="focus:bg-gray-800 focus:text-white">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="focus:bg-gray-800 focus:text-white"
          onSelect={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

