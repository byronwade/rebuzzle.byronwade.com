"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProviderWrapper({
  children,
  ...props
}: ThemeProviderProps) {
  return <ThemeProvider {...props}>{children}</ThemeProvider>;
}

