import { Fraunces } from "next/font/google";
import type { ReactNode } from "react";

const studioDisplay = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-studio-display",
});

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <div className={studioDisplay.variable}>{children}</div>;
}
