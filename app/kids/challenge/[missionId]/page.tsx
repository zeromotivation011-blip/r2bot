import type { Metadata } from 'next'
import ChallengeWrapper from './ChallengeWrapper'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

// Client-rendered Spark Trail boss screens: noindex (/kids/spark-trail is the
// indexed entry), with a self-referencing canonical so no tracking or
// duplicate URL variant is ever treated as its own page.
export async function generateMetadata({ params }: { params: Promise<{ missionId: string }> }): Promise<Metadata> {
  const { missionId } = await params
  const id = /^[a-z0-9-]{1,64}$/i.test(missionId) ? missionId.toLowerCase() : ''
  return {
    title: 'Boss Challenge — Spark Trail',
    description: 'Complete the boss challenge to earn a new robot part.',
    alternates: { canonical: id ? `${BASE}/kids/challenge/${id}` : `${BASE}/kids/spark-trail` },
    robots: { index: false, follow: true },
  }
}

export default function ChallengePage() {
  return <ChallengeWrapper />
}
