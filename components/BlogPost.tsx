'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

interface BlogPostProps {
  post: {
    slug: string
    date: string
    title: string
    puzzle: string
    answer: string
    explanation: string
    excerpt: string
  }
}

export default function BlogPost({ post }: BlogPostProps) {
  const [isRevealed, setIsRevealed] = useState(false)

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="pt-6">
        <h2 className="text-3xl font-bold mb-1 text-gray-800">{post.title}</h2>
        <p className="text-sm text-gray-600 mb-4">{post.date}</p>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">Today's Puzzle:</h3>
          <p className="text-3xl font-bold text-purple-600">{post.puzzle}</p>
        </div>
        {!isRevealed ? (
          <Button onClick={() => setIsRevealed(true)} variant="outline" className="text-purple-600 border-purple-600 hover:bg-purple-50">
            Reveal Answer and Explanation
          </Button>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Answer:</h3>
              <p className="text-2xl font-bold text-green-600">{post.answer}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Explanation:</h3>
              <p className="text-gray-600">{post.explanation}</p>
            </div>
          </div>
        )}
        <div className="mt-6">
          <p className="text-gray-600 mb-4">{post.excerpt}</p>
          <Link href={`/blog/${post.slug}`}>
            <Button variant="outline" className="text-purple-600 border-purple-600 hover:bg-purple-50">Read Full Article</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

