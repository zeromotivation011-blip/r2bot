// app/build/[robotSlug]/page.tsx — Server wrapper per-robot
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import { listProjectSlugs, loadProject } from '@/lib/build/loader'
import { BuildClient } from './BuildClient'

export const runtime = 'nodejs'
export const dynamicParams = false

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export function generateStaticParams() {
  return listProjectSlugs().map((robotSlug) => ({ robotSlug }))
}

type RouteParams = { robotSlug: string }

export async function generateMetadata(
  { params }: { params: Promise<RouteParams> },
): Promise<Metadata> {
  const { robotSlug } = await params
  const project = loadProject(robotSlug)
  if (!project) return { title: 'Robot not found — R2BOT Build' }
  const { meta } = project
  return {
    title: `${meta.title} — Build it Step-by-Step`,
    description: meta.tagline,
    alternates: { canonical: `${BASE_URL}/build/${meta.slug}` },
    openGraph: {
      type: 'article',
      url: `${BASE_URL}/build/${meta.slug}`,
      siteName: 'R2BOT',
      title: meta.title,
      description: meta.tagline,
    },
  }
}

export default async function RobotBuildPage(
  { params }: { params: Promise<RouteParams> },
) {
  const { robotSlug } = await params
  const project = loadProject(robotSlug)
  if (!project) notFound()

  return (
    <CopilotProvider>
      <Nav />
      <CopilotBubble />
      <CopilotDrawer />
      <BuildClient meta={project.meta} tree={project.tree} />
    </CopilotProvider>
  )
}
