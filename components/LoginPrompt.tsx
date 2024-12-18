'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function LoginPrompt() {
  const pathname = usePathname()
  const returnUrl = encodeURIComponent(pathname)

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-gray-700 mb-2">Want to see your name on the leaderboard?</p>
      <div className="space-x-2">
        <Button asChild variant="default">
          <Link href={`/login?returnUrl=${returnUrl}`}>Log in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/signup?returnUrl=${returnUrl}`}>Sign up</Link>
        </Button>
      </div>
    </div>
  )
}

