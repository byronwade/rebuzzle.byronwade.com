"use client";

import {
  ChevronDown,
  Flame,
  HelpCircle,
  LogOut,
  Moon,
  Settings,
  Sun,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";

type UserMenuProps = {
  isAuthenticated: boolean;
};

export function UserMenu({ isAuthenticated }: UserMenuProps) {
  const { user, isLoading, isGuest } = useAuth();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleThemeToggle = () => {
    if (!mounted) return;
    const currentTheme = resolvedTheme || theme || "light";
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  // Loading state
  if (isLoading) {
    return (
      <Button className="h-9 w-9 rounded-full p-0" disabled size="icon" variant="ghost">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="animate-pulse bg-muted text-xs" />
        </Avatar>
      </Button>
    );
  }

  // Guest user with tracked stats
  if (isGuest && user) {
    const avatarProps = generateAvatarProps(user.username);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="group h-9 gap-2 rounded-full border border-dashed border-amber-500/40 bg-transparent pl-1 pr-2 hover:border-amber-500 hover:bg-amber-500/10"
            size="sm"
            variant="ghost"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback
                className={cn(getAvatarClassName(avatarProps), "text-xs font-medium")}
              >
                {avatarProps.initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center gap-3 px-2 py-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback
                className={cn(getAvatarClassName(avatarProps), "text-sm font-medium")}
              >
                {avatarProps.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.username}</span>
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Zap className="h-3 w-3" />
                Guest account
              </span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground"
            onClick={() => router.push("/signup")}
          >
            <User className="h-4 w-4" />
            Save My Progress
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-muted-foreground"
            onClick={() => router.push("/login")}
          >
            Already have an account?
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => router.push("/leaderboard")}
          >
            <Trophy className="h-4 w-4 text-amber-500" />
            Leaderboard
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => router.push("/how-it-works")}
          >
            <HelpCircle className="h-4 w-4" />
            How It Works
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={handleThemeToggle}
            disabled={!mounted}
          >
            {mounted && resolvedTheme === "dark" ? (
              <>
                <Sun className="h-4 w-4" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                Dark Mode
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Not authenticated
  if (!(isAuthenticated && user)) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="group h-9 gap-2 rounded-full border border-border bg-transparent pl-1 pr-2 hover:bg-accent"
            size="sm"
            variant="ghost"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                ?
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-3 text-center">
            <p className="text-sm font-medium">Welcome!</p>
            <p className="text-xs text-muted-foreground">Sign in to track your progress</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground"
            onClick={() => router.push("/login")}
          >
            <User className="h-4 w-4" />
            Sign In
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-muted-foreground"
            onClick={() => router.push("/signup")}
          >
            Create an account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => router.push("/how-it-works")}
          >
            <HelpCircle className="h-4 w-4" />
            How It Works
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={handleThemeToggle}
            disabled={!mounted}
          >
            {mounted && resolvedTheme === "dark" ? (
              <>
                <Sun className="h-4 w-4" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                Dark Mode
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Authenticated user
  const avatarProps = generateAvatarProps(user.username);
  const streak = (user as { streak?: number }).streak ?? 0;
  const hasStreak = streak > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            "group h-9 gap-2 rounded-full border bg-transparent pl-1 pr-2 hover:bg-accent",
            hasStreak ? "border-orange-500/40 hover:border-orange-500" : "border-border"
          )}
          size="sm"
          variant="ghost"
        >
          <div className="relative">
            <Avatar className="h-7 w-7">
              <AvatarFallback
                className={cn(getAvatarClassName(avatarProps), "text-xs font-medium")}
              >
                {avatarProps.initials}
              </AvatarFallback>
            </Avatar>
            {hasStreak && (
              <div className="-bottom-0.5 -right-0.5 absolute flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white ring-2 ring-background">
                {streak > 9 ? "9+" : streak}
              </div>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* User info header */}
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback
                className={cn(getAvatarClassName(avatarProps), "text-sm font-medium")}
              >
                {avatarProps.initials}
              </AvatarFallback>
            </Avatar>
            {hasStreak && (
              <div className="-bottom-0.5 -right-0.5 absolute flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white ring-2 ring-popover">
                {streak > 99 ? "99" : streak}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{user.username}</span>
            {user.email ? (
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            ) : hasStreak ? (
              <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                <Flame className="h-3 w-3" />
                {streak} day streak
              </span>
            ) : null}
          </div>
        </div>

        {/* Quick stats */}
        <div className="mx-2 mb-2 flex items-center justify-around rounded-md bg-muted/50 py-2">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "text-sm font-semibold",
                hasStreak ? "text-orange-500" : "text-muted-foreground"
              )}
            >
              {streak}
            </span>
            <span className="text-[10px] text-muted-foreground">Streak</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-amber-500">0</span>
            <span className="text-[10px] text-muted-foreground">Wins</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-purple-500">0</span>
            <span className="text-[10px] text-muted-foreground">XP</span>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Account
        </DropdownMenuLabel>
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/profile")}>
          <User className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/settings")}>
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Game
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => router.push("/leaderboard")}
        >
          <Trophy className="h-4 w-4 text-amber-500" />
          Leaderboard
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => router.push("/how-it-works")}
        >
          <HelpCircle className="h-4 w-4" />
          How It Works
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={handleThemeToggle}
          disabled={!mounted}
        >
          {mounted && resolvedTheme === "dark" ? (
            <>
              <Sun className="h-4 w-4" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              Dark Mode
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer gap-2 text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-red-950/50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
