import ChallengeWrapper from './ChallengeWrapper'

export const runtime = 'nodejs'

export const metadata = {
  title: 'Boss Challenge — Robot World',
  description: 'Complete the boss challenge to earn a new robot part.',
  // Client-rendered Robot World screens: /kids/spark-trail is the indexed entry.
  robots: { index: false, follow: true },
}

export default function ChallengePage() {
  return <ChallengeWrapper />
}
