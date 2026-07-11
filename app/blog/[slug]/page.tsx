import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { getAllPosts, getRelatedPosts } from '@/lib/blog'
import { getPostBySlugMerged } from '@/lib/blog-db'
import BlogPostClient from './BlogPostClient'

export const runtime = 'nodejs'
// Regenerate periodically so Content-Manager edits appear on the live post.
export const revalidate = 300

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlugMerged(slug)
  if (!post) return { title: 'Post not found | R2BOT' }
  const url = `${BASE}/blog/${post.slug}`
  return {
    title: `${post.title} | R2BOT Blog`,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'R2BOT',
      title: post.title,
      description: post.description,
      images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: post.title }],
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: ['/og-default.svg'],
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlugMerged(slug)
  if (!post) notFound()

  const related = getRelatedPosts(slug, post.tags, 3)
  const url = `${BASE}/blog/${post.slug}`

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: `${BASE}/og-default.svg`,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: post.author, url: BASE },
    publisher: {
      '@type': 'Organization',
      name: 'R2BOT',
      url: BASE,
      logo: { '@type': 'ImageObject', url: `${BASE}/icon.svg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: post.keywords.join(', '),
  }

  // Strip content from related posts so we don't send raw bodies to the client.
  const relatedLite = related.map(({ content: _c, ...rest }) => rest)

  return (
    <CopilotProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <Nav />
      <BlogPostClient post={post} related={relatedLite} url={url} />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
