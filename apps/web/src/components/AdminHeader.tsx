"use client";

import { Home, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
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

export default function AdminHeader() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        localStorage.removeItem("guestMode");
        window.location.href = "/";
      } else {
        console.error("Logout failed:", await response.text());
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const avatarProps = user ? generateAvatarProps(user.username) : null;

  return (
    <header className="w-full border-border border-b bg-card">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <Link className="flex items-center gap-2 transition-opacity hover:opacity-80" href="/">
            <h1 className="font-semibold text-base text-primary md:text-lg">Rebuzzle Admin</h1>
          </Link>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Button disabled size="sm" variant="outline">
              <Avatar className="h-6 w-6">
                <AvatarFallback>...</AvatarFallback>
              </Avatar>
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex items-center gap-2" size="sm" variant="outline">
                  <Avatar className="h-6 w-6">
                    {avatarProps && (
                      <AvatarFallback className={getAvatarClassName(avatarProps)}>
                        {avatarProps.initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="hidden sm:inline">{user.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="font-medium text-sm leading-none">{user.username}</p>
                    {user.email && (
                      <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/")}>
                  <Home className="mr-2 h-4 w-4" />
                  <span>Back to App</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push("/profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
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
          ) : (
            <Button
              className="flex items-center gap-2"
              onClick={() => router.push("/login")}
              size="sm"
              variant="outline"
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-gray-100">G</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
