import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { getAllTags } from '@/lib/blog'
import { getAllPostsMerged } from '@/lib/blog-db'
import BlogIndexClient from './BlogIndexClient'

export const runtime = 'nodejs'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'R2BOT Blog | Learn Robotics — Guides, Tutorials & Career Advice',
  description:
    'Expert robotics guides for beginners and students worldwide — Arduino and ROS2 projects, career advice, and how-to tutorials. Clear, free, and hands-on.',
  keywords: [
    'robotics blog',
    'robotics for students',
    'learn robotics',
    'arduino projects',
    'ros2 tutorial',
    'robotics career',
    'how to learn robotics',
  ],
  alternates: { canonical: `${BASE}/blog` },
  openGraph: {
    type: 'website',
    url: `${BASE}/blog`,
    siteName: 'R2BOT',
    title: 'R2BOT Blog — Learn Robotics',
    description: 'Guides, tutorials, and insights for the next generation of robotics engineers.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
  },
}

export default async function BlogIndexPage() {
  const posts = await getAllPostsMerged()
  const tags = getAllTags()

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'R2BOT Blog',
    description: 'Robotics education content for learners worldwide.',
    url: `${BASE}/blog`,
    publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE },
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE}/blog/${p.slug}`,
      name: p.title,
    })),
  }

  // Strip raw content out — client doesn't need it for the index.
  const lite = posts.map(({ content: _content, ...rest }) => rest)

  return (
    <CopilotProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([blogJsonLd, itemListJsonLd]) }} />
      <Nav />
      <BlogIndexClient posts={lite} tags={tags} />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
