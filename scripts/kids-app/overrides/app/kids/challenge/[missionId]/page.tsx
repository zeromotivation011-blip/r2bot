// STANDALONE app only: the website's page plus generateStaticParams (every boss challenge a static file).
import ChallengeWrapper from '@/app/kids/challenge/[missionId]/ChallengeWrapper'
import { KIDS_ZONES } from '@/lib/kids-world-data'

export const dynamicParams = false

export function generateStaticParams(): { missionId: string }[] {
  return KIDS_ZONES.map((z) => ({ missionId: z.bossChallenge.id }))
}

export const metadata = {
  title: 'Boss Challenge — Spark Trail',
  description: 'Complete the boss challenge to earn a new robot part.',
  robots: { index: false, follow: true },
}

export default function ChallengePage() {
  return <ChallengeWrapper />
}
