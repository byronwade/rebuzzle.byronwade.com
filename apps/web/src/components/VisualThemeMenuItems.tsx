"use client";

import { Check, Gamepad2, Palette } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useVisualTheme } from "@/components/VisualThemeProvider";
import { cn } from "@/lib/utils";
import { VISUAL_THEME_META, VISUAL_THEMES, type VisualTheme } from "@/lib/visual-theme";

const THEME_ICONS: Record<VisualTheme, typeof Palette> = {
  default: Palette,
  "8bit": Gamepad2,
};

/**
 * Theme picker for the account dropdown — works for guest, signed-out, and signed-in.
 */
export function VisualThemeMenuItems() {
  const { visualTheme, setVisualTheme, mounted } = useVisualTheme();

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      {VISUAL_THEMES.map((id) => {
        const meta = VISUAL_THEME_META[id];
        const Icon = THEME_ICONS[id];
        const selected = mounted && visualTheme === id;
        return (
          <DropdownMenuItem
            key={id}
            className="cursor-pointer gap-2"
            disabled={!mounted}
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
    </>
  );
}
