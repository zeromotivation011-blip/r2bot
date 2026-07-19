import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import HistoryHomeClient from './HistoryHomeClient'
import { CHAPTERS, getAllMilestones } from '@/lib/history-chapters'

export const runtime = 'nodejs'
export const revalidate = 3600

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'The Story of Robots — Robotics History',
  description: 'From a 1920 Czech play to a robot walking on Mars. The full narrative of robotics — chapter by chapter, from the first automatons to today.',
  alternates: { canonical: `${BASE}/history` },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'The Story of Robots — A Narrative History of Robotics',
  description: 'The complete history of robotics told in 6 chapters, from the first automatons to modern autonomous machines.',
  url: `${BASE}/history`,
  author: { '@type': 'Organization', name: 'R2BOT' },
  publisher: { '@type': 'Organization', name: 'R2BOT', logo: { '@type': 'ImageObject', url: `${BASE}/icon.svg` } },
}

const eventsJsonLd = getAllMilestones().slice(0, 30).map(m => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: m.title,
  description: m.hookLine,
  startDate: `${m.year}-01-01`,
  url: `${BASE}/history#${m.year}-${m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
}))

export default function HistoryPage() {
  return (
    <CopilotProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsJsonLd) }} />
      <Nav />
      <HistoryHomeClient chapters={CHAPTERS} />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
