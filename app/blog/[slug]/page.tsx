import { Metadata } from 'next'
import Layout from '@/components/Layout'
import { fetchBlogPost } from '../../actions/blogActions'
import { notFound } from 'next/navigation'
import BlogPostContent from '@/components/BlogPostContent'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await fetchBlogPost(params.slug)
  if (!post) return {}

  return {
    title: `${post.title} - Rebuzzle Blog`,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} - Rebuzzle Blog`,
      description: post.excerpt,
      url: `https://rebuzzle.com/blog/${post.slug}`,
      siteName: 'Rebuzzle',
      images: [
        {
          url: `https://rebuzzle.com/blog-posts/${post.slug}-og-image.jpg`,
          width: 1200,
          height: 630,
        },
      ],
      locale: 'en_US',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} - Rebuzzle Blog`,
      description: post.excerpt,
      images: [`https://rebuzzle.com/blog-posts/${post.slug}-twitter-image.jpg`],
    },
    alternates: {
      canonical: `https://rebuzzle.com/blog/${post.slug}`,
    },
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await fetchBlogPost(params.slug)

  if (!post) {
    notFound()
  }

  return (
    <Layout>
      <BlogPostContent post={post} />
    </Layout>
  )
}

