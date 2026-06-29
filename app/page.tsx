import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import HomeClient from './HomeClient'
import { getAllAtlasEntries } from '@/lib/atlas'
import { loadAllProjects } from '@/lib/build/loader'

export const runtime = 'nodejs'
export const revalidate = 3600

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://r2bot-psi.vercel.app'

export const metadata: Metadata = {
  title: "R2BOT — From Zero to Robotics Engineer | Learn, Build, Explore",
  description:
    "From zero to robotics engineer. Learn ROS2, build real robots, and explore 1,000+ concepts with an AI mentor. Free to start — India's most complete robotics learning platform.",
  keywords: [
    'learn robotics India',
    'ROS2 tutorial beginner',
    'robotics for college students',
    'robotics learning platform',
    'robotics atlas',
    'robot projects',
    'ROS2 tutorial India',
    'robotics engineer career',
    'learn robotics online free',
    'robotics in Hindi',
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'R2BOT',
    title: "R2BOT — India's Robotics Learning Platform",
    description: '261 concepts. Real simulators. AI mentor. Free to explore, affordable to master.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: "R2BOT — India's robotics platform" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'R2BOT — From Zero to Robotics Engineer',
    description: "Learn ROS2, build real robots, explore 1,000+ concepts. AI mentor included. Free to start.",
    images: ['/og-default.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'R2BOT',
  url: SITE_URL,
  description: "From zero to robotics engineer — with an AI mentor, real simulators, and hands-on projects.",
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/atlas?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'R2BOT',
  url: SITE_URL,
  description: "From zero to robotics engineer — with an AI mentor, real simulators, and hands-on projects.",
  logo: `${SITE_URL}/icon.svg`,
  sameAs: [
    'https://twitter.com/r2bot',
    'https://www.linkedin.com/company/r2bot',
    'https://www.youtube.com/@r2bot',
  ],
  areaServed: { '@type': 'Country', name: 'India' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is R2BOT free to use?',
      acceptedAnswer: { '@type': 'Answer', text: 'R2BOT is free to explore — the full Atlas, the Spark beginner track, and 10 daily R2 Co-pilot messages cost nothing. Advanced tracks and unlimited AI mentoring are available on the Pro plan.' },
    },
    {
      '@type': 'Question',
      name: 'Who is R2BOT for?',
      acceptedAnswer: { '@type': 'Answer', text: 'College students and career switchers who want to break into robotics — and anyone curious enough to go from zero to ROS2 engineer.' },
    },
    {
      '@type': 'Question',
      name: 'Is R2BOT available in Hindi?',
      acceptedAnswer: { '@type': 'Answer', text: 'English is the primary language today. Hindi-language content is rolling out across Atlas and Academy. More Indian languages are planned.' },
    },
    {
      '@type': 'Question',
      name: 'Do I need any hardware to use R2BOT?',
      acceptedAnswer: { '@type': 'Answer', text: 'No. Every R2BOT feature — Atlas, simulators, Academy lessons, R2 Co-pilot — runs in your browser. You can build real robots later; the learning works without any hardware.' },
    },
    {
      '@type': 'Question',
      name: 'How does the school curriculum align with CBSE?',
      acceptedAnswer: { '@type': 'Answer', text: 'R2BOT for Schools maps every unit to CBSE/ICSE chapters from Class 6 to Class 12, with NEP 2020 alignment for skill-based learning.' },
    },
  ],
}

export default function HomePage() {
  const atlasCount = getAllAtlasEntries().length
  const projectCount = loadAllProjects().length
  return (
    <CopilotProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([websiteJsonLd, organizationJsonLd, faqJsonLd]) }} />
      <Nav />
      <HomeClient atlasCount={atlasCount} projectCount={projectCount} />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
