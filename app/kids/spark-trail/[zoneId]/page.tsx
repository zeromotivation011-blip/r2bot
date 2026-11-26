import ZoneWrapper from './ZoneWrapper'

export const runtime = 'nodejs'

export const metadata = {
  title: 'Zone — Spark Trail',
  description: 'A robotics zone with levels and a boss challenge.',
  // Client-rendered game screens: playable, not reference pages. /kids/spark-trail is the indexed entry.
  robots: { index: false, follow: true },
}

export default function ZonePage() {
  return <ZoneWrapper />
}
