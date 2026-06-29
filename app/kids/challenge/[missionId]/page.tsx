import ChallengeWrapper from './ChallengeWrapper'

export const runtime = 'nodejs'

export const metadata = {
  title: 'Boss Challenge — Robot World',
  description: 'Complete the boss challenge to earn a new robot part.',
}

export default function ChallengePage() {
  return <ChallengeWrapper />
}
