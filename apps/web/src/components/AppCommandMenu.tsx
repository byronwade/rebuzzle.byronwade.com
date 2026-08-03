"use client";

import {
  Award,
  Home,
  Play,
  Settings,
  Trophy,
  User,
  Newspaper,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const COMMAND_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/", label: "Play", icon: Play },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/blog", label: "Blog", icon: Newspaper },
  { href: "/achievements", label: "Achievements", icon: Award },
] as const;

/**
 * App-level command palette (Cmd/Ctrl+K).
 */
export function AppCommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <CommandInput placeholder="Jump to…" />
      <CommandList>
        <CommandEmpty>No matching pages.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {COMMAND_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={`${item.href}-${item.label}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
                value={item.label}
              >
                <Link
                  className="flex flex-1 items-center gap-2"
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </Link>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
