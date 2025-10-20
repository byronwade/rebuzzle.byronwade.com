'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from './AuthProvider'
import { User, LogOut, Settings, Trophy } from "lucide-react"
import { useRouter } from 'next/navigation'

type UserMenuProps = {
  isAuthenticated: boolean
}

export function UserMenu({ isAuthenticated }: UserMenuProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        // Redirect to home after logout
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" className="flex items-center gap-2" disabled>
        <Avatar className="h-6 w-6">
          <AvatarFallback>...</AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <Button variant="outline" size="sm" className="flex items-center gap-2" disabled>
        <Avatar className="h-6 w-6">
          <AvatarFallback>G</AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline">Guest</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/leaderboard')}>
          <Trophy className="mr-2 h-4 w-4" />
          <span>Leaderboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 focus:bg-red-100 focus:text-red-700"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="font-semibold">Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
