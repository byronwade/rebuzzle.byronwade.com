"use client";

import dynamic from "next/dynamic";
import type { ThemeProviderProps } from "next-themes";

// Dynamically import ThemeProvider to avoid HMR issues with React Compiler
const ThemeProvider = dynamic(
  () =>
    import("@/components/ThemeProvider").then((mod) => ({
      default: mod.ThemeProvider,
    })),
  {
    ssr: false,
  }
);

export function ThemeProviderWrapper({
  children,
  ...props
}: ThemeProviderProps) {
  return <ThemeProvider {...props}>{children}</ThemeProvider>;
}

