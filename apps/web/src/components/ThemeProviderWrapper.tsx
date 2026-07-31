"use client";

import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider } from "@/components/ThemeProvider";

export function ThemeProviderWrapper({ children, ...props }: ThemeProviderProps) {
  return <ThemeProvider {...props}>{children}</ThemeProvider>;
}
