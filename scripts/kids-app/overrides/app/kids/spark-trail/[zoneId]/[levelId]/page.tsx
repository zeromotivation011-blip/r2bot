// STANDALONE app only: the website's page plus generateStaticParams (every level a static file).
import LevelWrapper from '@/app/kids/spark-trail/[zoneId]/[levelId]/LevelWrapper'
import { KIDS_ZONES } from '@/lib/kids-world-data'

export const dynamicParams = false

export function generateStaticParams(): { zoneId: string; levelId: string }[] {
  return KIDS_ZONES.flatMap((z) => z.levels.map((l) => ({ zoneId: z.id, levelId: l.id })))
}

export const metadata = {
  title: 'Lesson — Spark Trail',
  description: 'A robotics lesson designed for kids.',
  robots: { index: false, follow: true },
}

export default function LevelPage() {
  return <LevelWrapper />
}
