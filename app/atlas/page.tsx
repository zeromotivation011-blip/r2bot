// app/atlas/page.tsx — Atlas v2: 3-mode knowledge universe
import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { getAllAtlasEntriesMerged } from '@/lib/atlas-db'
import { ATLAS_BUCKETS, resolveBucket } from '@/lib/atlas-buckets'
import AtlasHomeClient, { type AtlasNode } from './AtlasHomeClient'
import { jsonldScript } from '@/lib/seo/jsonld'

export const runtime = 'nodejs'
export const revalidate = 3600

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Robotics Atlas — Every Concept Explained Simply',
  description:
    "500+ robotics concepts explained in plain English. From servo motors to neural networks — the clearest robotics knowledge base on the internet.",
  alternates: { canonical: `${BASE}/atlas` },
  openGraph: {
    type: 'website',
    url: `${BASE}/atlas`,
    siteName: 'R2BOT',
    title: 'Atlas — Robotics Knowledge Universe',
    description: 'Explore. Learn. Search. The world\'s most accessible robotics encyclopedia.',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
}

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalApplication',
  name: 'R2BOT Atlas',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any (browser)',
  description: 'Interactive robotics knowledge universe with 500+ concepts, learning paths and a force-directed concept map.',
  url: `${BASE}/atlas`,
  isAccessibleForFree: true,
}

const datasetJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'World Robot Density by Country 2023',
  alternateName: 'IFR World Robotics Density Map v2',
  description:
    'Industrial robot density per 10,000 manufacturing workers for 50 countries, plus year-on-year growth, total installs, investment estimates, and GDP context. Includes India city-level robotics hubs and global milestones from 1961 onward.',
  url: `${BASE}/atlas`,
  keywords: ['robot density', 'world robotics map', 'automation by country', 'IFR 2023', 'industrial robots', 'India robotics'],
  isAccessibleForFree: true,
  license: 'https://creativecommons.org/licenses/by/4.0/',
  inLanguage: 'en',
  spatialCoverage: 'World',
  temporalCoverage: '2016/2023',
  creator: { '@type': 'Organization', name: 'R2BOT', url: BASE },
  sourceOrganization: [
    { '@type': 'Organization', name: 'International Federation of Robotics (IFR)', url: 'https://ifr.org/' },
  ],
  citation: 'International Federation of Robotics (IFR), World Robotics 2024 Report — https://ifr.org/worldrobotics/',
  variableMeasured: [
    'Robot density (robots per 10,000 manufacturing workers)',
    'Year-on-year density growth rate (%)',
    'Total industrial robot installations',
    'Robotics investment (USD billion)',
    'GDP per capita context',
    'India city-level robotics hubs',
    'Global robotics milestones (1961–present)',
  ],
  distribution: [
    { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${BASE}/api/robotics-data?format=csv` },
    { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${BASE}/api/robotics-data` },
  ],
}

export default async function AtlasIndex() {
  const all = await getAllAtlasEntriesMerged()

  // Only what the hub renders before anyone clicks: identity, bucket,
  // difficulty, the prerequisite graph (Galaxy view) and the few one-liners
  // that exist. The full enrichment (plain explanation, analogy, quiz…) was
  // inlined for all 500+ entries — a ~780 KB script on an 880 KB page — and
  // now loads per entry from /api/atlas/entry when a drawer opens; search and
  // summaries come from /api/atlas/index on first interaction.
  const nodes: AtlasNode[] = all.map(e => {
    const b = resolveBucket(e)
    const bucket = ATLAS_BUCKETS.find(x => x.slug === b) || ATLAS_BUCKETS[0]
    const node: AtlasNode = {
      slug: e.slug,
      type: e.type,
      title: e.title,
      bucket: bucket.slug,
      difficultyLevel: e.difficultyLevel ?? 3,
    }
    if (e.oneLiner) node.oneLiner = e.oneLiner
    if (e.prerequisiteTerms && e.prerequisiteTerms.length > 0) node.prerequisiteTerms = e.prerequisiteTerms
    return node
  })

  // Today's pick is chosen by day-index on the client (lib/atlas-progress);
  // pre-compute the same pick here so its one-line summary ships without the
  // whole index. The client falls back to the index if its cached pick differs.
  const todIdx = Math.floor(Date.now() / 86_400_000) % Math.max(1, all.length)
  const tod = all[todIdx]
  const termOfDayHint = tod ? { slug: tod.slug, hint: tod.oneLiner || (tod.summary || '').slice(0, 100) } : null

  const buckets = ATLAS_BUCKETS.map(b => ({
    slug: b.slug,
    label: b.label,
    emoji: b.emoji,
    description: b.description,
    count: nodes.filter(n => n.bucket === b.slug).length,
  }))

  return (
    <CopilotProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(datasetJsonLd) }} />
      <Nav />
      <AtlasHomeClient nodes={nodes} buckets={buckets} termOfDayHint={termOfDayHint} />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
