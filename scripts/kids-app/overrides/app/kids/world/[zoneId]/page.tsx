// STANDALONE app only: /kids/world/<zone> became /kids/spark-trail/<zone>.
import { AppRedirect } from '@/components/kids/app/AppRedirectClient'
import { KIDS_ZONES } from '@/lib/kids-world-data'

export const dynamicParams = false

export function generateStaticParams(): { zoneId: string }[] {
  return KIDS_ZONES.map((z) => ({ zoneId: z.id }))
}

export default async function WorldZoneMoved({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = await params
  return <AppRedirect to={`/kids/spark-trail/${zoneId}/`} label="the Spark Trail" />
}
