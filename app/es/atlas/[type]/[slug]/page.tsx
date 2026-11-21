import type { Metadata } from 'next'
import {
  AtlasTranslatedEntry,
  translatedMetadata,
  translatedStaticParams,
} from '@/components/atlas/AtlasTranslatedEntry'

// Only reviewed translations exist (lib/atlas-i18n.ts); every other slug 404s.
export const dynamicParams = false

type Params = { type: string; slug: string }

export function generateStaticParams(): Params[] {
  return translatedStaticParams('es')
}

export function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  return translatedMetadata('es', params)
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { type, slug } = await params
  return <AtlasTranslatedEntry lang="es" type={type} slug={slug} />
}
