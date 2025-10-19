import React from "react"
import Header from "./Header"

interface LayoutProps {
  children: React.ReactNode
  nextPlayTime?: Date | null
  puzzlesPlayedToday?: number
}

export default function Layout({ children, nextPlayTime = null }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(147,51,234,0.1),rgba(255,255,255,0))]" />
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(147, 51, 234, 0.15) 1px, transparent 0)`,
            backgroundSize: "20px 20px",
            animationDuration: "4s",
          }}
        />
      </div>

      {/* Header */}
      <Header nextPlayTime={nextPlayTime} />

      {/* Main content with smooth transitions */}
      <main className="relative z-10 pb-2 sm:pb-4 animate-in fade-in-up duration-700">
        {children}
      </main>

      {/* Enhanced footer */}
      <footer className="relative z-10 text-center py-4 sm:py-6 text-sm text-gray-600 bg-white/50 backdrop-blur-md border-t border-purple-100/50">
        <div className="space-y-2 animate-in fade-in-up duration-1000" style={{ animationDelay: "1s" }}>
          <p className="font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Made with ♥ by Byron
          </p>
          <p className="text-xs text-gray-500">
            Powered by Google AI · Next.js 16 · Drizzle ORM
          </p>
        </div>
      </footer>
    </div>
  )
}
