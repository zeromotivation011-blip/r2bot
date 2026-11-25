// app/kids/classroom/[classId]/page.tsx — one class: roster, insights, lesson plan (server shell).
import type { Metadata } from 'next'
import ClassDetailClient from './ClassDetailClient'

export const metadata: Metadata = {
  title: 'Class roster — R2BOT Kids Classroom',
  robots: { index: false, follow: false },
}

export default async function KidsClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8">
      <ClassDetailClient classId={classId} />
    </div>
  )
}
