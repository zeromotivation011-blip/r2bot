import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { READING_PATHS, getReadingPath } from '@/lib/atlas-reading-paths'
import { getAllAtlasEntries } from '@/lib/atlas'
import { ReadingPathClient } from './ReadingPathClient'

interface PageProps {
  params: Promise<{ pathId: string }>
}

export function generateStaticParams() {
  return READING_PATHS.map(p => ({ pathId: p.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pathId } = await params
  const path = getReadingPath(pathId)
  if (!path) return { title: 'Path not found · R2BOT Atlas' }
  return {
    title: `${path.title} · R2BOT Reading Path`,
    description: path.description,
  }
}

export default async function PathPage({ params }: PageProps) {
  const { pathId } = await params
  const path = getReadingPath(pathId)
  if (!path) notFound()

  const all = getAllAtlasEntries()
  const concepts = path.concepts.map(slug => {
    const e = all.find(x => x.slug === slug)
    if (!e) return { slug, type: 'concept', title: slug, summary: '', hookLine: '', oneLiner: '', missing: true }
    return {
      slug: e.slug,
      type: e.type,
      title: e.title,
      summary: e.summary,
      hookLine: e.hookLine,
      oneLiner: e.oneLiner,
      tagline: e.tagline,
      difficultyLevel: e.difficultyLevel,
      missing: false,
    }
  })

  return (
    <CopilotProvider>
      <Nav />
      <ReadingPathClient path={path} concepts={concepts} />
    </CopilotProvider>
  )
}
