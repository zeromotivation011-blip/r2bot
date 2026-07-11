import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { ROBOTS } from '@/lib/robots-data'
import CompareClient from './CompareClient'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Robot vs Robot — Compare Famous Robots',
  description: 'Side-by-side compare any two famous robots. See specs, year, country, category and auto-generated insight.',
}

export default function ComparePage() {
  // Pass the minimal slug+name+meta the client needs (avoid sending entire descriptions)
  const lite = ROBOTS.map(r => ({
    slug: r.slug,
    name: r.name,
    maker: r.maker,
    country: r.country,
    countryFlag: r.countryFlag,
    year: r.year,
    type: r.type,
    status: r.status,
    emoji: r.emoji,
    hookLine: r.hookLine,
    statChips: r.statChips,
  }))
  return (
    <CopilotProvider>
      <Nav />
      <CompareClient robots={lite} />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
