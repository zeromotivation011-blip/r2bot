// app/schools/page.tsx — server component wrapper
import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { SchoolsClient } from './SchoolsClient'

export const runtime = 'nodejs'

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'R2BOT for Schools — Free Robotics Curriculum for Any Classroom',
  description:
    "A free robotics platform for classrooms anywhere: hands-on browser simulation, teacher dashboard, auto-graded missions and certificates. No lab or kit needed. Includes CBSE/NEP alignment for schools in India.",
  keywords: ['R2BOT for schools', 'free robotics curriculum for schools', 'robotics for schools', 'STEM curriculum', 'robotics curriculum CBSE', 'school robotics simulator', 'teacher dashboard robotics', 'NEP 2020 robotics'],
  alternates: { canonical: `${BASE_URL}/schools` },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/schools`,
    siteName: 'R2BOT',
    title: 'R2BOT for Schools — Robotics in Every Classroom',
    description: 'No lab. No kits. No setup. Just open a browser and start building.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT for Schools' }],
  },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'R2BOT for Schools',
  url: `${BASE_URL}/schools`,
  description: 'A free school robotics platform with a browser-based simulator, teacher dashboard and curriculum alignment tables.',
  areaServed: { '@type': 'Place', name: 'Worldwide' },
}

export default function SchoolsPage() {
  return (
    <CopilotProvider>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <Nav />
      <CopilotBubble />
      <CopilotDrawer />
      <SchoolsClient />
    </CopilotProvider>
  )
}
