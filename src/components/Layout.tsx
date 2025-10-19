import React from 'react'
import Header from './Header'

interface LayoutProps {
  children: React.ReactNode
  nextPlayTime?: Date | null
  puzzlesPlayedToday?: number
}

interface LayoutProps {
	children: React.ReactNode;
	nextPlayTime?: Date | null;
}

export default function Layout({ children, nextPlayTime = null }: LayoutProps) {
	return (
		<div className="min-h-screen bg-slate-50 relative overflow-hidden">
			{/* Subtle background pattern */}
			<div className="absolute inset-0 opacity-20">
				<div
					className="absolute inset-0"
					style={{
						backgroundImage: `radial-gradient(circle at 2px 2px, rgba(147, 51, 234, 0.15) 1px, transparent 0)`,
						backgroundSize: "20px 20px",
					}}
				/>
			</div>

			{/* Header */}
			<Header nextPlayTime={nextPlayTime} />

			{/* Main content */}
			<main className="relative z-10 pb-2 sm:pb-4">{children}</main>

			{/* Compact footer */}
			<footer className="relative z-10 text-center py-3 sm:py-4 text-xs sm:text-sm text-gray-500 bg-white backdrop-blur-sm border-t border-white/30">
				<div className="animate-in fade-in-up duration-1000" style={{ animationDelay: "1.5s" }}>
					Made with ♥ by Byron
				</div>
			</footer>
		</div>
	);
}

