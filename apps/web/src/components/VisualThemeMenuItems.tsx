"use client";

import { Check, Gamepad2, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useVisualTheme } from "@/components/VisualThemeProvider";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { cn } from "@/lib/utils";
import { VISUAL_THEME_META, VISUAL_THEMES, type VisualTheme } from "@/lib/visual-theme";

const THEME_ICONS: Record<VisualTheme, typeof Palette> = {
  default: Palette,
  "8bit": Gamepad2,
};

/**
 * Appearance section for the account dropdown — visual skin + light/dark.
 * Owns its own leading separator so parents don't double-stack rules.
 */
export function VisualThemeMenuItems() {
  const { visualTheme, setVisualTheme, mounted: visualMounted } = useVisualTheme();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const colorMounted = useIsClient();

  const handleColorToggle = () => {
    if (!colorMounted) return;
    const current = resolvedTheme || theme || "light";
    setTheme(current === "dark" ? "light" : "dark");
  };

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Appearance</DropdownMenuLabel>
      {VISUAL_THEMES.map((id) => {
        const meta = VISUAL_THEME_META[id];
        const Icon = THEME_ICONS[id];
        const selected = visualMounted && visualTheme === id;
        return (
          <DropdownMenuItem
            key={id}
            className={cn("cursor-pointer gap-2", selected && "bg-muted/70 text-foreground")}
            disabled={!visualMounted}
            onClick={() => setVisualTheme(id)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{meta.label}</span>
            <Check
              className={cn("h-3.5 w-3.5", selected ? "opacity-100" : "opacity-0")}
              aria-hidden={!selected}
            />
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuItem
        className="cursor-pointer gap-2"
        disabled={!colorMounted}
        onClick={handleColorToggle}
      >
        {colorMounted && resolvedTheme === "dark" ? (
          <>
            <Sun className="h-4 w-4" />
            Light mode
          </>
        ) : (
          <>
            <Moon className="h-4 w-4" />
            Dark mode
          </>
        )}
      </DropdownMenuItem>
    </>
  );
}
