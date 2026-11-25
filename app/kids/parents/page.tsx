import type { Metadata } from 'next'
import ParentsClient from './ParentsClient'

export const runtime = 'nodejs'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'For Parents — R2BOT Kids',
  description:
    "What your child learns in R2BOT Kids — robots they build in 3D, coding missions, story episodes — how progress and privacy work, plus offline activities to do together.",
  alternates: { canonical: `${BASE}/kids/parents` },
}

export default function ParentsPage() {
  return <ParentsClient />
}
