// app/kids/classroom/[classId]/projector/page.tsx — the Class Power-Up on the
// classroom projector (roadmap #40): one big meter, milestones, "who helped
// this week" ticks, and the Class Mind Map. Teacher only, noindex.
import type { Metadata } from 'next'
import ProjectorClient from './ProjectorClient'

export const metadata: Metadata = {
  title: 'Projector — R2BOT Kids Classroom',
  robots: { index: false, follow: false },
}

export default async function ProjectorPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6">
      <ProjectorClient classId={classId} />
    </div>
  )
}
