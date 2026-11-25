import LevelWrapper from './LevelWrapper'

export const runtime = 'nodejs'

export const metadata = {
  title: 'Lesson — Robot World',
  description: 'A robotics lesson designed for kids.',
  // Client-rendered game screens: playable, not reference pages. /kids/world is the indexed entry.
  robots: { index: false, follow: true },
}

export default function LevelPage() {
  return <LevelWrapper />
}
