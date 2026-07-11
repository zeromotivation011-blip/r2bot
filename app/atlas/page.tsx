// app/atlas/page.tsx — Atlas v2: 3-mode knowledge universe
import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { getAllAtlasEntries } from '@/lib/atlas'
import { ATLAS_BUCKETS, resolveBucket } from '@/lib/atlas-buckets'
import AtlasHomeClient, { type AtlasNode } from './AtlasHomeClient'

export const runtime = 'nodejs'
export const revalidate = 3600

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Robotics Atlas — Every Concept Explained Simply | R2BOT',
  description:
    "249+ robotics concepts explained in plain English. From servo motors to neural networks — the world's most accessible robotics knowledge base.",
  alternates: { canonical: `${BASE}/atlas` },
  openGraph: {
    type: 'website',
    url: `${BASE}/atlas`,
    siteName: 'R2BOT',
    title: 'Atlas — Robotics Knowledge Universe',
    description: 'Explore. Learn. Search. The world\'s most accessible robotics encyclopedia.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
  },
}

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalApplication',
  name: 'R2BOT Atlas',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any (browser)',
  description: 'Interactive robotics knowledge universe with 249+ concepts, learning paths and a force-directed concept map.',
  url: `${BASE}/atlas`,
  isAccessibleForFree: true,
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is a sensor in robotics?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'A sensor is a robot\'s sense organ — it converts a physical signal (light, sound, distance) into an electrical signal a robot brain can read. Cameras, ultrasonics and LIDAR are common sensor types.' } },
    { '@type': 'Question', name: 'What is an actuator?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'An actuator is what makes a robot move. Motors, servos and pistons are all actuators — they convert electricity (or fluid pressure) into mechanical motion.' } },
    { '@type': 'Question', name: 'What does SLAM mean in robotics?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'SLAM stands for Simultaneous Localization and Mapping. It is how a robot builds a map of its environment while figuring out where it is on that map at the same time — essential for self-driving cars and household robots.' } },
    { '@type': 'Question', name: 'What is PID control?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'PID — Proportional, Integral, Derivative — is a feedback control algorithm. It tells a motor exactly how much to push toward a target, smoothly, without overshooting. It is in almost every drone, balancing robot and temperature controller.' } },
    { '@type': 'Question', name: 'Why is Python so popular in robotics?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'Python reads almost like English, has massive libraries for computer vision and AI, and is the default scripting layer of ROS (Robot Operating System) — the framework most modern robots run on.' } },
    { '@type': 'Question', name: 'Which country has the most robots per worker?',
      acceptedAnswer: { '@type': 'Answer',
        text: 'South Korea leads with 1,012 robots per 10,000 workers (IFR 2023), followed by Singapore (770), China (470), Germany (429) and Japan (419). Explore the full World Map tab inside the Atlas for all 50 countries.' } },
    { '@type': 'Question', name: "What is India's robot density?",
      acceptedAnswer: { '@type': 'Answer',
        text: 'India has 4 robots per 10,000 workers as of IFR 2023 — but is growing at +59% per year, the fastest rate among major economies.' } },
  ],
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

export default function AtlasIndex() {
  const all = getAllAtlasEntries()

  const nodes: AtlasNode[] = all.map(e => {
    const b = resolveBucket(e)
    const bucket = ATLAS_BUCKETS.find(x => x.slug === b) || ATLAS_BUCKETS[0]
    return {
      slug: e.slug,
      type: e.type,
      title: e.title,
      bucket: bucket.slug,
      bucketLabel: bucket.label,
      bucketEmoji: bucket.emoji,
      summary: e.summary || '',
      oneLiner: e.oneLiner || '',
      difficultyLevel: e.difficultyLevel ?? 3,
      difficultyLabel: e.difficultyLabel ?? 'Classroom',
      laymanExplanation: e.laymanExplanation || '',
      analogy: e.analogy || '',
      indianExample: e.indianExample || '',
      realRobotsThatUseThis: e.realRobotsThatUseThis ?? [],
      relatedTerms: [...(e.relatedTerms ?? []), ...(e.seeAlso ?? [])],
      prerequisiteTerms: e.prerequisiteTerms ?? [],
      unlocksTerms: e.unlocksTerms ?? [],
      mindBlowingFact: e.mindBlowingFact || '',
      youtubeId: e.youtubeId || '',
      industryApplications: e.industryApplications ?? [],
      whyItMatters: e.whyItMatters || '',
      technicalDefinition: e.technicalDefinition || e.summary || '',
      quizQuestion: e.quizQuestion,
    }
  })

  const buckets = ATLAS_BUCKETS.map(b => ({
    slug: b.slug,
    label: b.label,
    emoji: b.emoji,
    description: b.description,
    count: nodes.filter(n => n.bucket === b.slug).length,
  }))

  return (
    <CopilotProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />
      <Nav />
      <AtlasHomeClient nodes={nodes} buckets={buckets} />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
