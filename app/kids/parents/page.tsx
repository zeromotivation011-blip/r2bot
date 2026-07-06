import type { Metadata } from 'next'
import ParentsClient from './ParentsClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r2bot.in'

export const metadata: Metadata = {
  title: 'For Parents — Robot World | R2BOT',
  description:
    "Learn what your child is building in Robot World — computational thinking, logical sequencing, pattern recognition — plus offline activities to do together.",
  alternates: { canonical: `${BASE}/kids/parents` },
}

export default function ParentsPage() {
  return <ParentsClient />
}
