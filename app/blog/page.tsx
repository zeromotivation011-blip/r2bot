import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { getAllPosts, getAllTags } from '@/lib/blog'
import BlogIndexClient from './BlogIndexClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://r2bot-psi.vercel.app'

export const metadata: Metadata = {
  title: 'R2BOT Blog | Robotics for Students India | Learn Robotics 2025',
  description:
    "Expert guides on robotics for Indian students — Arduino projects, career advice, school curriculum, and India's robotics future. Free resources in English & Hindi.",
  keywords: [
    'robotics blog india',
    'robotics for students india',
    'arduino projects india',
    'robotics career india',
    'how to learn robotics india',
    'cbse robotics',
    'NEP 2020 robotics',
  ],
  alternates: { canonical: `${BASE}/blog` },
  openGraph: {
    type: 'website',
    url: `${BASE}/blog`,
    siteName: 'R2BOT',
    title: 'R2BOT Blog — Robotics for Indian Students',
    description: "Guides, tutorials, and insights for India's next generation of robotics engineers.",
    images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()
  const tags = getAllTags()

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'R2BOT Blog',
    description: 'Robotics education content for Indian students.',
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
