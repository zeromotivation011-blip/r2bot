// STANDALONE app only: the website's page plus generateStaticParams, so every
// Spark Trail zone is a static file (a static export has no on-demand pages).
import ZoneWrapper from '@/app/kids/spark-trail/[zoneId]/ZoneWrapper'
import { KIDS_ZONES } from '@/lib/kids-world-data'

export const dynamicParams = false

export function generateStaticParams(): { zoneId: string }[] {
  return KIDS_ZONES.map((z) => ({ zoneId: z.id }))
}

export const metadata = {
  title: 'Zone — Spark Trail',
  description: 'A robotics zone with levels and a boss challenge.',
  robots: { index: false, follow: true },
}

export default function ZonePage() {
  return <ZoneWrapper />
}
