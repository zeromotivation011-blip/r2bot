// app/schools/page.tsx — server component wrapper
import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { SchoolsClient } from './SchoolsClient'

export const runtime = 'nodejs'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r2bot.in'

export const metadata: Metadata = {
  title: 'R2BOT for Schools — Robotics in Every Classroom | CBSE & NEP 2020',
  description:
    "India's only school robotics platform with hands-on browser simulation. CBSE/NEP aligned curriculum, teacher dashboard, auto-graded missions, certificates. No lab or kit needed.",
  keywords: ['R2BOT for schools', 'robotics curriculum CBSE', 'robotics for schools India', 'STEM curriculum India', 'school robotics simulator', 'teacher dashboard robotics', 'NEP 2020 robotics'],
  alternates: { canonical: `${BASE_URL}/schools` },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/schools`,
    siteName: 'R2BOT',
    title: 'R2BOT for Schools — Robotics in Every Classroom',
    description: 'No lab. No kits. No setup. Just open a browser and start building.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'R2BOT for Schools' }],
  },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'R2BOT for Schools',
  url: `${BASE_URL}/schools`,
  description: "India's only school robotics platform with browser-based simulator and CBSE/NEP aligned curriculum.",
  areaServed: { '@type': 'Country', name: 'India' },
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
