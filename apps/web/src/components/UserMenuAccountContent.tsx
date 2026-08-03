"use client";

import { Flame, HelpCircle, LogOut, Settings, Trophy, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { generateAvatarProps, getAvatarClassName } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { VisualThemeMenuItems } from "./VisualThemeMenuItems";

type UserMenuAccountContentProps = {
  username: string;
  email?: string;
  streak: number;
  onLogout: () => void;
};

export function UserMenuAccountContent({
  username,
  email,
  streak,
  onLogout,
}: UserMenuAccountContentProps) {
  const router = useRouter();
  const avatarProps = generateAvatarProps(username);
  const hasStreak = streak > 0;

  return (
    <DropdownMenuContent align="end" className="w-64">
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={cn(getAvatarClassName(avatarProps), "text-sm font-medium")}>
              {avatarProps.initials}
            </AvatarFallback>
          </Avatar>
          {hasStreak && (
            <div className="-bottom-0.5 -right-0.5 absolute flex h-4 w-4 items-center justify-center rounded-full bg-warning font-semibold text-[9px] text-background ring-2 ring-popover">
              {streak > 99 ? "99" : streak}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-sm">{username}</span>
          {email ? (
            <span className="truncate text-muted-foreground text-xs">{email}</span>
          ) : hasStreak ? (
            <span className="flex items-center gap-1 text-warning text-xs">
              <Flame className="h-3 w-3" />
              {streak} day streak
            </span>
          ) : null}
        </div>
      </div>

      <div className="mx-1 mb-1 grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-inset">
        {[
          { label: "Streak", value: streak },
          { label: "Wins", value: 0 },
          { label: "XP", value: 0 },
        ].map((stat) => (
          <div className="flex flex-col items-center py-2" key={stat.label}>
            <span className="font-mono font-medium text-foreground text-sm tabular-nums">
              {stat.value}
            </span>
            <span className="text-[10px] text-subtle uppercase tracking-[0.08em]">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <DropdownMenuSeparator />

      <DropdownMenuLabel>Account</DropdownMenuLabel>
      <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/profile")}>
        <User className="h-4 w-4" />
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/settings")}>
        <Settings className="h-4 w-4" />
        Settings
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuLabel>Game</DropdownMenuLabel>
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

      <DropdownMenuSeparator />

      <DropdownMenuItem
        className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4" />
        Log Out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
