// app/kids/stories/episodes/[sessionId]/page.tsx — Episodes Theatre (roadmap #8):
// one indexable page per voiced 3D course episode. Everything lives in
// components/kids/episodes/EpisodeTheatreView.tsx; this file only wires the route.

import type { Metadata } from 'next'
import { EpisodeTheatreView, theatreMetadata, theatreStaticParams } from '@/components/kids/episodes/EpisodeTheatreView'

export const dynamicParams = false

export function generateStaticParams(): { sessionId: string }[] {
  return theatreStaticParams()
}

interface Props {
  params: Promise<{ sessionId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sessionId } = await params
  return theatreMetadata(sessionId)
}

export default async function EpisodeTheatrePage({ params }: Props) {
  const { sessionId } = await params
  return <EpisodeTheatreView sessionId={sessionId} />
}
