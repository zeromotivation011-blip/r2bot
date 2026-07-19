import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import DailyLifeClient from './DailyLifeClient'

export const runtime = 'nodejs'
export const revalidate = 3600

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Your Robot Day | Robots Already Running Your Life',
  description:
    'Walk through a single ordinary day. 47 robots help you — and you only notice 5. The end of the page asks: will you build them, or just use them?',
  alternates: { canonical: `${BASE}/daily-life` },
  openGraph: {
    type: 'article',
    url: `${BASE}/daily-life`,
    siteName: 'R2BOT',
    title: 'Your Robot Day',
    description: '47 robots, one day, one ordinary person. Most are invisible.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
  },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Your Robot Day — Robots Already Running Your Daily Life',
  description: 'A narrative walk through one ordinary day with 47 robots — most invisible.',
  url: `${BASE}/daily-life`,
  publisher: { '@type': 'Organization', name: 'R2BOT', logo: { '@type': 'ImageObject', url: `${BASE}/icon.svg` } },
  datePublished: '2025-01-01',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'How many robots do we use in a day?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'A typical Indian urban professional interacts with about 47 robots in a single day — from pressure cookers and ATMs to UPI fraud-detection AI and warehouse AMRs. Most are invisible.' } },
    { '@type': 'Question', name: 'What is the most-used robot in Indian homes?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'The washing machine, followed by the pressure cooker and mixer grinder. India has ~700 million washing machines installed.' } },
  ],
}

export default function DailyLifePage() {
  return (
    <CopilotProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Nav />
      <DailyLifeClient />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
