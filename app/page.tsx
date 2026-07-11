import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import HomeClient from './HomeClient'
import { getAllAtlasEntries } from '@/lib/atlas'
import { loadAllProjects } from '@/lib/build/loader'
import { getNewsData } from '@/lib/news'
import { getLiveLensVideos } from '@/lib/lens-live'

export const runtime = 'nodejs'
export const revalidate = 3600

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: "R2BOT — From Zero to Robotics Engineer | Learn, Build, Explore",
  description:
    'From zero to robotics engineer. Learn ROS2, build real robots, and explore 400+ concepts with an AI mentor. Free to start — the clearest robotics learning platform on the internet.',
  keywords: [
    'learn robotics',
    'ROS2 tutorial beginner',
    'robotics for students',
    'robotics learning platform',
    'robotics atlas',
    'robot projects',
    'how robots work',
    'robotics engineer career',
    'learn robotics online free',
    'robotics explained',
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'R2BOT',
    title: "R2BOT — The World's Clearest Robotics Learning Platform",
    description: '400+ concepts. Real simulators. AI mentor. Free to explore, affordable to master.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'R2BOT — the clearest way to learn robotics' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'R2BOT — From Zero to Robotics Engineer',
    description: "Learn ROS2, build real robots, explore 400+ concepts. AI mentor included. Free to start.",
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
  areaServed: 'Worldwide',
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
  ],
}

export default async function HomePage() {
  const atlasCount = getAllAtlasEntries().length
  const projectCount = loadAllProjects().length

  // Live homepage teasers — sourced from the automated News + Lens pipelines.
  // Both are cached; failures degrade to an empty array (teasers self-hide).
  const [news, videos] = await Promise.all([
    getNewsData()
      .then((d) =>
        d.articles.slice(0, 4).map((a) => ({
          title: a.title,
          url: a.url,
          source: a.source,
          topic: a.topic,
        })),
      )
      .catch(() => [] as { title: string; url: string; source: string; topic: string }[]),
    getLiveLensVideos()
      .then((v) =>
        v.slice(0, 3).map((x) => ({
          title: x.title,
          url: x.url,
          thumbnailUrl: x.thumbnailUrl,
          channel: x.channel,
        })),
      )
      .catch(() => [] as { title: string; url: string; thumbnailUrl: string; channel: string }[]),
  ])

  return (
    <CopilotProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([websiteJsonLd, organizationJsonLd, faqJsonLd]) }} />
      <Nav />
      <HomeClient atlasCount={atlasCount} projectCount={projectCount} news={news} videos={videos} />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
