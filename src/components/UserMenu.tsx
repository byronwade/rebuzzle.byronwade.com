"use client";

import { LogOut, Settings, Trophy, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateAvatarProps, getAvatarClassName } from "@/lib/avatar";
import { useAuth } from "./AuthProvider";

type UserMenuProps = {
  isAuthenticated: boolean;
};

export function UserMenu({ isAuthenticated }: UserMenuProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies in request
      });

      if (response.ok) {
        // Clear guest mode if set (cookies are cleared by server)
        localStorage.removeItem("guestMode");

        // Redirect to home and force reload to clear React state
        window.location.href = "/";
      } else {
        console.error("Logout failed:", await response.text());
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return (
      <Button
        className="flex items-center gap-2"
        disabled
        size="sm"
        variant="outline"
      >
        <Avatar className="h-6 w-6">
          <AvatarFallback>...</AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  if (!(isAuthenticated && user)) {
    return (
      <Button
        className="flex items-center gap-2 transition-colors hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
        onClick={() => router.push("/login")}
        size="sm"
        variant="outline"
      >
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-gray-100">G</AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline">Sign In</span>
      </Button>
    );
  }

  // Generate avatar props for consistent styling
  const avatarProps = generateAvatarProps(user.username);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="flex items-center gap-2" size="sm" variant="outline">
          <Avatar className="h-6 w-6">
            <AvatarFallback className={getAvatarClassName(avatarProps)}>
              {avatarProps.initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="font-medium text-sm leading-none">{user.username}</p>
            {user.email && (
              <p className="text-muted-foreground text-xs leading-none">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push("/profile")}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push("/leaderboard")}
        >
          <Trophy className="mr-2 h-4 w-4" />
          <span>Leaderboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push("/settings")}
        >
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
  );
}
