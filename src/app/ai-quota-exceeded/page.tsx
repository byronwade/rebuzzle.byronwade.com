import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export const metadata = {
  title: "AI Quota Exceeded | Rebuzzle",
  description: "AI quota limit reached. Please try again later.",
}

export default function AIQuotaExceededPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 md:p-12">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Message */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              AI Quota Limit Reached
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              We've hit our daily limit for AI puzzle generation.
            </p>
            <p className="text-gray-500">
              Don't worry! We have thousands of pre-generated puzzles ready for you.
              The AI quota resets daily at midnight PST.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Why did this happen?</h3>
            <p className="text-sm text-blue-800">
              We use Google's free tier AI service (Gemini) which has a limit of 1,500 requests per day.
              This helps us keep Rebuzzle free for everyone! The quota automatically resets at midnight.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/">
              <Button size="lg" className="w-full sm:w-auto">
                Play Today's Puzzle
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Read Puzzle Tips
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              <strong>Current Status:</strong> Using cached puzzles
            </p>
            <p className="text-sm text-gray-500 mt-1">
              <strong>Quota Resets:</strong> Daily at midnight PST
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
