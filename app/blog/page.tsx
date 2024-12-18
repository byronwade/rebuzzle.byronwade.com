import { Metadata } from 'next'
import Layout from '@/components/Layout'
import BlogPost from '@/components/BlogPost'
import { fetchBlogPosts } from '../actions/blogActions'

export const metadata: Metadata = {
  title: 'Rebuzzle Blog - Daily Puzzle Insights',
  description: 'Explore the thought process behind our daily rebus puzzles and learn more about the Rebuzzle game.',
  keywords: ['rebus', 'puzzle', 'blog', 'insights', 'daily challenge'],
  openGraph: {
    title: 'Rebuzzle Blog - Daily Puzzle Insights',
    description: 'Explore the thought process behind our daily rebus puzzles and learn more about the Rebuzzle game.',
    url: 'https://rebuzzle.com/blog',
    siteName: 'Rebuzzle',
    images: [
      {
        url: 'https://rebuzzle.com/blog-og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rebuzzle Blog - Daily Puzzle Insights',
    description: 'Explore the thought process behind our daily rebus puzzles and learn more about the Rebuzzle game.',
    images: ['https://rebuzzle.com/blog-twitter-image.jpg'],
  },
  alternates: {
    canonical: 'https://rebuzzle.com/blog',
  },
}

export default async function BlogPage() {
  const blogPosts = await fetchBlogPosts()

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-8 text-center">Rebuzzle Blog</h1>
      <div className="space-y-8">
        {blogPosts.map((post) => (
          <BlogPost key={post.slug} post={post} />
        ))}
      </div>
    </Layout>
  )
}

