'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackEvent, analyticsEvents } from '@/lib/analytics'

interface BlogPostContentProps {
  post: {
    slug: string
    date: string
    title: string
    puzzle: string
    answer: string
    explanation: string
    content: string
  }
}

export default function BlogPostContent({ post }: BlogPostContentProps) {
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    trackEvent(analyticsEvents.BLOG_POST_VIEW, { slug: post.slug, title: post.title })
  }, [post.slug, post.title])

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="pt-6">
        <h1 className="text-3xl font-bold mb-1 text-gray-800">{post.title}</h1>
        <p className="text-sm text-gray-600 mb-6">{post.date}</p>
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 text-gray-700">Today's Puzzle:</h3>
          <p className="text-3xl font-bold text-purple-600 mb-4">{post.puzzle}</p>
          {!isRevealed ? (
            <Button onClick={() => setIsRevealed(true)} variant="outline" className="text-purple-600 border-purple-600 hover:bg-purple-50">
              Reveal Answer and Explanation
            </Button>
          ) : (
            <>
              <h3 className="text-xl font-semibold mb-2 text-gray-700">Answer:</h3>
              <p className="text-2xl font-bold text-green-600 mb-4">{post.answer}</p>
              <h3 className="text-xl font-semibold mb-2 text-gray-700">Explanation:</h3>
              <p className="mb-4 text-gray-600">{post.explanation}</p>
            </>
          )}
        </div>
        <div className="prose prose-sm max-w-none text-gray-700">
          {post.content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4">{paragraph}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

