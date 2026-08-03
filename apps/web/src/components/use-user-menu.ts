"use client";

import { ChevronDown, Flame, HelpCircle, LogOut, Settings, Trophy, User, Zap } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { VisualThemeMenuItems } from "./VisualThemeMenuItems";

type UserMenuProps = {
  isAuthenticated: boolean;
};


export function useUserMenu(props: any = {}) {
  const { isAuthenticated } = props;
 isAuthenticated }: UserMenuProps) {
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


  return {
    handleLogout,
    response,
    router
  };
}
