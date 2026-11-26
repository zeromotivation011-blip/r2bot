import LevelWrapper from './LevelWrapper'

export const runtime = 'nodejs'

export const metadata = {
  title: 'Lesson — Spark Trail',
  description: 'A robotics lesson designed for kids.',
  // Client-rendered game screens: playable, not reference pages. /kids/spark-trail is the indexed entry.
  robots: { index: false, follow: true },
}

export default function LevelPage() {
  return <LevelWrapper />
}
