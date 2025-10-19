import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export const metadata = {
  title: "AI Service Error | Rebuzzle",
  description: "AI service temporarily unavailable.",
}

export default function AIErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 md:p-12">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Message */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              AI Service Temporarily Unavailable
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              We're experiencing temporary issues with our AI service.
            </p>
            <p className="text-gray-500">
              This is usually resolved quickly. In the meantime, you can still play our pre-generated puzzles!
            </p>
          </div>

          {/* What Happened */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">What happened?</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>AI service may be temporarily down</li>
              <li>Network connection issues</li>
              <li>Service maintenance in progress</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="w-full sm:w-auto" onClick={() => window.location.reload()}>
              Try Again
            </Button>
            <Link href="/">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Back to Puzzles
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              If this problem persists, please contact support or try again in a few minutes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
