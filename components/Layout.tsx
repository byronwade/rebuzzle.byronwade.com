import React from 'react'
import Header from './Header'

interface LayoutProps {
  children: React.ReactNode
  nextPlayTime?: Date | null
  puzzlesPlayedToday?: number
}

export default function Layout({ children, nextPlayTime, puzzlesPlayedToday }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      <div className="flex-grow flex flex-col items-center px-4 sm:px-6 md:px-8 lg:px-12">
        <Header nextPlayTime={nextPlayTime} puzzlesPlayedToday={puzzlesPlayedToday} />
        <main className="w-full max-w-2xl mx-auto mt-8">
          {children}
        </main>
      </div>
      <footer className="mt-8 text-center text-sm text-gray-600 py-4">
        <p>&copy; {new Date().getFullYear()} Rebuzzle. All rights reserved.</p>
      </footer>
    </div>
  )
}

