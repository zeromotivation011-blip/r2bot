// app/kids/page.tsx — Robot World entry (server component)
import type { Metadata } from 'next'
import KidsEntryClient from './KidsEntryClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://r2bot-psi.vercel.app'

export const metadata: Metadata = {
  title: 'Robot World for Kids | R2BOT — Learn Robotics Ages 5–14',
  description:
    'Spark the robot takes kids on an adventure through 6 worlds of robotics. Ages 5–14. No experience needed. Free!',
  keywords: [
    'robotics for kids',
    'learn robotics ages 5-14',
    'kids robot game',
    'robotics learning India',
    'free robotics for children',
    'STEM for kids',
  ],
  alternates: { canonical: `${BASE}/kids` },
  openGraph: {
    type: 'website',
    url: `${BASE}/kids`,
    siteName: 'R2BOT',
    title: 'Robot World — Robotics adventures for kids 5–14',
    description: 'Meet Spark. Explore 6 worlds. Build your own robot. Free, fun and made in India.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'Robot World — R2BOT' }],
  },
}

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalApplication',
  name: 'Robot World — R2BOT for Kids',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any (browser)',
  description: '6-zone robotics adventure for kids ages 5–14. Spark the robot guides every lesson.',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  url: `${BASE}/kids`,
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Robot World free for kids?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — Robot World on R2BOT is completely free for all kids aged 5–14. No login required to start.',
      },
    },
    {
      '@type': 'Question',
      name: 'What age is Robot World for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Robot World has content for ages 5–14, divided into 6 zones that grow with your child — from spotting robots in everyday life to writing real Python code.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do kids need any robotics experience?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Zero. Spark's Garden starts from absolute scratch — what is a robot? — and every concept uses analogies kids already know (pressure cookers, ATMs, washing machines).",
      },
    },
    {
      '@type': 'Question',
      name: 'How long is each lesson?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Each lesson is 4 to 8 minutes — designed to fit healthy screen-time limits. Kids earn stars and unlock new zones as they go.',
      },
    },
  ],
}

export default function KidsEntryPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <KidsEntryClient />
    </>
  )
}
