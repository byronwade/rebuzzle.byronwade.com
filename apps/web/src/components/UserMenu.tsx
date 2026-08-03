"use client";

import { ChevronDown, HelpCircle, Settings, Trophy, User, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateAvatarProps, getAvatarClassName } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { UserMenuAccountContent } from "./UserMenuAccountContent";
import { VisualThemeMenuItems } from "./VisualThemeMenuItems";

type UserMenuProps = {
  isAuthenticated: boolean;
};

export function UserMenu({ isAuthenticated }: UserMenuProps) {
  const { user, isLoading, isGuest } = useAuth();
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

  if (isLoading) {
    return (
      <Button
        aria-label="Loading account menu"
        className="h-8 w-8 rounded-full p-0"
        disabled
        size="icon"
        variant="ghost"
      >
        <Avatar className="h-7 w-7">
          <AvatarFallback className="animate-pulse bg-inset text-xs" />
        </Avatar>
      </Button>
    );
  }

  if (isGuest && user) {
    const avatarProps = generateAvatarProps(user.username);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Guest account menu"
            className="group h-8 gap-1.5 rounded-full border border-warning/40 border-dashed bg-transparent pr-2 pl-1 hover:border-warning hover:bg-warning/10"
            size="sm"
            variant="ghost"
          >
            <Avatar className="h-6 w-6 ring-0">
              <AvatarFallback
                className={cn(getAvatarClassName(avatarProps), "text-xs font-medium")}
              >
                {avatarProps.initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown
              className="h-3.5 w-3.5 text-subtle transition-transform group-data-[state=open]:rotate-180"
              data-icon="inline-end"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center gap-3 px-2 py-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback
                className={cn(getAvatarClassName(avatarProps), "text-sm font-medium")}
              >
                {avatarProps.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{user.username}</span>
              <span className="flex items-center gap-1 text-warning text-xs">
                <Zap className="h-3 w-3" />
                Guest account
              </span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <div className="space-y-1.5 px-1.5 pb-1.5">
            <Button
              className="h-9 w-full justify-start gap-2"
              onClick={() => router.push("/signup")}
              size="sm"
              variant="secondary"
            >
              <User className="h-4 w-4" data-icon="inline-start" />
              Save my progress
            </Button>
            <button
              className="flex h-8 w-full items-center justify-center rounded-md px-2 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => router.push("/login")}
              type="button"
            >
              Already have an account? Sign in
            </button>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => router.push("/settings")}
          >
            <Settings className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => router.push("/leaderboard")}
          >
            <Trophy className="h-4 w-4" />
            Leaderboard
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => router.push("/how-it-works")}
          >
            <HelpCircle className="h-4 w-4" />
            How It Works
          </DropdownMenuItem>
          <VisualThemeMenuItems />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (!(isAuthenticated && user)) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Account menu"
            className="group h-8 gap-1.5 rounded-full border border-border bg-card pr-2 pl-1 hover:bg-muted"
            size="sm"
            variant="ghost"
          >
            <Avatar className="h-6 w-6 ring-0">
              <AvatarFallback className="bg-inset font-medium text-muted-foreground text-xs">
                ?
              </AvatarFallback>
            </Avatar>
            <ChevronDown
              className="h-3.5 w-3.5 text-subtle transition-transform group-data-[state=open]:rotate-180"
              data-icon="inline-end"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-3">
            <p className="font-medium text-sm">Welcome</p>
            <p className="text-muted-foreground text-xs">Sign in to track your progress</p>
          </div>
          <DropdownMenuSeparator />
          <div className="space-y-1.5 px-1.5 pb-1.5">
            <Button
              className="h-9 w-full justify-start gap-2"
              onClick={() => router.push("/login")}
              size="sm"
              variant="secondary"
            >
              <User className="h-4 w-4" data-icon="inline-start" />
              Sign in
            </Button>
            <button
              className="flex h-8 w-full items-center justify-center rounded-md px-2 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => router.push("/signup")}
              type="button"
            >
              Create a free account
            </button>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => router.push("/settings")}
          >
            <Settings className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => router.push("/leaderboard")}
          >
            <Trophy className="h-4 w-4" />
            Leaderboard
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => router.push("/how-it-works")}
          >
            <HelpCircle className="h-4 w-4" />
            How It Works
          </DropdownMenuItem>
          <VisualThemeMenuItems />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const avatarProps = generateAvatarProps(user.username);
  const streak = (user as { streak?: number }).streak ?? 0;
  const hasStreak = streak > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Account menu"
          className={cn(
            "group h-8 gap-1.5 rounded-full border bg-card pr-2 pl-1 hover:bg-muted",
            hasStreak ? "border-warning/40 hover:border-warning" : "border-border"
          )}
          size="sm"
          variant="ghost"
        >
          <div className="relative">
            <Avatar className="h-6 w-6 ring-0">
              <AvatarFallback
                className={cn(getAvatarClassName(avatarProps), "font-medium text-[10px]")}
              >
                {avatarProps.initials}
              </AvatarFallback>
            </Avatar>
            {hasStreak && (
              <div className="-bottom-0.5 -right-0.5 absolute flex h-3.5 w-3.5 items-center justify-center rounded-full bg-warning font-semibold text-[8px] text-background ring-2 ring-background">
                {streak > 9 ? "9+" : streak}
              </div>
            )}
          </div>
          <ChevronDown
            className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            data-icon="inline-end"
          />
        </Button>
      </DropdownMenuTrigger>
      <UserMenuAccountContent
        email={user.email}
        onLogout={() => {
          void handleLogout();
        }}
        streak={streak}
        username={user.username}
      />
    </DropdownMenu>
  );
}
