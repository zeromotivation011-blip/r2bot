// STANDALONE app only: /kids/world/<zone>/<level> became /kids/spark-trail/<zone>/<level>.
import { AppRedirect } from '@/components/kids/app/AppRedirectClient'
import { KIDS_ZONES } from '@/lib/kids-world-data'

export const dynamicParams = false

export function generateStaticParams(): { zoneId: string; levelId: string }[] {
  return KIDS_ZONES.flatMap((z) => z.levels.map((l) => ({ zoneId: z.id, levelId: l.id })))
}

export default async function WorldLevelMoved({ params }: { params: Promise<{ zoneId: string; levelId: string }> }) {
  const { zoneId, levelId } = await params
  return <AppRedirect to={`/kids/spark-trail/${zoneId}/${levelId}/`} label="the Spark Trail" />
}
